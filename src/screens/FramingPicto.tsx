import { framingCode } from "../model";

/**
 * Pictogramme de cadrage : ce que voit la caméra pour une valeur de plan (gros plan, plan taille,
 * plan large…), dessiné avec une silhouette. Remplace une carte vide quand le plan n'a pas encore
 * de référence : on comprend le plan d'un coup d'œil, même sans photo.
 */

// Fenêtre verticale du cadre, en hauteur de corps (0 = haut de la tête, 1 = pieds).
const windows: Record<string, [number, number]> = {
  ECU: [0.035, 0.1],
  CU: [-0.02, 0.23],
  RCT: [-0.02, 0.23],
  MCU: [-0.04, 0.36],
  OTS: [-0.04, 0.4],
  MS: [-0.05, 0.56],
  "2S": [-0.05, 0.56],
  POV: [-0.05, 0.56],
  MFS: [-0.05, 0.78],
  FS: [-0.08, 1.08],
  WS: [-0.9, 1.35],
  MST: [-0.9, 1.35],
  GRP: [-0.5, 1.25],
  CUT: [-0.5, 1.25],
  EWS: [-3.8, 1.6],
  EST: [-3.8, 1.6],
  DEST: [-3.8, 1.6],
};

// Moitié gauche d'une silhouette debout (hauteur 1, centrée en x = 0), refermée par symétrie.
const side: [number, number][] = [
  [-0.028, 0.125],
  [-0.03, 0.155],
  [-0.125, 0.185],
  [-0.155, 0.23],
  [-0.16, 0.34],
  [-0.15, 0.48],
  [-0.122, 0.48],
  [-0.128, 0.34],
  [-0.105, 0.25],
  [-0.085, 0.43],
  [-0.1, 0.53],
  [-0.085, 0.74],
  [-0.065, 0.965],
  [-0.09, 1],
  [-0.025, 1],
  [-0.03, 0.965],
  [-0.03, 0.74],
  [0, 0.56],
];
const bodyPath =
  "M" +
  [...side, ...side.slice(0, -1).reverse().map(([x, y]): [number, number] => [-x, y])].map(([x, y]) => `${x} ${y}`).join("L") +
  "Z";

/** Combien de personnes dessiner, d'après « qui est dans le plan ». */
export function peopleCount(who: unknown, code: string): number {
  if (code === "GRP" || code === "CUT") return 5;
  if (code === "2S") return 2;
  if (code === "ECU") return 1;
  const text = String(who ?? "").toLowerCase();
  if (/famille|invités|groupe|témoins|demoiselles|garçons|enfants|cortège/.test(text)) return 3;
  if (/couple|mariés|parents|deux/.test(text)) return 2;
  return 1;
}

function Figure({ x, y, s, dark = false }: { x: number; y: number; s: number; dark?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className={"fp-body" + (dark ? " dark" : "")}>
      <path d={bodyPath} />
      <ellipse cx={0} cy={0.066} rx={0.05} ry={0.066} />
    </g>
  );
}

export default function FramingPicto({ framing, who, orientation, className = "" }: { framing: unknown; who?: unknown; orientation?: unknown; className?: string }) {
  const code = framingCode(framing);
  if (!code) return null;
  const shape = orientation === "portrait" ? "portrait" : orientation === "carré" ? "square" : "landscape";
  const [w, h] = shape === "portrait" ? [90, 160] : shape === "square" ? [120, 120] : [160, 90];
  const corner = Math.min(w, h) * 0.12;
  const corners = `M3 ${3 + corner}V3H${3 + corner}M${w - 3 - corner} 3H${w - 3}V${3 + corner}M${w - 3} ${h - 3 - corner}V${h - 3}H${w - 3 - corner}M${3 + corner} ${h - 3}H3V${h - 3 - corner}`;
  let content;
  if (code === "INS") {
    // Détail : les alliances.
    const r = Math.min(w, h) * 0.17;
    content = (
      <g className="fp-rings">
        <circle cx={w / 2 - r * 0.55} cy={h / 2} r={r} />
        <circle cx={w / 2 + r * 0.55} cy={h / 2} r={r} />
      </g>
    );
  } else {
    const [top, bottom] = windows[code] ?? windows.MS;
    const s = h / (bottom - top);
    const y = -top * s;
    const n = peopleCount(who, code);
    const gap = n === 2 ? 0.2 : n === 3 ? 0.3 : 0.28;
    content = (
      <>
        {(code === "EWS" || code === "EST" || code === "DEST" || code === "WS" || code === "MST") && <path className="fp-ground" d={`M0 ${y + s}H${w}`} />}
        {Array.from({ length: n }, (_, i) => (
          <Figure key={i} x={w / 2 + (i - (n - 1) / 2) * gap * s} y={y} s={s} />
        ))}
        {code === "ECU" && (
          <g className="fp-eyes" transform={`translate(${w / 2} ${y}) scale(${s})`}>
            <ellipse cx={-0.019} cy={0.062} rx={0.009} ry={0.004} />
            <ellipse cx={0.019} cy={0.062} rx={0.009} ry={0.004} />
          </g>
        )}
        {/* Par-dessus l'épaule : l'épaule et la nuque d'un second personnage au premier plan. */}
        {code === "OTS" && <Figure x={w * 0.12} y={y + 0.1 * s} s={s * 1.35} dark />}
      </>
    );
  }
  return (
    <span className={`fp is-${shape} ${className}`} aria-hidden="true">
      <svg viewBox={`0 0 ${w} ${h}`}>
        <rect className="fp-bg" width={w} height={h} rx={5} />
        <path className="fp-thirds" d={`M${w / 3} 0V${h}M${(2 * w) / 3} 0V${h}M0 ${h / 3}H${w}M0 ${(2 * h) / 3}H${w}`} />
        {content}
        {code === "POV" && <rect className="fp-vignette" width={w} height={h} rx={5} />}
        <path className="fp-corners" d={corners} />
      </svg>
      <b className="fp-code">{code}</b>
    </span>
  );
}
