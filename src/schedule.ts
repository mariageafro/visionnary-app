// Suivi réel de la journée : écarts, alertes et recalcul proposé (jamais appliqué sans validation).
import type { Item, Project } from "./types";
import { parseGps, sunTimes, type SunTimes } from "./sun";

export const stagesOf = (p: Project) =>
  p.items.filter((i) => i.module === "stages" && i.status !== "archivé").sort((a, b) => a.order - b.order);

/** Jour du tournage (ou aujourd'hui si la date n'est pas renseignée). */
export function shootDay(p: Project, now = new Date()) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return p.date;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function atTime(day: string, time: unknown): number | null {
  if (!/^\d{2}:\d{2}$/.test(String(time ?? ""))) return null;
  const value = Date.parse(`${day}T${time}:00`);
  return Number.isFinite(value) ? value : null;
}

export const minutesOf = (item: Item, fallback = 30) => {
  const value = Number(item.duration);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export interface StageRun {
  item: Item;
  plannedStart: number | null;
  plannedEnd: number | null;
  startedAt: number | null;
  endedAt: number | null;
  /** Écart au démarrage en minutes (positif = retard). */
  startDelay: number | null;
  state: "à venir" | "en cours" | "terminée";
}

const localDay = (ms: number) => shootDay({ date: "" } as Project, new Date(ms));

export function runStages(p: Project): StageRun[] {
  const stages = stagesOf(p);
  // Dès qu'une étape a démarré, les horaires sont lus sur ce jour-là : une répétition
  // faite un autre jour que le mariage reste cohérente, et le jour J rien ne change.
  const firstStart = stages.map((i) => Date.parse(String(i.startedAt ?? ""))).find(Number.isFinite);
  const day = firstStart !== undefined ? localDay(firstStart) : shootDay(p);
  return stages.map((item) => {
    const plannedStart = atTime(day, item.time);
    const plannedEnd = plannedStart === null ? null : plannedStart + minutesOf(item) * 60000;
    const startedAt = item.startedAt ? Date.parse(String(item.startedAt)) : null;
    const endedAt = item.endedAt ? Date.parse(String(item.endedAt)) : null;
    return {
      item,
      plannedStart,
      plannedEnd,
      startedAt,
      endedAt,
      startDelay: startedAt !== null && plannedStart !== null ? Math.round((startedAt - plannedStart) / 60000) : null,
      state: endedAt !== null ? "terminée" : startedAt !== null ? "en cours" : "à venir",
    };
  });
}

/**
 * Retard courant de la journée en minutes (négatif = avance).
 * Se base sur la dernière étape démarrée : écart de départ, puis dépassement éventuel de sa durée.
 */
export function currentDelay(runs: StageRun[], now = Date.now()): number {
  const started = runs.filter((r) => r.startedAt !== null && r.plannedStart !== null);
  const last = started.at(-1);
  if (!last) {
    // Rien n'a démarré : retard si la première étape planifiée est déjà passée.
    const first = runs.find((r) => r.plannedStart !== null);
    return first && now > first.plannedStart! ? Math.floor((now - first.plannedStart!) / 60000) : 0;
  }
  const duration = minutesOf(last.item) * 60000;
  const expectedEnd = last.startedAt! + duration;
  const end = last.endedAt ?? Math.max(now, expectedEnd);
  const actualEndDelay = Math.round((end - last.plannedStart! - duration) / 60000);
  return last.endedAt !== null || now > expectedEnd ? actualEndDelay : last.startDelay!;
}

export interface Reschedule {
  item: Item;
  from: string;
  to: string;
}

const clock = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Propose de décaler les étapes non démarrées. Ne modifie rien : l'appelant fait valider. */
export function proposeReschedule(runs: StageRun[], delay: number): Reschedule[] {
  if (!delay) return [];
  return runs
    .filter((r) => r.state === "à venir" && r.plannedStart !== null)
    .map((r) => ({ item: r.item, from: String(r.item.time), to: clock(r.plannedStart! + delay * 60000) }));
}

export function applyReschedule(p: Project, changes: Reschedule[]): Project {
  const byId = new Map(changes.map((c) => [c.item.id, c]));
  return {
    ...p,
    items: p.items.map((i) => {
      const change = byId.get(i.id);
      if (!change) return i;
      // L'horaire d'origine est conservé une seule fois pour pouvoir le comparer après coup.
      return { ...i, time: change.to, originalTime: i.originalTime ?? change.from };
    }),
  };
}

export interface Conflict {
  operator: Item;
  a: Item;
  b: Item;
}

/** Même responsable affecté à deux étapes qui se chevauchent. */
export function operatorConflicts(p: Project): Conflict[] {
  const day = shootDay(p);
  const team = new Map(p.items.filter((i) => i.module === "team").map((i) => [i.id, i]));
  const slots = p.items
    .filter((i) => ["stages", "interviews", "briefings", "prewedding"].includes(i.module) && i.status !== "archivé")
    .map((item) => {
      const start = atTime(day, item.time);
      return { item, start, end: start === null ? null : start + minutesOf(item, 15) * 60000 };
    })
    .filter((s) => s.start !== null && s.item.operatorId && team.has(String(s.item.operatorId)));
  const conflicts: Conflict[] = [];
  for (let x = 0; x < slots.length; x++)
    for (let y = x + 1; y < slots.length; y++) {
      const a = slots[x],
        b = slots[y];
      if (a.item.operatorId !== b.item.operatorId) continue;
      if (a.start! < b.end! && b.start! < a.end!)
        conflicts.push({ operator: team.get(String(a.item.operatorId))!, a: a.item, b: b.item });
    }
  return conflicts;
}

/** Premier lieu doté de coordonnées GPS valides : sert au calcul solaire du tournage. */
export function projectSun(p: Project): { venue: Item; gps: { lat: number; lng: number }; times: SunTimes } | null {
  for (const venue of p.items.filter((i) => i.module === "venues")) {
    const gps = parseGps(venue.gps);
    if (gps) return { venue, gps, times: sunTimes(shootDay(p), gps.lat, gps.lng) };
  }
  return null;
}
