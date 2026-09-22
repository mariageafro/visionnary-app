import { useRef, useState } from "react";
import { Flag, Pause, Play, Plus, Repeat, RotateCcw, X } from "lucide-react";
import type { SceneElement, ScenePlan, TimelineCue } from "./types";
import { movementById } from "./catalog";

export const timecode = (t: number) => {
  const s = Math.max(0, t);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};
const colorOf = (el: SceneElement) => (el.kind === "drone" ? "#5fd0e6" : el.kind === "person" ? "#e79bb3" : el.kind === "light" ? "#f6db77" : "#e6c27f");

/**
 * Timeline de la scène : une piste par élément animé, clips à glisser (début) et à étirer (durée),
 * repères texte, lecture en boucle et vitesse réglable.
 */
export default function TimelinePanel({
  plan,
  time,
  playing,
  loop,
  speed,
  selection,
  editable,
  onTime,
  onToggle,
  onReset,
  onLoop,
  onSpeed,
  onSelect,
  onClip,
  onCues,
}: {
  plan: ScenePlan;
  time: number;
  playing: boolean;
  loop: boolean;
  speed: number;
  selection: string[];
  editable: boolean;
  onTime: (t: number) => void;
  onToggle: () => void;
  onReset: () => void;
  onLoop: () => void;
  onSpeed: (s: number) => void;
  onSelect: (id: string) => void;
  onClip: (id: string, start: number, duration: number, commit: boolean) => void;
  onCues: (cues: TimelineCue[]) => void;
}) {
  const lane = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; mode: "move" | "end"; x: number; lastX: number; start: number; duration: number } | null>(null);
  // Ordre des pistes figé pendant un glisser : une piste qui changerait de place perdrait le pointeur.
  const order = useRef<string[] | null>(null);
  const [cueText, setCueText] = useState<string | null>(null);
  const total = Math.max(plan.duration, 1);
  const frozen = order.current;
  const animated = plan.elements
    .filter((el) => el.motion && el.motion.type !== "static")
    .sort(frozen ? (a, b) => frozen.indexOf(a.id) - frozen.indexOf(b.id) : (a, b) => a.motion!.start - b.motion!.start);
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const finish = (el: SceneElement, clientX: number) => {
    const d = drag.current;
    drag.current = null;
    order.current = null;
    if (!d || d.id !== el.id) return;
    // Simple toucher : rien ne change, le brouillon est effacé.
    if (Math.abs(clientX - d.x) < 2) return onClip(el.id, d.start, d.duration, true);
    const dt = ((clientX - d.x) / width()) * total;
    if (d.mode === "move") onClip(el.id, Math.max(0, round1(d.start + dt)), d.duration, true);
    else onClip(el.id, d.start, Math.max(0.2, round1(d.duration + dt)), true);
  };
  const pct = (t: number) => `${(Math.min(total, Math.max(0, t)) / total) * 100}%`;
  const width = () => lane.current?.getBoundingClientRect().width ?? 1;
  const at = (clientX: number) => {
    const r = lane.current!.getBoundingClientRect();
    return Math.min(total, Math.max(0, ((clientX - r.left) / r.width) * total));
  };
  const step = total > 30 ? 5 : total > 12 ? 2 : 1;
  const ticks = Array.from({ length: Math.floor(total / step) + 1 }, (_, n) => n * step);
  const sortedCues = [...plan.cues].sort((a, b) => a.t - b.t);
  const nearestCue = sortedCues.filter((c) => c.t <= time + 0.05).at(-1);

  return (
    <div className="sd-timeline">
      <div className="sd-transport">
        <button className="icon-btn" aria-label="Revenir au début" title="Revenir au début" onClick={onReset}>
          <RotateCcw size={18} />
        </button>
        <button className="sd-play" aria-label={playing ? "Pause" : "Lecture"} onClick={onToggle}>
          {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <button className={"icon-btn" + (loop ? " on" : "")} aria-pressed={loop} aria-label="Lecture en boucle" title="Lecture en boucle" onClick={onLoop}>
          <Repeat size={18} />
        </button>
        <select aria-label="Vitesse" value={speed} onChange={(e) => onSpeed(Number(e.target.value))}>
          {[0.25, 0.5, 1, 1.5, 2].map((s) => (
            <option key={s} value={s}>
              {s} ×
            </option>
          ))}
        </select>
        <span className="sd-time">
          {timecode(time)} <small>/ {timecode(total)}</small>
        </span>
        {nearestCue && (
          <span className="sd-cue-now">
            <em>{nearestCue.text}</em>
            {editable && (
              <button type="button" aria-label={"Supprimer le repère " + nearestCue.text} title="Supprimer ce repère" onClick={() => onCues(plan.cues.filter((x) => x.id !== nearestCue.id))}>
                <X size={13} />
              </button>
            )}
          </span>
        )}
        {editable && (
          <button className="btn small" onClick={() => setCueText("")}>
            <Flag size={14} /> Repère à {timecode(time)}
          </button>
        )}
      </div>
      {cueText !== null && (
        <form
          className="sd-cue-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (cueText.trim()) onCues([...plan.cues, { id: crypto.randomUUID(), t: Math.round(time * 10) / 10, text: cueText.trim() }].sort((a, b) => a.t - b.t));
            setCueText(null);
          }}
        >
          <input autoFocus value={cueText} placeholder={`À ${timecode(time)} : ex. « Le marié se retourne »`} onChange={(e) => setCueText(e.target.value)} />
          <button className="btn small gold">
            <Plus size={14} /> Ajouter
          </button>
          <button type="button" className="icon-btn" aria-label="Annuler" onClick={() => setCueText(null)}>
            <X size={16} />
          </button>
        </form>
      )}
      <div className="sd-tracks">
        <div className="sd-track sd-ruler-row">
          <span className="sd-track-label">Repères</span>
          <div
            ref={lane}
            className="sd-ruler"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onTime(at(e.clientX));
            }}
            onPointerMove={(e) => {
              if (e.buttons) onTime(at(e.clientX));
            }}
          >
            {ticks.map((t) => (
              <span key={t} className="sd-tick" style={{ left: pct(t) }}>
                {t}s
              </span>
            ))}
            {sortedCues.map((c, n) => (
              // Le libellé s'arrête avant le repère suivant : deux repères proches ne se chevauchent plus.
              <span key={c.id} className="sd-cue" style={{ left: pct(c.t), maxWidth: `calc(${pct((sortedCues[n + 1]?.t ?? total) - c.t)} - 4px)` }} title={`${timecode(c.t)} · ${c.text}`}>
                <Flag size={11} />
                <em>{c.text}</em>
                {editable && (
                  <button
                    type="button"
                    aria-label={"Supprimer le repère " + c.text}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onCues(plan.cues.filter((x) => x.id !== c.id))}
                  >
                    <X size={10} />
                  </button>
                )}
              </span>
            ))}
            <span className="sd-playhead" style={{ left: pct(time) }} />
          </div>
        </div>
        {animated.map((el) => {
          const m = el.motion!;
          const def = movementById(m.type);
          return (
            <div key={el.id} className={"sd-track" + (selection.includes(el.id) ? " on" : "")}>
              <button type="button" className="sd-track-label" onClick={() => onSelect(el.id)}>
                <i style={{ background: colorOf(el) }} />
                {el.kind === "camera" ? el.tag : el.name}
              </button>
              <div className="sd-lane">
                <div
                  className="sd-clip"
                  style={{ left: pct(m.start), width: pct(m.duration), ["--clip" as string]: colorOf(el) }}
                  onPointerDown={(e) => {
                    onSelect(el.id);
                    if (!editable) return;
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      // Pointeur déjà relâché : le glisser se termine au relâchement quand même.
                    }
                    const mode = (e.target as Element).closest(".sd-clip-end") ? "end" : "move";
                    order.current = animated.map((a) => a.id);
                    drag.current = { id: el.id, mode, x: e.clientX, lastX: e.clientX, start: m.start, duration: m.duration };
                  }}
                  onPointerMove={(e) => {
                    const d = drag.current;
                    if (!d || d.id !== el.id) return;
                    d.lastX = e.clientX;
                    const dt = ((e.clientX - d.x) / width()) * total;
                    if (d.mode === "move") onClip(el.id, Math.max(0, round1(d.start + dt)), d.duration, false);
                    else onClip(el.id, d.start, Math.max(0.2, round1(d.duration + dt)), false);
                  }}
                  onPointerUp={(e) => finish(el, e.clientX)}
                  onPointerCancel={() => drag.current && finish(el, drag.current.lastX)}
                  onLostPointerCapture={() => drag.current && finish(el, drag.current.lastX)}
                >
                  <span>{def?.label ?? m.type}</span>
                  {editable && <i className="sd-clip-end" aria-hidden="true" />}
                </div>
                <span className="sd-playhead" style={{ left: pct(time) }} />
              </div>
            </div>
          );
        })}
        {!animated.length && <p className="muted sd-empty-tracks">Donnez un mouvement à une caméra ou une personne (inspecteur → Mouvement) : il apparaît ici, sur sa piste.</p>}
      </div>
    </div>
  );
}
