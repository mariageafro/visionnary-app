// Frise d'une étape : ses plans découpés en moments, avec un horaire estimé que l'on peut corriger,
// un état et les essentiels manquants — on ouvre « Préparatifs » et on sait où en est chaque côté.
import type { Item, Project } from "./types";
import { done, momentLabel, orderSections, sectionOf, sideOf, type Side } from "./model";
import { minutesOf, stagesOf } from "./schedule";

/** Temps de tournage d'un plan quand rien n'est précisé, en minutes. */
export const DEFAULT_SHOT_MINUTES = 3;
export const sides: Side[] = ["mariée", "marié"];

export function shotMinutes(shot: Item) {
  const value = Number(shot.shootMinutes);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SHOT_MINUTES;
}

/** « HH:MM » → minutes depuis minuit ; null si l'heure est absente ou invalide. */
export function toMinutes(time: unknown): number | null {
  const hit = /^(\d{2}):(\d{2})$/.exec(String(time ?? ""));
  if (!hit) return null;
  const [h, m] = [Number(hit[1]), Number(hit[2])];
  return h < 24 && m < 60 ? h * 60 + m : null;
}
/** Minutes depuis minuit → « HH:MM » (après minuit, on repart de 00:00). */
export function toClock(minutes: number) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export const momentKey = (stageId: string, section: string) => `${stageId}|${section}`;

export interface Moment {
  key: string;
  section: string;
  /** Nom affiché dans la piste (sans « Mariée · »). */
  label: string;
  side?: Side;
  shots: Item[];
  /** Temps de tournage cumulé des plans. */
  minutes: number;
  /** Début retenu, en minutes depuis minuit ; null si ni l'étape ni le moment n'ont d'horaire. */
  start: number | null;
  /** Début calculé (fin du moment précédent), celui qu'on retrouve en effaçant la saisie. */
  estimated: number | null;
  /** Horaire saisi à la main : les moments suivants s'enchaînent depuis celui-ci. */
  manual: boolean;
}
export interface Track {
  side?: Side;
  moments: Moment[];
  start: number | null;
  end: number | null;
  minutes: number;
  /** Minutes au-delà de la fin de l'étape (0 si la piste tient dans l'étape). */
  overflow: number;
}
export interface Frise {
  stageStart: number | null;
  stageEnd: number | null;
  /** Moments communs avant les deux côtés (ex. le lieu), puis pistes parallèles, puis moments communs. */
  before?: Track;
  sides: Track[];
  after?: Track;
}

type Draft = Omit<Moment, "start" | "estimated" | "manual">;

function chain(drafts: Draft[], from: number | null, manual: Record<string, string>, stageEnd: number | null, side?: Side): Track {
  let cursor = from;
  const moments = drafts.map((draft): Moment => {
    const typed = toMinutes(manual[draft.key]);
    const estimated = cursor;
    const start = typed ?? estimated;
    cursor = start === null ? null : start + draft.minutes;
    return { ...draft, start, estimated, manual: typed !== null };
  });
  const timed = moments.filter((m) => m.start !== null);
  const start = timed.length ? Math.min(...timed.map((m) => m.start!)) : null;
  const end = timed.length ? Math.max(...timed.map((m) => m.start! + m.minutes)) : null;
  return {
    side,
    moments,
    start,
    end,
    minutes: moments.reduce((n, m) => n + m.minutes, 0),
    overflow: end !== null && stageEnd !== null ? Math.max(0, end - stageEnd) : 0,
  };
}

const latest = (tracks: Track[]) => {
  const ends = tracks.map((t) => t.end).filter((e): e is number => e !== null);
  return ends.length ? Math.max(...ends) : null;
};

/**
 * Découpe les plans d'une étape en moments (un par chapitre, dans l'ordre du film).
 * Chaque moment démarre à la fin du précédent de sa piste — 3 min par plan sauf temps précisé —
 * et un horaire saisi à la main (`project.moments`) remplace l'estimation, la suite s'enchaînant
 * depuis lui. Côté mariée et côté marié avancent en parallèle.
 */
