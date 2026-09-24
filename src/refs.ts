import type { Item, Project } from "./types";
import { makeItem } from "./model";

/**
 * Références du couple : plans issus d'une vidéo choisie par les mariés (découpée plan par plan dans DaVinci Resolve).
 * Chaque plan devient une « tâche » à réaliser le jour J, avec statut, priorité, responsable et alternative.
 * Ils vivent dans le module « inspirations » avec refSource = "couple" et n'apparaissent jamais dans les
 * inspirations générales (elles-mêmes séparées : refSource = "library").
 */
export const REF_STATUSES = [
  ["à faire", "À faire"],
  ["prévu", "Prévu"],
  ["en cours", "En cours"],
  ["fait", "Fait"],
  ["à refaire", "À refaire"],
  ["impossible", "Impossible"],
  ["non nécessaire", "Non nécessaire"],
] as const;
export const REF_PRIORITIES = [
  ["MUST HAVE", "Must Have"],
  ["IMPORTANT", "Important"],
  ["BONUS", "Bonus"],
  ["OPTIONAL", "Optionnel"],
] as const;
export const REF_STAGES = ["Préparatifs mariée", "Préparatifs marié", "Cérémonie religieuse", "Couple & portraits", "Réception", "Détails", "Lieu & drone", "Effets & transitions"];
export const REF_STYLES = ["Fast Cut", "Cinematic", "Emotional", "Documentary", "Slow Motion", "Montage Sequence"];
export const REF_INTENSITIES = ["calme", "émotionnel", "montée progressive", "énergique", "très rapide", "climax"];

export const isCoupleRef = (i: Item) => i.module === "inspirations" && i.refSource === "couple" && i.status !== "archivé";
export const refsOf = (p: Project) => p.items.filter(isCoupleRef).sort((a, b) => a.order - b.order);

export interface RefClip {
  code: string;
  index: number;
  title: string;
  timeline_item_id?: string;
  source_timeline?: string;
  source_file?: string;
  source_video?: string;
  source_in_s?: number;
  source_out_s?: number;
  source_in?: string;
  source_out?: string;
  timeline_start_frame?: number;
  timeline_end_frame?: number;
  duration_s?: number;
  clip: string;
  thumbnail?: string;
  stage: string;
  category: string;
  subject?: string;
  description?: string;
  movement?: string;
  framing?: string;
  effect?: string;
  drone?: boolean;
  priority: string;
  tags?: string;
  analysis_confidence?: string;
}
export interface RefManifest {
  source: string;
  project?: string;
  timeline: string;
  type: "couple_reference" | "inspiration_library";
  clips: RefClip[];
}
export function isRefManifest(value: unknown): value is RefManifest {
  const m = value as RefManifest;
  return !!m && typeof m === "object" && (m.type === "couple_reference" || m.type === "inspiration_library") && Array.isArray(m.clips) && m.clips.every((c) => c && typeof c.code === "string" && typeof c.clip === "string");
}

const stageRules: [string, RegExp][] = [
  ["Préparatifs mariée", /d[ée]couverte de la robe|mise en beaut[ée]|pr[ée]paratifs/i],
  ["Préparatifs marié", /arriv[ée]e du mari[ée]|loge/i],
  ["Cérémonie religieuse", /b[ée]n[ée]diction|c[ée]r[ée]monie/i],
  ["Couple & portraits", /shooting|couple|portrait/i],
  ["Réception", /premi[èe]re entr[ée]e|entr[ée]e/i],
];
/** Étape du déroulé du tournage qui correspond à l'étape de la référence (sinon aucune : elle reste classée par étape de référence). */
export function stageIdFor(p: Project, clip: Pick<RefClip, "stage" | "category">): string | undefined {
  const stages = p.items.filter((i) => i.module === "stages" && i.status !== "archivé").sort((a, b) => a.order - b.order);
  let re = stageRules.find(([name]) => name === clip.stage)?.[1];
  if (clip.stage === "Réception" && /danse|ouverture|champagne|musique|animation|dj|ambiance/i.test(clip.category)) re = /ambiance et danse|danse/i;
  if (clip.stage === "Réception" && /entr[ée]e/i.test(clip.category)) re = /premi[èe]re entr[ée]e/i;
  return re ? stages.find((s) => re!.test(s.title))?.id : undefined;
}

export interface RefPlan {
  items: { item: Item; file: string }[];
  alreadyThere: number;
  missingFiles: number;
}
export function planRefImport(p: Project, manifest: RefManifest, available: Set<string>): RefPlan {
  const source = manifest.type === "couple_reference" ? "couple" : "library";
  const known = new Set(p.items.map((i) => String(i.packKey ?? "")).filter(Boolean));
  const base = p.items.filter((i) => i.module === "inspirations").length;
  const items: RefPlan["items"] = [];
  let alreadyThere = 0;
  let missingFiles = 0;
  for (const clip of manifest.clips) {
    const packKey = `${source}:${manifest.timeline}:${clip.code}`;
    if (known.has(packKey)) {
      alreadyThere++;
      continue;
    }
    const name = clip.clip.split("/").pop()!;
    if (!available.has(name)) {
      missingFiles++;
      continue;
    }
    const skip = clip.priority === "OPTIONAL" && /noir|carton|flash/i.test(clip.effect ?? "");
    items.push({
      file: name,
      item: makeItem("inspirations", clip.title, {
        order: base + items.length,
        refSource: source,
        refCode: clip.code,
        refStage: clip.stage,
        packKey,
        category: clip.category,
        subject: clip.subject ?? "",
        stageId: stageIdFor(p, clip) ?? "",
        framing: clip.framing && clip.framing !== "À confirmer" ? clip.framing : "",
        movement: clip.movement ?? "À confirmer",
        effect: clip.effect ?? "",
        drone: clip.drone === true,
        tags: clip.tags ?? "",
        priority: clip.priority,
        status: skip ? "non nécessaire" : "à faire",
        notes: clip.description ?? "",
        confidence: clip.analysis_confidence ?? "à confirmer",
        refVideo: clip.source_video ?? "",
        refFile: clip.source_file ?? "",
        srcIn: clip.source_in ?? "",
        srcOut: clip.source_out ?? "",
        srcInS: clip.source_in_s ?? 0,
        srcOutS: clip.source_out_s ?? 0,
        tlItemId: clip.timeline_item_id ?? "",
        tlStart: clip.timeline_start_frame ?? 0,
        tlEnd: clip.timeline_end_frame ?? 0,
        dur: clip.duration_s ?? 0,
      }),
    });
  }
  return { items, alreadyThere, missingFiles };
}

export interface Progress {
  total: number;
  done: number;
  pct: number;
  by: Record<string, number>;
  mustLeft: Item[];
}
/** Avancement d'un ensemble de références. « Non nécessaire » sort du total. */
export function refProgress(items: Item[]): Progress {
  const by: Record<string, number> = {};
  for (const i of items) by[String(i.status)] = (by[String(i.status)] ?? 0) + 1;
  const live = items.filter((i) => i.status !== "non nécessaire");
  const done = live.filter((i) => i.status === "fait").length;
  const mustLeft = live.filter((i) => i.priority === "MUST HAVE" && i.status !== "fait" && i.status !== "impossible");
  return { total: live.length, done, pct: live.length ? Math.round((done / live.length) * 100) : 0, by, mustLeft };
}

export interface ActivityEntry {
  t: string;
  who: string;
  text: string;
  itemId?: string;
}
