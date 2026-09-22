// Ce qu'une étape contient, compté d'un coup : plans vidéo et photo, poses, essentiels,
// transitions, lumières… — pour le tableau de bord d'une étape et la progression du tournage.
import type { Item, Project } from "./types";
import { done } from "./model";

export type ShotKind = "both" | "video" | "photo" | "drone";
/** Type d'un plan ; « vide » (valeur historique) = vidéo et photo. */
export const shotKind = (i: Item): ShotKind => (i.media === "video" || i.media === "photo" || i.media === "drone" ? i.media : "both");
export const isVideoShot = (i: Item) => ["video", "both"].includes(shotKind(i));
export const isPhotoShot = (i: Item) => ["photo", "both"].includes(shotKind(i));
export const isDroneShot = (i: Item) => shotKind(i) === "drone";
export const kindLabels: Record<ShotKind, string> = { both: "Vidéo et photo", video: "Vidéo", photo: "Photo", drone: "Drone" };

export interface Count {
  done: number;
  total: number;
}
const count = (list: Item[]): Count => ({ done: list.filter(done).length, total: list.length });
const live = (i: Item) => i.status !== "archivé";

/** Éléments rattachés à une étape, module par module. */
export function stageItems(p: Project, stageId: string) {
  const of = (module: string) => p.items.filter((i) => i.module === module && live(i) && i.stageId === stageId).sort((a, b) => a.order - b.order);
  const shots = of("shots");
  const shotIds = new Set(shots.map((s) => s.id));
  const referenceIds = new Set(shots.map((s) => String(s.referenceId ?? "")).filter(Boolean));
  return {
    shots,
    poses: of("poses"),
    // Une transition appartient à l'étape si elle y est rattachée ou relie deux de ses plans.
    transitions: p.items
      .filter((i) => i.module === "transitions" && live(i) && (i.stageId === stageId || shotIds.has(String(i.fromId)) || shotIds.has(String(i.toId))))
      .sort((a, b) => a.order - b.order),
    references: p.items
      .filter((i) => i.module === "inspirations" && live(i) && (i.stageId === stageId || referenceIds.has(i.id)))
      .sort((a, b) => a.order - b.order),
    lights: of("lighting"),
    audio: of("audio"),
    drone: of("drone"),
    gear: of("equipment"),
    tasks: of("checklists"),
    reminders: of("reminders"),
    notes: of("notes"),
  };
}
export type StageItems = ReturnType<typeof stageItems>;

export interface StageStats {
  shots: Count;
  video: Count;
  photo: Count;
  drone: Count;
  essentials: Count;
  bonus: Count;
  poses: Count;
  transitions: number;
  references: number;
  lights: number;
  tasks: Count;
  /** Plans pas encore tournés (sautés compris : ils manquent au film). */
  remaining: number;
  percent: number;
}

export function stageStats(items: StageItems): StageStats {
  const { shots } = items;
  const shotsCount = count(shots);
  return {
    shots: shotsCount,
    video: count(shots.filter(isVideoShot)),
    photo: count(shots.filter(isPhotoShot)),
    // Les missions drone du module dédié comptent avec les plans drone de l'étape.
    drone: count([...shots.filter(isDroneShot), ...items.drone]),
    essentials: count(shots.filter((s) => s.priority === "MUST HAVE")),
    bonus: count(shots.filter((s) => s.priority === "BONUS")),
    poses: count(items.poses),
    transitions: items.transitions.length,
    references: items.references.length,
    lights: items.lights.length,
    tasks: count(items.tasks),
    remaining: shotsCount.total - shotsCount.done,
    percent: shotsCount.total ? Math.round((shotsCount.done / shotsCount.total) * 100) : 0,
  };
}

/**
 * Titre d'un plan créé depuis un fichier : le nom parlant du fichier (« robe-dentelle.jpg » →
 * « Robe dentelle »), sinon un titre numéroté quand le nom vient de l'appareil (IMG_2034, DSC…).
 */
export function titleFromFile(name: string, fallback: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  // Préfixes d'appareils (IMG_2034, DSC0098…) ; noms d'applis seulement suivis d'une date ou d'un
  // numéro (« Photo 2026-09-22 », « WhatsApp Image 2026… ») — « photo-lourde » reste un vrai nom.
  const machine =
    /^(img|dsc|dscf|dscn|pxl|mvimg|vid|mov|gopr|gx|dji|mvi|_mg|p\d{3,})([\s_-]|\d|$)/i.test(base) ||
    /^(screenshot|capture d.écran|capture|photo|image|whatsapp|signal|snapchat|received)[\s_-]*(image|video|vidéo)?[\s_-]*[\d(]/i.test(base) ||
    /^[\d\s_\-.]+$/.test(base) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(base);
  if (!base || machine) return fallback;
  const words = base.replace(/[_\-.+]+/g, " ").replace(/\s+/g, " ").trim();
  return words.charAt(0).toLocaleUpperCase("fr") + words.slice(1);
}
