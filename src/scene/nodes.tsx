// Dessin des éléments du plan (SVG, unités en mètres). Chaque type a sa silhouette lisible de loin.
import { memo } from "react";
import type { SceneElement } from "./types";
import type { Pose } from "./motion";
import { assetById, lightById, movementById, roleById } from "./catalog";
import { cameraFov, direction, dist, estimateFraming, frameWidth, rad, sizeOf } from "./geometry";

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
/** Générateur pseudo-aléatoire stable : une foule garde toujours le même dessin. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const fontFor = (w: number, h: number) => Math.max(0.28, Math.min(0.7, Math.min(w, h) * 0.16));

/** Température de couleur → teinte du faisceau (2700 K chaud, 5600 K neutre, 6500 K froid). */
export function kelvinColor(k = 5600): string {
  if (k <= 3200) return "#ffb85c";
  if (k <= 4300) return "#ffd59a";
  if (k <= 5800) return "#fff2d4";
  return "#dbe8ff";
}

function Label({ x, y, text, size = 0.34, color = "#f4ead7", weight = 700 }: { x: number; y: number; text: string; size?: number; color?: string; weight?: number }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={weight} textAnchor="middle" fill={color} stroke="#0b0b0a" strokeWidth={size * 0.22} paintOrder="stroke" className="sd-label">
      {text}
    </text>
  );
}

