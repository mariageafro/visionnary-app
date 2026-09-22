// Géométrie du plan : angles, champ de vision d'une caméra, largeur de cadre, valeur de plan.
import type { Point, SceneElement } from "./types";
import { sensorById } from "./catalog";

export const rad = (degrees: number) => (degrees * Math.PI) / 180;
export const deg = (radians: number) => (radians * 180) / Math.PI;
export const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
/** Angle (degrés) du regard de `from` vers `to`. */
export const angleTo = (from: Point, to: Point) => deg(Math.atan2(to.y - from.y, to.x - from.x));
/** Vecteur unitaire dans la direction `rotation`. */
export const direction = (rotation: number): Point => ({ x: Math.cos(rad(rotation)), y: Math.sin(rad(rotation)) });
/** Angle ramené entre -180 et 180. */
export const normAngle = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
export const snap = (value: number, step: number) => (step > 0 ? Math.round(value / step) * step : value);
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Champ de vision horizontal, en degrés : 2 · atan(largeur du capteur / (2 · focale)). */
export function hfov(sensorWidthMm: number, focalMm: number): number {
  return deg(2 * Math.atan(sensorWidthMm / (2 * Math.max(1, focalMm))));
}
export const cameraFov = (cam: Pick<SceneElement, "sensor" | "focal">) => hfov(sensorById(cam.sensor).width, cam.focal ?? 35);
/** Largeur couverte par le cadre à `distance` mètres. */
export const frameWidth = (distance: number, fovDegrees: number) => 2 * distance * Math.tan(rad(fovDegrees) / 2);

export interface Framing {
  label: string;
  code: string;
}
/**
 * Valeur de plan estimée d'après la hauteur du cadre (format 16/9) à la distance du sujet :
 * 85 mm plein format à 3 m couvre 1,27 m de large, soit 0,71 m de haut → plan poitrine.
 */
export function estimateFraming(frameWidthMeters: number): Framing {
  const h = (frameWidthMeters * 9) / 16;
  if (h < 0.15) return { label: "Très gros plan", code: "ECU" };
  if (h < 0.35) return { label: "Gros plan", code: "CU" };
  if (h < 0.75) return { label: "Plan poitrine", code: "MCU" };
  if (h < 1.1) return { label: "Plan taille", code: "MS" };
  if (h < 1.5) return { label: "Plan américain", code: "MFS" };
  if (h < 2.4) return { label: "Plein pied", code: "FS" };
  if (h < 7) return { label: "Plan large", code: "WS" };
  return { label: "Plan d’ensemble", code: "EWS" };
}

/** Taille d'un élément (les pions ponctuels ont une taille d'affichage fixe). */
export function sizeOf(el: SceneElement): { w: number; h: number } {
  if (el.w && el.h) return { w: el.w, h: el.h };
  if (el.kind === "person") return { w: 0.6, h: 0.45 };
  if (el.kind === "camera" || el.kind === "drone") return { w: 0.7, h: 0.5 };
  if (el.kind === "light") return { w: 0.6, h: 0.6 };
  return { w: 0.6, h: 0.6 };
}

/** Le point est-il dans l'élément (rectangle ou ellipse orienté) ? */
export function contains(el: SceneElement, p: Point, margin = 0): boolean {
  const { w, h } = sizeOf(el);
  const a = rad(-el.rotation);
  const dx = p.x - el.x;
  const dy = p.y - el.y;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  const hw = w / 2 + margin;
  const hh = h / 2 + margin;
  if (el.shape === "ellipse") return (lx * lx) / (hw * hw) + (ly * ly) / (hh * hh) <= 1;
  return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
}

/** Coins d'un élément orienté (pour les bornes et la sélection au lasso). */
export function corners(el: SceneElement): Point[] {
  const { w, h } = sizeOf(el);
  const a = rad(el.rotation);
  return [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([lx, ly]) => ({ x: el.x + lx * Math.cos(a) - ly * Math.sin(a), y: el.y + lx * Math.sin(a) + ly * Math.cos(a) }));
}

export function bounds(elements: SceneElement[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const pts = elements.flatMap((el) => [...corners(el), ...(el.motion?.path ?? [])]);
  if (!pts.length) return null;
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}
