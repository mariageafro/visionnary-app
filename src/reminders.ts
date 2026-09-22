// Rappels intelligents : l'heure est calculée à partir des étapes réelles, du soleil ou d'une tâche.
import type { Item, Project } from "./types";
import { done, makeItem } from "./model";
import { atTime, minutesOf, projectSun, shootDay } from "./schedule";

export const triggers = [
  ["fixed", "Heure fixe"],
  ["before-start", "X min avant le début de l’étape"],
  ["at-start", "Au début de l’étape"],
  ["at-end", "À la fin de l’étape"],
  ["after-end", "X min après la fin de l’étape"],
  ["before-sunset", "X min avant le coucher du soleil"],
  ["critical-missed", "Plan essentiel non tourné en fin d’étape"],
  ["task-done", "X min après une tâche cochée"],
] as const;
export type Trigger = (typeof triggers)[number][0];
export const triggerLabel = (t: unknown) => triggers.find(([id]) => id === t)?.[1] ?? "Heure fixe";

const parse = (value: unknown) => {
  const ms = Date.parse(String(value ?? ""));
  return Number.isFinite(ms) ? ms : null;
};

function stageWindow(p: Project, stage: Item) {
  const planned = atTime(shootDay(p), stage.time);
  const start = parse(stage.startedAt) ?? planned;
  const end = parse(stage.endedAt) ?? (start === null ? null : start + minutesOf(stage) * 60000);
  return { start, end };
}

export interface DueReminder {
  item: Item;
  due: number | null;
  /** false si la condition n'est pas remplie (ex. tous les plans essentiels sont tournés). */
  active: boolean;
  reason: string;
}

export function reminderDue(p: Project, r: Item): DueReminder {
  const trigger = (r.trigger || "fixed") as Trigger;
  const offset = Number(r.offset) || 0;
  const stage = p.items.find((i) => i.id === r.stageId && i.module === "stages");
  const result = (due: number | null, reason: string, active = true) => ({ item: r, due, active, reason });
  if (trigger === "fixed") return result(parse(r.due), "Heure fixe");
  if (trigger === "before-sunset") {
    const sunset = projectSun(p)?.times.sunset;
    return sunset
      ? result(sunset.getTime() - offset * 60000, `${offset} min avant le coucher du soleil`)
      : result(null, "Coordonnées GPS du lieu manquantes");
  }
  if (trigger === "task-done") {
    const task = p.items.find((i) => i.id === r.taskId);
    if (!task) return result(null, "Tâche à choisir");
    const doneAt = parse(task.doneAt);
    return done(task) && doneAt !== null
      ? result(doneAt + offset * 60000, `${offset} min après « ${task.title} »`)
      : result(null, `En attente : « ${task.title} »`);
  }
  if (!stage) return result(null, "Étape à choisir");
  const { start, end } = stageWindow(p, stage);
  switch (trigger) {
    case "before-start":
      return result(start === null ? null : start - offset * 60000, `${offset} min avant « ${stage.title} »`);
    case "at-start":
      return result(start, `Début de « ${stage.title} »`);
    case "at-end":
      return result(end, `Fin de « ${stage.title} »`);
    case "after-end":
      return result(end === null ? null : end + offset * 60000, `${offset} min après « ${stage.title} »`);
    case "critical-missed": {
      const missing = p.items.filter(
        (i) => i.module === "shots" && i.stageId === stage.id && i.priority === "MUST HAVE" && !done(i),
      );
      return result(
        end,
        missing.length ? `${missing.length} plan(s) essentiel(s) manquant(s) : ${missing.map((i) => i.title).join(", ")}` : "Tous les plans essentiels sont tournés",
        missing.length > 0,
      );
    }
  }
  return result(null, "Déclencheur inconnu");
}

export function dueReminders(p: Project) {
  return p.items
    .filter((i) => i.module === "reminders" && i.status !== "archivé")
    .map((r) => reminderDue(p, r))
    .sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity));
}

/** Rappels à déclencher maintenant : échus depuis moins de `window` ms, non faits, condition remplie. */
export function firingReminders(p: Project, now = Date.now(), window = 5 * 60000) {
  return dueReminders(p).filter((d) => d.active && !done(d.item) && d.due !== null && d.due <= now && d.due > now - window);
}

type Step = { verb: string; trigger: Trigger; offset: number };
export const chainTemplates: Record<string, { label: string; steps: Step[] }> = {
  full: {
    label: "Préparer → exécuter → vérifier → récupérer → sécuriser",
    steps: [
      { verb: "Préparer", trigger: "before-start", offset: 30 },
      { verb: "Installer / lancer", trigger: "before-start", offset: 10 },
      { verb: "Vérifier", trigger: "at-start", offset: 0 },
      { verb: "Récupérer", trigger: "after-end", offset: 5 },
      { verb: "Sécuriser / recharger", trigger: "after-end", offset: 30 },
    ],
  },
  pair: {
    label: "Poser → retirer",
    steps: [
      { verb: "Poser", trigger: "before-start", offset: 15 },
      { verb: "Retirer", trigger: "after-end", offset: 5 },
    ],
  },
  record: {
    label: "Brancher → écouter → récupérer",
    steps: [
      { verb: "Brancher et armer", trigger: "before-start", offset: 20 },
      { verb: "Contrôler les niveaux", trigger: "at-start", offset: 0 },
      { verb: "Récupérer", trigger: "after-end", offset: 5 },
    ],
  },
  backup: {
    label: "Lancer la sauvegarde → confirmer la seconde copie",
    steps: [
      { verb: "Lancer la sauvegarde de", trigger: "after-end", offset: 10 },
      { verb: "Confirmer la seconde copie de", trigger: "after-end", offset: 60 },
    ],
  },
};

export function makeChain(subject: string, stageId: string, template: keyof typeof chainTemplates, order: number, extra: Partial<Item> = {}) {
  const chainId = crypto.randomUUID();
  return chainTemplates[template].steps.map((step, n) =>
    makeItem("reminders", `${step.verb} ${subject}`.trim(), {
      trigger: step.trigger,
      offset: step.offset,
      stageId,
      chainId,
      chainStep: n + 1,
      category: "Chaîne",
      order: order + n,
      ...extra,
    }),
  );
}

/** Rappel inverse : récupérer ce qui a été posé, après la fin de la même étape. */
export function inverseReminder(r: Item, order: number) {
  const subject = r.title.replace(/^(poser|brancher|installer|lancer|mettre|armer)\s+/i, "");
  return makeItem("reminders", `Récupérer ${subject}`, {
    trigger: r.stageId ? "after-end" : "fixed",
    offset: 5,
    stageId: r.stageId,
    operatorId: r.operatorId,
    chainId: r.chainId || r.id,
    chainStep: Number(r.chainStep || 1) + 1,
    category: "Récupération",
    order,
  });
}
