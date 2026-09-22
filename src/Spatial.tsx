import { useEffect, useRef, useState } from "react";
import type { ModuleProps, Placement } from "./types";
import "./spatial.css";
const W = 900,
  H = 560;
const kinds = [
  ["camera", "Caméra", "#efc783"],
  ["subject", "Sujet", "#67d6b0"],
  ["light", "Lumière", "#f6db77"],
  ["mic", "Micro", "#a698ef"],
];
const symbols: Record<string, string> = { camera: "CAM", subject: "SUJET", light: "LUX", mic: "MIC" };
const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));
export const motionDuration = (value: number) =>
  Number.isFinite(value) ? Math.max(1, Math.min(120, value)) : 8;
function make(type: string, x = 300, y = 280): Placement {
  return {
    id: crypto.randomUUID(),
    type,
    label: kinds.find((k) => k[0] === type)?.[1] || type,
    x,
    y,
    endX: x,
    endY: y,
    angle: 0,
    color: kinds.find((k) => k[0] === type)?.[2] || "#efc783",
    operator: "",
    focal: "35 mm",
    duration: 8,
  };
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Spatial({ project, updateProject }: ModuleProps) {
  const [selected, setSelected] = useState(""),
    [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0),
    [recording, setRecording] = useState(false),
    [notice, setNotice] = useState("");
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<string | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    exportRaf = useRef(0),
    recordStream = useRef<MediaStream | null>(null);
  const placements = project.placements || [],
    active = placements.find((p) => p.id === selected),
    duration = Math.max(1, ...placements.map((p) => motionDuration(p.duration)));
  useEffect(() => {
    setSelected("");
    setPlaying(false);
    setTime(0);
    setRecording(false);
    setNotice("");
    return () => {
      cancelAnimationFrame(exportRaf.current);
      const rec = recorder.current;
      if (rec) {
        rec.onstop = null;
        rec.onerror = null;
        rec.ondataavailable = null;
        if (rec.state === "recording") rec.stop();
      }
      recordStream.current?.getTracks().forEach((track) => track.stop());
      recordStream.current = null;
      recorder.current = null;
    };
  }, [project.id]);
  useEffect(() => {
    setTime((t) => Math.min(t, duration));
    if (!placements.length) setPlaying(false);
  }, [duration, placements.length]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      previous = performance.now();
    const tick = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;
      setTime((t) => {
        if (t + delta >= duration) {
          setPlaying(false);
          return duration;
        }
        return t + delta;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration]);
  const save = (next: Placement[]) => updateProject({ ...project, placements: next });
  const patch = (id: string, values: Partial<Placement>) =>
    save(placements.map((p) => (p.id === id ? { ...p, ...values } : p)));
  const point = (p: Placement, t = time) => {
    const ratio = Math.min(1, t / motionDuration(p.duration));
    return { x: p.x + (p.endX - p.x) * ratio, y: p.y + (p.endY - p.y) * ratio };
  };
  const add = (type: string) => {
    const p = make(type, 200 + (placements.length % 6) * 80, 240);
    save([...placements, p]);
    setSelected(p.id);
    setTime(0);
  };
  const preset = (type: string) => {
    if (placements.length && !window.confirm("Remplacer le plan actuel par ce preset ?")) return;
    const subjects = [
      { ...make("subject", 420, 180), label: "Partenaire A" },
      { ...make("subject", 480, 180), label: "Partenaire B" },
    ];
    const cameras =
      type === "ceremony"
        ? [
            { ...make("camera", 200, 420), label: "Cam A · Plan large", endX: 250, endY: 350, angle: -45 },
            { ...make("camera", 700, 400), label: "Cam B · Émotions", endX: 620, endY: 300, angle: -135 },
            { ...make("camera", 450, 480), label: "Cam C · Sécurité", angle: -90 },
          ]
        : [
            { ...make("camera", 200, 280), label: "Cam A · Travelling", endX: 700, endY: 280 },
            { ...make("camera", 650, 440), label: "Cam B · Réactions", angle: -120 },
          ];
    save([
      ...subjects,
      ...cameras,
      { ...make("light", 120, 100), label: "Key light", angle: 25 },
      { ...make("mic", 500, 220), label: "Micro HF" },
    ]);
    setSelected("");
    setTime(0);
    setPlaying(false);
  };
  function paint(canvas: HTMLCanvasElement, t: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");
    ctx.fillStyle = "#172020";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#2b3837";
    ctx.lineWidth = 1;
    for (let x = 20; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 20; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#f2e7d3";
    ctx.fillText(`${project.name} · Plan multicam`, 24, 35);
    placements.forEach((p) => {
      const pos = point(p, t);
      ctx.strokeStyle = p.color;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.endX, p.endY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, 23, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(41, -7);
      ctx.lineTo(41, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.textAlign = "center";
      ctx.fillStyle = "#102021";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(symbols[p.type] || p.type, pos.x, pos.y + 4);
      ctx.fillStyle = "#f2e7d3";
      ctx.font = "13px sans-serif";
      ctx.fillText(p.label, pos.x, pos.y + 43);
    });
    ctx.textAlign = "left";
    ctx.fillStyle = "#f2e7d3";
    ctx.fillText(`${t.toFixed(1)} s / ${duration} s`, 24, H - 20);
  }
  const exportPng = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      paint(canvas, time);
      canvas.toBlob((blob) => {
        if (blob) download(blob, "visionnary-plan.png");
        else setNotice("Export PNG indisponible.");
      });
    } catch {
      setNotice("Impossible de créer le PNG.");
    }
  };
  const exportSvg = () => {
    if (!svg.current) return;
    const clone = svg.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    download(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }),
      "visionnary-plan.svg",
    );
  };
  const exportVideo = () => {
    if (!window.MediaRecorder) {
      setNotice("Ce navigateur ne permet pas l’export WebM. Utilisez SVG ou PNG.");
      return;
    }
    let stream: MediaStream | undefined;
    try {
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) =>
        MediaRecorder.isTypeSupported(m),
      );
      if (!mime) {
        setNotice("Export WebM non pris en charge par ce navigateur.");
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      paint(canvas, 0);
      stream = canvas.captureStream(30);
      recordStream.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recorder.current = rec;
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        cancelAnimationFrame(exportRaf.current);
        stream?.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (chunks.length) download(new Blob(chunks, { type: mime }), "visionnary-multicam.webm");
      };
      rec.onerror = () => {
        setNotice("Erreur pendant l’export vidéo.");
        setRecording(false);
        stream?.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(exportRaf.current);
      };
      rec.start();
      setRecording(true);
      setNotice("Enregistrement WebM en temps réel…");
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = (now - start) / 1000;
        paint(canvas, Math.min(duration, elapsed));
        if (elapsed >= duration) {
          rec.stop();
          setNotice("Animation WebM exportée.");
        } else exportRaf.current = requestAnimationFrame(tick);
      };
      exportRaf.current = requestAnimationFrame(tick);
    } catch {
      stream?.getTracks().forEach((t) => t.stop());
      setRecording(false);
      setNotice("Export vidéo indisponible dans ce navigateur.");
    }
  };
  return (
    <section className="spatial">
      <div className="spatial-top">
        <div>
          <span className="spatial-eyebrow">DIRECTION DE TOURNAGE</span>
          <h2>Chaque caméra à sa place.</h2>
          <p>Préparez les positions, les déplacements et les axes de votre équipe.</p>
        </div>
        <div className="spatial-actions">
          <button onClick={() => preset("ceremony")}>Preset cérémonie</button>
          <button onClick={() => preset("dance")}>Preset danse</button>
        </div>
      </div>
      <div className="spatial-toolbar">
        {kinds.map(([type, label]) => (
          <button key={type} onClick={() => add(type)}>
            ＋ {label}
          </button>
        ))}
        <span className="spatial-count">{placements.length} éléments · Vue du dessus</span>
      </div>
      <div className="spatial-layout">
        <div className="spatial-stage">
          <svg
            ref={svg}
            viewBox={`0 0 ${W} ${H}`}
            aria-label="Plan multicam interactif"
            onPointerMove={(e) => {
              if (!drag.current || playing) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const scale = Math.min(rect.width / W, rect.height / H);
              const x = clamp((e.clientX - rect.left - (rect.width - W * scale) / 2) / scale, W),
                y = clamp((e.clientY - rect.top - (rect.height - H * scale) / 2) / scale, H);
              patch(drag.current, { x: Math.round(x), y: Math.round(y) });
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            <defs>
              <pattern id="spatial-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#30413e" strokeWidth=".7" />
              </pattern>
            </defs>
            <rect width={W} height={H} fill="#172020" />
            <rect width={W} height={H} fill="url(#spatial-grid)" />
            <rect
              x="300"
              y="100"
              width="300"
              height="260"
              rx="80"
              fill="#c3ac7310"
              stroke="#b9a376"
              strokeDasharray="6 8"
            />
            <text x="450" y="82" textAnchor="middle" fill="#b9a376" fontSize="11" letterSpacing="3">
              ZONE D’ACTION
            </text>
            {placements.map((p) => {
              const pos = point(p);
              return (
                <g key={p.id}>
                  <line
                    x1={p.x}
                    y1={p.y}
                    x2={p.endX}
                    y2={p.endY}
                    stroke={p.color}
                    strokeDasharray="5 7"
                    opacity=".6"
                  />
                  <circle cx={p.endX} cy={p.endY} r="5" fill="none" stroke={p.color} />
                  <g
                    transform={`translate(${pos.x},${pos.y})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Sélectionner ${p.label}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(p.id);
                      }
                    }}
                    onPointerDown={(e) => {
                      setSelected(p.id);
                      if (!playing) {
                        setTime(0);
                        drag.current = p.id;
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }
                    }}
                    style={{ cursor: playing ? "default" : "grab" }}
                  >
                    <g transform={`rotate(${p.angle})`}>
                      {p.type === "camera" && (
                        <path d="M 20 0 L 135 -70 L 135 70 Z" fill={p.color} opacity=".08" />
                      )}
                      <path d="M 27 0 L 39 -6 L 39 6 Z" fill={p.color} />
                    </g>
                    <circle
                      r={selected === p.id ? 29 : 24}
                      fill="#172020"
                      stroke={p.color}
                      strokeWidth={selected === p.id ? 3 : 1}
                    />
                    <circle r="21" fill={p.color} />
                    <text textAnchor="middle" y="4" fontSize="10" fontWeight="700" fill="#13221f">
                      {symbols[p.type] || p.type}
                    </text>
                    <text textAnchor="middle" y="47" fill="#f4ead7" fontSize="12">
                      {p.label}
                    </text>
                  </g>
                </g>
              );
            })}
            {!placements.length && (
              <text x="450" y="410" fill="#e5dac2" textAnchor="middle" fontSize="16">
                Ajoutez vos caméras ou démarrez avec un preset.
              </text>
            )}
          </svg>
          <div className="spatial-playback">
            <button
              className="spatial-primary"
              onClick={() => {
                if (time >= duration) setTime(0);
                setPlaying(!playing);
              }}
            >
              {playing ? "Ⅱ Pause" : "▶ Lire"}
            </button>
            <button
              aria-label="Réinitialiser la lecture"
              onClick={() => {
                setPlaying(false);
                setTime(0);
              }}
            >
              ↺
            </button>
            <input
              aria-label="Position de lecture"
              type="range"
              min="0"
              max={duration}
              step=".05"
              value={time}
              onChange={(e) => {
                setPlaying(false);
                setTime(Number(e.target.value));
              }}
            />
            <span>
              {time.toFixed(1)} / {duration}s
            </span>
          </div>
        </div>
        <aside className="spatial-inspector">
          <span className="spatial-eyebrow">INSPECTEUR</span>
          <label>
            Élément
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Choisir un élément</option>
              {placements.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {active ? (
            <>
              <label>
                Nom
                <input value={active.label} onChange={(e) => patch(active.id, { label: e.target.value })} />
              </label>
              <div className="spatial-fields">
                {(
                  [
                    ["x", "Départ X", W],
                    ["y", "Départ Y", H],
                    ["endX", "Arrivée X", W],
                    ["endY", "Arrivée Y", H],
                    ["angle", "Orientation °", 360],
                    ["duration", "Durée (s)", 120],
                  ] as const
                ).map(([key, label, max]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      min={key === "angle" ? -360 : key === "duration" ? 1 : 0}
                      max={max}
                      value={active[key]}
                      onChange={(e) =>
                        patch(active.id, {
                          [key]: Math.max(
                            key === "angle" ? -360 : key === "duration" ? 1 : 0,
                            Math.min(max, Number(e.target.value)),
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <label>
                Focale
                <input value={active.focal} onChange={(e) => patch(active.id, { focal: e.target.value })} />
              </label>
              <label>
                Opérateur
                <input
                  placeholder="Nom du cadreur"
                  value={active.operator}
                  onChange={(e) => patch(active.id, { operator: e.target.value })}
                />
              </label>
              <button
                onClick={() => {
                  save(placements.filter((p) => p.id !== active.id));
                  setSelected("");
                }}
              >
                Supprimer cet élément
              </button>
            </>
          ) : (
            <p>
              Sélectionnez un élément sur le plan pour régler son mouvement. Les coordonnées permettent aussi
              de le déplacer au clavier.
            </p>
          )}
        </aside>
      </div>
      <div className="spatial-export">
        <div>
          <strong>Partagez votre plan.</strong>
          <p>Image fixe ou simulation animée pour le briefing équipe.</p>
        </div>
        <button onClick={exportSvg}>↓ SVG</button>
        <button onClick={exportPng}>↓ PNG</button>
        <button disabled={recording} onClick={exportVideo}>
          {recording ? "Export en cours…" : "↓ Animation WebM"}
        </button>
      </div>
      <p role="status">{notice}</p>
    </section>
  );
}
