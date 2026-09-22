// Moteur d'animation : où est chaque élément, et où regarde-t-il, à l'instant t.
// Fonction pure — la même horloge anime personnes, caméras, drone et lumières.
import type { Motion, Point, SceneElement } from "./types";
import { movementById } from "./catalog";
import { angleTo, direction, dist } from "./geometry";

export interface Pose {
  x: number;
  y: number;
  rotation: number;
  /** Altitude (drone, grue), en mètres. */
  altitude?: number;
  /** Bascule d'un tilt, de -1 (bas) à 1 (haut). */
  tilt?: number;
}
export type Finder = (id: string) => SceneElement | undefined;

const smooth = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
/** Avancement d'un mouvement à l'instant t : 0 avant son début, 1 après sa fin. */
export function progress(m: Motion, t: number): number {
  if (m.duration <= 0) return t >= m.start ? 1 : 0;
  return Math.min(1, Math.max(0, (t - m.start) / m.duration));
}

// Trajectoire lissée (Catmull-Rom) mise en cache par tableau de points.
const cache = new WeakMap<Point[], { pts: Point[]; lengths: number[]; total: number }>();
function spline(from: Point, path: Point[]) {
  const key = path;
  const hit = cache.get(key);
  if (hit && hit.pts[0].x === from.x && hit.pts[0].y === from.y) return hit;
  const ctrl = [from, ...path];
  const pts: Point[] = [from];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let s = 1; s <= 12; s++) {
      const u = s / 12;
      const u2 = u * u;
      const u3 = u2 * u;
      pts.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
      });
    }
  }
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1] + dist(pts[i - 1], pts[i]));
  const value = { pts, lengths, total: lengths[lengths.length - 1] };
  cache.set(key, value);
  return value;
}
/** Position et direction de marche à la fraction `k` de la trajectoire. */
export function along(from: Point, path: Point[], k: number): { x: number; y: number; heading: number | null } {
  if (!path.length) return { ...from, heading: null };
  const { pts, lengths, total } = spline(from, path);
  if (total === 0) return { ...from, heading: null };
  const target = k * total;
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < target) i++;
  const a = pts[i - 1];
  const b = pts[i];
  const seg = lengths[i] - lengths[i - 1] || 1;
  const u = Math.min(1, Math.max(0, (target - lengths[i - 1]) / seg));
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, heading: angleTo(a, b) };
}

/**
 * Pose d'un élément à l'instant t. Avant le début de son mouvement il est à sa place ; après la
 * fin il reste à l'arrivée. Un mouvement qui vise un sujet (suivi, orbite) lit la pose du sujet
 * au même instant : une caméra suit donc la mariée qui marche.
 */