/** Architecture, zones, mobilier, rangées : dessin statique, mémorisé. */
export const StaticNode = memo(function StaticNode({ el }: { el: SceneElement }) {
  const { w, h } = sizeOf(el);
  const def = assetById(el.asset);
  const color = el.color ?? def?.color ?? "#8a8f99";
  const t = `translate(${el.x} ${el.y}) rotate(${el.rotation})`;
  const ellipse = el.shape === "ellipse";
  const shape = (props: React.SVGProps<SVGRectElement & SVGEllipseElement>) =>
    ellipse ? <ellipse rx={w / 2} ry={h / 2} {...(props as React.SVGProps<SVGEllipseElement>)} /> : <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={Math.min(w, h) * 0.08} {...(props as React.SVGProps<SVGRectElement>)} />;

  if (el.kind === "zone")
    return (
      <g transform={t} className="sd-node">
        {shape({ fill: color, fillOpacity: el.asset === "piste" ? 0.22 : 0.16, stroke: color, strokeWidth: 0.05, strokeDasharray: "0.25 0.18" })}
        {el.asset === "piste" && <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="url(#sd-checker)" opacity={0.35} />}
        <g transform={`rotate(${-el.rotation})`}>
          <Label x={0} y={0.12} text={el.name} size={fontFor(w, h)} color="#f4ead7" />
        </g>
      </g>
    );
  if (el.kind === "wall") {
    if (el.asset === "porte")
      return (
        <g transform={t} className="sd-node">
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#0b0b0a" />
          <path d={`M ${-w / 2} ${h / 2} L ${-w / 2} ${h / 2 + w} A ${w} ${w} 0 0 0 ${w / 2} ${h / 2}`} fill="none" stroke={color} strokeWidth={0.04} strokeDasharray="0.12 0.08" />
          <line x1={-w / 2} y1={h / 2} x2={-w / 2} y2={h / 2 + w} stroke={color} strokeWidth={0.06} />
        </g>
      );
    if (el.asset === "fenetre")
      return (
        <g transform={t} className="sd-node">
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#0b0b0a" stroke={color} strokeWidth={0.03} />
          <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke={color} strokeWidth={0.05} />
        </g>
      );
    if (el.asset === "escalier") {
      const steps = Math.max(3, Math.round(w / 0.3));
      return (
        <g transform={t} className="sd-node">
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={0.04} />
          {Array.from({ length: steps }, (_, n) => (
            <line key={n} x1={-w / 2 + (w * (n + 1)) / (steps + 1)} y1={-h / 2} x2={-w / 2 + (w * (n + 1)) / (steps + 1)} y2={h / 2} stroke={color} strokeWidth={0.03} />
          ))}
        </g>
      );
    }
    if (el.asset === "arche")
      return (
        <g transform={t} className="sd-node">
          <path d={`M ${-w / 2} ${h / 2} Q 0 ${-h * 1.6} ${w / 2} ${h / 2}`} fill="none" stroke={color} strokeWidth={0.12} strokeLinecap="round" />
        </g>
      );
    return (
      <g transform={t} className="sd-node">
        {shape({ fill: color, stroke: "#0b0b0a", strokeWidth: 0.02 })}
      </g>
    );
  }
  if (el.kind === "rows") {
    const rows = Math.max(1, el.rows ?? 6);
    const cols = Math.max(1, el.cols ?? 5);
    const cw = w / cols;
    const rh = h / rows;
    const s = Math.min(cw, rh) * 0.72;
    let d = "";
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = -w / 2 + cw * c + (cw - s) / 2;
        const y = -h / 2 + rh * r + (rh - s) / 2;
        d += `M${x.toFixed(2)} ${y.toFixed(2)}h${s.toFixed(2)}v${s.toFixed(2)}h${(-s).toFixed(2)}z`;
      }
    return (
      <g transform={t} className="sd-node">
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={color} fillOpacity={0.06} stroke={color} strokeOpacity={0.4} strokeWidth={0.03} />
        <path d={d} fill={color} fillOpacity={0.55} />
        <g transform={`rotate(${-el.rotation})`}>
          <Label x={0} y={0.1} text={`${el.name} · ${rows * cols}`} size={fontFor(w, h) * 0.8} />
        </g>
      </g>
    );
  }
  // Mobilier et décor
  return (
    <g transform={t} className="sd-node">
      {shape({ fill: color, fillOpacity: 0.32, stroke: color, strokeWidth: 0.04 })}
      {el.asset === "dj" && <Label x={0} y={0.12} text="DJ" size={0.36} />}
      {el.asset === "voiture" && <rect x={w * 0.12} y={-h * 0.36} width={w * 0.22} height={h * 0.72} rx={0.1} fill={color} fillOpacity={0.6} />}
      {el.asset === "miroir" && <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#b9d7ee" fillOpacity={0.8} />}
      {w * h > 0.9 && el.asset !== "dj" && (
        <g transform={`rotate(${-el.rotation})`}>
          <Label x={0} y={0.1} text={el.name} size={fontFor(w, h) * 0.75} color="#e9dfcc" weight={600} />
        </g>
      )}
    </g>
  );
});

/** Foule : N silhouettes réparties dans la zone, dessinées d'un seul tracé (200 invités sans ralentir). */
export const CrowdNode = memo(function CrowdNode({ el }: { el: SceneElement }) {
  const { w, h } = sizeOf(el);
  const n = Math.max(1, Math.min(400, el.count ?? 20));
  const rand = seeded(hash(el.id));
  const r = Math.min(0.22, Math.sqrt((w * h) / n) * 0.3);
  let d = "";
  for (let i = 0; i < n; i++) {
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 6; tries++) {
      x = (rand() - 0.5) * (w - r * 2);
      y = (rand() - 0.5) * (h - r * 2);
      if (el.shape !== "ellipse" || (x * x) / ((w / 2) ** 2) + (y * y) / ((h / 2) ** 2) <= 1) break;
    }
    d += `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(r * 2).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-r * 2).toFixed(2)} 0`;
  }
  const color = el.color ?? "#9aa1ab";
  return (
    <g transform={`translate(${el.x} ${el.y}) rotate(${el.rotation})`} className="sd-node">
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.3} fill={color} fillOpacity={0.05} stroke={color} strokeOpacity={0.35} strokeWidth={0.03} strokeDasharray="0.2 0.15" />
      <path d={d} fill={color} fillOpacity={0.75} />
      <g transform={`rotate(${-el.rotation})`}>
        <Label x={0} y={-h / 2 - 0.2} text={`${el.name} · ${n}`} size={0.32} />
      </g>
    </g>
  );
});