export function stageFrise(p: Project, stage: Item, shots: Item[]): Frise {
  const stageStart = toMinutes(stage.time);
  const stageEnd = stageStart === null ? null : stageStart + minutesOf(stage);
  const manual = p.moments ?? {};
  const groups = new Map<string, Item[]>();
  for (const shot of shots) {
    const section = sectionOf(shot);
    groups.set(section, [...(groups.get(section) ?? []), shot]);
  }
  const drafts = orderSections(groups.keys()).map((section): Draft => {
    const list = groups.get(section)!;
    return {
      key: momentKey(stage.id, section),
      section,
      label: momentLabel(section),
      side: sideOf(section),
      shots: list,
      minutes: list.reduce((n, s) => n + shotMinutes(s), 0),
    };
  });
  const firstSide = drafts.findIndex((d) => d.side);
  const common = (list: Draft[]) => list.filter((d) => !d.side);
  const beforeList = firstSide < 0 ? drafts : common(drafts.slice(0, firstSide));
  const afterList = firstSide < 0 ? [] : common(drafts.slice(firstSide));
  const before = beforeList.length ? chain(beforeList, stageStart, manual, stageEnd) : undefined;
  const sidesStart = before ? before.end : stageStart;
  const parallel = sides
    .map((side) => drafts.filter((d) => d.side === side))
    .filter((list) => list.length)
    .map((list) => chain(list, sidesStart, manual, stageEnd, list[0].side));
  const after = afterList.length ? chain(afterList, parallel.length ? latest(parallel) : sidesStart, manual, stageEnd) : undefined;
  return { stageStart, stageEnd, before, sides: parallel, after };
}

export interface MomentState {
  label: "à faire" | "en cours" | "fait";
  done: number;
  total: number;
  /** Plans MUST HAVE pas encore tournés — un essentiel sauté reste manquant. */
  missing: Item[];
}

const skipped = (i: Item) => ["sauté", "impossible"].includes(i.status);

/** Fait quand chaque plan est tourné ou écarté ; en cours dès qu'un plan a bougé. */
export function momentState(shots: Item[]): MomentState {
  const handled = shots.filter((i) => done(i) || skipped(i)).length;
  const started = handled > 0 || shots.some((i) => ["en cours", "à refaire"].includes(i.status));
  return {
    label: shots.length && handled === shots.length ? "fait" : started ? "en cours" : "à faire",
    done: shots.filter(done).length,
    total: shots.length,
    missing: shots.filter((i) => i.priority === "MUST HAVE" && !done(i)),
  };
}

/** Moments d'une frise dans l'ordre chronologique : les deux côtés s'entrecroisent selon leur horaire. */
export function friseMoments(frise: Frise): Moment[] {
  const parallel = frise.sides
    .flatMap((track, t) => track.moments.map((moment, n) => ({ moment, t, n })))
    .sort((a, b) => (a.moment.start ?? Infinity) - (b.moment.start ?? Infinity) || a.n - b.n || a.t - b.t)
    .map((x) => x.moment);
  return [...(frise.before?.moments ?? []), ...parallel, ...(frise.after?.moments ?? [])];
}

/**
 * Plans dans l'ordre de la journée : étapes du déroulé, puis moments de chaque frise, puis
 * ordre de la shot-list. Les plans sans étape suivent, rangés par chapitre du film.
 */
export function dayOrder(p: Project, shots: Item[]): Item[] {
  const ordered: Item[] = [];
  const placed = new Set<string>();
  for (const stage of stagesOf(p)) {
    const own = shots.filter((s) => s.stageId === stage.id);
    if (!own.length) continue;
    for (const moment of friseMoments(stageFrise(p, stage, own)))
      for (const shot of moment.shots) {
        ordered.push(shot);
        placed.add(shot.id);
      }
  }
  const rest = shots.filter((s) => !placed.has(s.id));
  const rank = new Map(orderSections(rest.map(sectionOf)).map((section, n) => [section, n]));
  return [...ordered, ...rest.map((shot, n) => ({ shot, n })).sort((a, b) => rank.get(sectionOf(a.shot))! - rank.get(sectionOf(b.shot))! || a.n - b.n).map((x) => x.shot)];
}

/**
 * Pack individuel d'un cadreur : ses seuls plans, dans l'ordre réel de sa journée —
 * base du récapitulatif imprimable « Mes plans » (un membre ne voit que ce qui le concerne).
 */
export function operatorDayOrder(p: Project, operatorId: string): Item[] {
  const shots = p.items.filter((i) => i.module === "shots" && i.operatorId === operatorId && i.status !== "archivé");
  return dayOrder(p, shots);
}

/** Repère horaire local uniquement : ne change jamais le statut réel des plans. */
export function isMomentNow(moment: Moment, projectDate: string, now: Date): boolean {
  if (moment.start === null || !/^\d{4}-\d{2}-\d{2}$/.test(projectDate)) return false;
  const start = new Date(`${projectDate}T00:00:00`);
  if (!Number.isFinite(start.getTime())) return false;
  start.setMinutes(moment.start);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + moment.minutes);
  return now.getTime() >= start.getTime() && now.getTime() < end.getTime();
}