export function poseAt(el: SceneElement, t: number, find: Finder, depth = 0): Pose {
  const base: Pose = { x: el.x, y: el.y, rotation: el.rotation, altitude: el.kind === "drone" ? el.altitude ?? 25 : el.height };
  const m = el.motion;
  if (!m || m.type === "static") return base;
  const def = movementById(m.type);
  const raw = progress(m, t);
  const k = m.easing === "linear" ? raw : smooth(raw);
  const f = direction(el.rotation);
  const left = direction(el.rotation - 90);
  const d = m.distance ?? def?.distance ?? 0;
  const sweep = m.sweep ?? def?.sweep ?? 0;
  const rise = m.rise ?? def?.rise ?? 0;
  const target = m.targetId && depth < 4 ? find(m.targetId) : undefined;
  const now = target ? poseAt(target, t, find, depth + 1) : undefined;
  const then = target ? poseAt(target, m.start, find, depth + 1) : undefined;
  const face = (x: number, y: number) => (now ? angleTo({ x, y }, now) : base.rotation);
  const alt = (base.altitude ?? 0) + rise * k;

  switch (m.type) {
    case "pan-left":
    case "pan-right":
    case "turn":
      return { ...base, rotation: el.rotation + sweep * k };
    case "pan-follow":
      // Pied fixe : seul l'axe tourne pour garder le sujet au centre.
      return { ...base, rotation: now ? face(el.x, el.y) : base.rotation };
    case "whip-pan":
      // Le whip part d'un coup (un tiers du temps) puis tient le nouvel axe.
      return { ...base, rotation: el.rotation + sweep * Math.min(1, raw * 3) };
    case "tilt-up":
      return { ...base, tilt: k };
    case "tilt-down":
      return { ...base, tilt: -k };
    case "push-in":
      return { ...base, x: el.x + f.x * d * k, y: el.y + f.y * d * k };
    case "pull-out":
      return { ...base, x: el.x - f.x * d * k, y: el.y - f.y * d * k };
    case "truck-left":
      return { ...base, x: el.x + left.x * d * k, y: el.y + left.y * d * k };
    case "truck-right":
      return { ...base, x: el.x - left.x * d * k, y: el.y - left.y * d * k };
    case "crane-up":
    case "crane-down":
    case "rise":
    case "descend":
    case "top-shot":
      return { ...base, altitude: alt };
    case "handheld": {
      // Flottement déterministe : la même scène rejoue toujours le même geste.
      const s = t * 1.7;
      return {
        ...base,
        x: el.x + 0.06 * Math.sin(s * 4.1) + 0.03 * Math.sin(s * 9.3),
        y: el.y + 0.05 * Math.cos(s * 3.7) + 0.03 * Math.sin(s * 7.9),
        rotation: el.rotation + 2 * Math.sin(s * 2.9),
      };
    }
    case "orbit":
    case "arc":
    case "arc180":
    case "orbit360":
    case "drone-orbit": {
      // Centre : le sujet (même s'il bouge), sinon un point 3 m devant.
      const c0 = then ?? { x: el.x + f.x * 3, y: el.y + f.y * 3 };
      const c = now ?? c0;
      const ox = el.x - c0.x;
      const oy = el.y - c0.y;
      const a = (sweep * k * Math.PI) / 180;
      const x = c.x + ox * Math.cos(a) - oy * Math.sin(a);
      const y = c.y + ox * Math.sin(a) + oy * Math.cos(a);
      return { ...base, x, y, rotation: angleTo({ x, y }, c), altitude: alt };
    }
    case "follow":
    case "leading":
    case "drone-tracking": {
      if (!now || !then) return base;
      const x = now.x + (el.x - then.x);
      const y = now.y + (el.y - then.y);
      return { ...base, x, y, rotation: face(x, y), altitude: alt };
    }
    case "parallax": {
      const x = el.x - left.x * d * k;
      const y = el.y - left.y * d * k;
      return { ...base, x, y, rotation: now ? face(x, y) : base.rotation };
    }
    case "reveal": {
      const x = el.x - left.x * d * k;
      const y = el.y - left.y * d * k;
      const end = now ? angleTo({ x, y }, now) : el.rotation;
      const delta = ((((end - el.rotation + 180) % 360) + 360) % 360) - 180;
      return { ...base, x, y, rotation: el.rotation + delta * k };
    }
    case "pull-away":
      return { ...base, x: el.x - f.x * d * k, y: el.y - f.y * d * k, altitude: alt };
    case "push-forward":
    case "drone-reveal":
      return { ...base, x: el.x + f.x * d * k, y: el.y + f.y * d * k, altitude: alt };
    case "dolly": {
      const p = along(el, m.path ?? [], k);
      return { ...base, x: p.x, y: p.y };
    }
    case "tracking":
    case "walk":
    case "custom":
    case "fly-over": {
      if (!m.path?.length) {
        if (now && then) return { ...base, x: now.x + (el.x - then.x), y: now.y + (el.y - then.y), rotation: face(now.x + (el.x - then.x), now.y + (el.y - then.y)) };
        return base;
      }
      const p = along(el, m.path, k);
      const rotation = now ? face(p.x, p.y) : raw > 0 && p.heading !== null ? p.heading : el.rotation;
      return { ...base, x: p.x, y: p.y, rotation, altitude: alt };
    }
    default:
      return base;
  }
}

/** Échantillons de la trajectoire d'un élément, pour la dessiner sur le plan. */
export function trail(el: SceneElement, find: Finder, samples = 40): Pose[] {
  const m = el.motion;
  if (!m || m.type === "static") return [];
  return Array.from({ length: samples + 1 }, (_, n) => poseAt(el, m.start + (m.duration * n) / samples, find));
}

/** Durée de la scène : fin du dernier mouvement (au moins 6 s). */
export function sceneLength(elements: SceneElement[]): number {
  return Math.max(6, ...elements.map((el) => (el.motion && el.motion.type !== "static" ? el.motion.start + el.motion.duration : 0)));
}