/** Une personne vue du dessus : épaules, tête, direction du regard, rôle en couleur. */
export function PersonNode({ el, pose, operatorColor }: { el: SceneElement; pose: Pose; operatorColor?: string }) {
  const role = roleById(el.role);
  const light = ["mariee", "enfant", "invite", "couple"].includes(role.id);
  return (
    <g transform={`translate(${pose.x} ${pose.y})`} className="sd-node">
      <g transform={`rotate(${pose.rotation})`}>
        <ellipse rx={0.19} ry={0.31} fill={role.color} stroke={operatorColor ?? "#0b0b0a"} strokeWidth={operatorColor ? 0.06 : 0.03} />
        <circle r={0.15} fill={role.color} stroke="#0b0b0a" strokeWidth={0.025} />
        <path d="M 0.2 -0.07 L 0.34 0 L 0.2 0.07 Z" fill={role.color} stroke="#0b0b0a" strokeWidth={0.02} />
      </g>
      <text y={0.07} fontSize={0.17} fontWeight={800} textAnchor="middle" fill={light ? "#1b1a17" : "#fff"} className="sd-label">
        {role.mark}
      </text>
      <Label x={0} y={0.62} text={el.name} size={0.26} />
    </g>
  );
}

/** Cône de champ : ouverture selon capteur et focale, longueur jusqu'au sujet visé. */
export function FovCone({ el, pose, target, color, faint = false }: { el: SceneElement; pose: Pose; target?: Pose; color: string; faint?: boolean }) {
  const fov = cameraFov(el);
  const reach = target ? Math.max(0.6, dist(pose, target)) : Math.min(14, Math.max(3, (el.focal ?? 35) / 8));
  const half = rad(fov / 2);
  const a = rad(pose.rotation);
  const p1 = { x: pose.x + Math.cos(a - half) * reach, y: pose.y + Math.sin(a - half) * reach };
  const p2 = { x: pose.x + Math.cos(a + half) * reach, y: pose.y + Math.sin(a + half) * reach };
  const framing = target ? estimateFraming(frameWidth(reach, fov)) : null;
  const id = `fov-${el.id}`;
  const f = direction(pose.rotation);
  return (
    <g className="sd-cone" pointerEvents="none">
      <defs>
        <radialGradient id={id} cx={pose.x} cy={pose.y} r={reach} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color} stopOpacity={faint ? 0.18 : 0.34} />
          <stop offset="1" stopColor={color} stopOpacity={0.02} />
        </radialGradient>
      </defs>
      <path d={`M ${pose.x} ${pose.y} L ${p1.x} ${p1.y} A ${reach} ${reach} 0 0 1 ${p2.x} ${p2.y} Z`} fill={`url(#${id})`} stroke={color} strokeOpacity={faint ? 0.25 : 0.55} strokeWidth={0.03} />
      {target && (
        <>
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={0.05} strokeDasharray="0.15 0.1" />
          {framing && !faint && <Label x={pose.x + f.x * (reach + 0.55)} y={pose.y + f.y * (reach + 0.55) + 0.1} text={`${framing.code} · ${el.focal ?? 35} mm`} size={0.28} color={color} />}
        </>
      )}
    </g>
  );
}

/** Caméra : boîtier, objectif, nom (CAM A) et couleur de l'opérateur. */
export function CameraNode({ el, pose, operatorColor }: { el: SceneElement; pose: Pose; operatorColor?: string }) {
  const color = el.color ?? "#e6c27f";
  return (
    <g transform={`translate(${pose.x} ${pose.y})`} className="sd-node">
      <g transform={`rotate(${pose.rotation})`}>
        <rect x={-0.34} y={-0.2} width={0.46} height={0.4} rx={0.07} fill="#1b1a17" stroke={operatorColor ?? color} strokeWidth={0.07} />
        <path d="M 0.12 -0.11 L 0.36 -0.19 L 0.36 0.19 L 0.12 0.11 Z" fill={color} />
        {pose.tilt ? <path d={`M -0.1 0 L -0.1 ${-0.45 * pose.tilt}`} stroke={color} strokeWidth={0.05} markerEnd="url(#sd-arrow)" /> : null}
      </g>
      <Label x={0} y={-0.42} text={(el.tag ?? el.name).replace("CAM ", "")} size={0.3} color={color} />
      <Label x={0} y={0.66} text={el.tag ?? el.name} size={0.24} color="#e9dfcc" weight={600} />
      {pose.altitude !== undefined && el.motion && ["crane-up", "crane-down"].includes(el.motion.type) && <Label x={0.9} y={0.1} text={`${pose.altitude.toFixed(1)} m`} size={0.24} color={color} />}
    </g>
  );
}

/** Drone : quatre hélices, altitude affichée. */
export function DroneNode({ el, pose, operatorColor }: { el: SceneElement; pose: Pose; operatorColor?: string }) {
  const color = el.color ?? "#5fd0e6";
  return (
    <g transform={`translate(${pose.x} ${pose.y})`} className="sd-node">
      <g transform={`rotate(${pose.rotation})`}>
        <path d="M -0.32 -0.32 L 0.32 0.32 M -0.32 0.32 L 0.32 -0.32" stroke={color} strokeWidth={0.07} />
        {[
          [-0.32, -0.32],
          [0.32, 0.32],
          [-0.32, 0.32],
          [0.32, -0.32],
        ].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={0.17} fill="#0b0b0a" stroke={color} strokeWidth={0.04} />
        ))}
        <rect x={-0.12} y={-0.1} width={0.26} height={0.2} rx={0.05} fill={color} stroke={operatorColor ?? "none"} strokeWidth={0.05} />
        <path d="M 0.16 -0.06 L 0.3 0 L 0.16 0.06 Z" fill="#fff" />
      </g>
      <Label x={0} y={0.8} text={`${el.name} · ${Math.round(pose.altitude ?? el.altitude ?? 25)} m`} size={0.26} color={color} />
    </g>
  );
}

/** Lumière : source et faisceau (ouverture, portée, puissance, température). */
export function LightNode({ el, pose, selected }: { el: SceneElement; pose: Pose; selected?: boolean }) {
  const def = lightById(el.asset);
  const beam = el.beam ?? def.beam;
  const reach = el.reach ?? def.reach;
  const power = (el.power ?? 80) / 100;
  const color = def.subtractive ? "#000000" : kelvinColor(el.temperature);
  const a = rad(pose.rotation);
  const half = rad(Math.min(359, beam) / 2);
  const id = `lux-${el.id}`;
  const p1 = { x: pose.x + Math.cos(a - half) * reach, y: pose.y + Math.sin(a - half) * reach };
  const p2 = { x: pose.x + Math.cos(a + half) * reach, y: pose.y + Math.sin(a + half) * reach };
  const cone = beam >= 300 ? `M ${pose.x - reach} ${pose.y} a ${reach} ${reach} 0 1 0 ${reach * 2} 0 a ${reach} ${reach} 0 1 0 ${-reach * 2} 0` : `M ${pose.x} ${pose.y} L ${p1.x} ${p1.y} A ${reach} ${reach} 0 ${beam > 180 ? 1 : 0} 1 ${p2.x} ${p2.y} Z`;
  return (
    <g>
      <defs>
        <radialGradient id={id} cx={pose.x} cy={pose.y} r={reach} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color} stopOpacity={(def.subtractive ? 0.5 : 0.55) * power + 0.08} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={cone} fill={`url(#${id})`} stroke={def.subtractive ? "#555" : color} strokeOpacity={selected ? 0.6 : 0.2} strokeWidth={0.03} pointerEvents="none" className="sd-cone" />
      <g transform={`translate(${pose.x} ${pose.y})`} className="sd-node">
        <g transform={`rotate(${pose.rotation})`}>
          {el.asset === "fenetre" || el.asset === "naturelle" ? (
            <circle r={0.26} fill={color} stroke="#0b0b0a" strokeWidth={0.03} />
          ) : (
            <>
              <rect x={-0.24} y={-0.22} width={0.3} height={0.44} rx={0.05} fill="#1b1a17" stroke={color} strokeWidth={0.05} />
              <rect x={0.06} y={-0.22} width={0.08} height={0.44} fill={def.subtractive ? "#333" : color} />
            </>
          )}
        </g>
        <Label x={0} y={0.66} text={el.name} size={0.24} color={def.subtractive ? "#b8b0a0" : "#f6db77"} weight={600} />
      </g>
    </g>
  );
}

export function AudioNode({ el, pose }: { el: SceneElement; pose: Pose }) {
  return (
    <g transform={`translate(${pose.x} ${pose.y})`} className="sd-node">
      <circle r={0.2} fill="#1b1a17" stroke="#a698ef" strokeWidth={0.05} />
      <rect x={-0.06} y={-0.13} width={0.12} height={0.18} rx={0.06} fill="#a698ef" />
      <Label x={0} y={0.52} text={el.name} size={0.22} color="#c9c0f7" weight={600} />
    </g>
  );
}

export function NoteNode({ el }: { el: SceneElement }) {
  const text = el.text || el.name;
  const w = Math.max(1.4, Math.min(5, text.length * 0.16 + 0.4));
  return (
    <g transform={`translate(${el.x} ${el.y})`} className="sd-node">
      <rect x={-w / 2} y={-0.3} width={w} height={0.6} rx={0.08} fill="#f6db77" fillOpacity={0.92} />
      <text y={0.09} fontSize={0.26} fontWeight={700} textAnchor="middle" fill="#2b2111" className="sd-label">
        {text}
      </text>
    </g>
  );
}

/** Trajectoire prévue : courbe pointillée avec flèche ; pour un pan, un arc autour de la caméra. */
export function Trail({ el, points, color }: { el: SceneElement; points: Pose[]; color: string }) {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const moved = points.some((p) => dist(p, first) > 0.08);
  const def = movementById(el.motion?.type);
  if (!moved) {
    const turn = last.rotation - first.rotation;
    if (Math.abs(turn) < 1) return null;
    const r = 0.95;
    const a0 = rad(first.rotation);
    const a1 = rad(last.rotation);
    const large = Math.abs(turn) > 180 ? 1 : 0;
    const sweep = turn > 0 ? 1 : 0;
    return (
      <g pointerEvents="none" className="sd-trail">
        <path
          d={`M ${first.x + Math.cos(a0) * r} ${first.y + Math.sin(a0) * r} A ${r} ${r} 0 ${large} ${sweep} ${first.x + Math.cos(a1) * r} ${first.y + Math.sin(a1) * r}`}
          fill="none"
          stroke={color}
          strokeWidth={0.06}
          markerEnd="url(#sd-arrow)"
        />
        {def && <Label x={first.x} y={first.y - 1.15} text={def.label} size={0.24} color={color} />}
      </g>
    );
  }
  const d = points.map((p, n) => `${n ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const mid = points[Math.floor(points.length / 2)];
  return (
    <g pointerEvents="none" className="sd-trail">
      <path d={d} fill="none" stroke={color} strokeWidth={0.06} strokeDasharray="0.22 0.14" markerEnd="url(#sd-arrow)" />
      {def && <Label x={mid.x} y={mid.y - 0.35} text={def.label} size={0.24} color={color} />}
    </g>
  );
}
