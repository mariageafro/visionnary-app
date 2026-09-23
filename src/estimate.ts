import type { Item } from "./types";

export type EstimateStyle = "calme" | "équilibré" | "dynamique" | "fast cut" | "personnalisé";
const styleFactor: Record<EstimateStyle, number> = {
  calme: 0.78,
  équilibré: 1,
  dynamique: 1.35,
  "fast cut": 1.9,
  personnalisé: 1,
};
export interface SectionEstimate {
  section: string;
  minimum: number;
  target: number;
  comfort: number;
  planned: number;
  shootMinutes: number | null;
  availableMinutes: number | null;
  state: "confortable" | "serré" | "critique" | "à renseigner";
  distribution: Record<string, number>;
}
const buckets = ["Lieu", "Détails", "Large", "Moyen", "Gros plan", "Action", "Réaction", "B-roll", "Transition", "Sécurité"];
const finitePositive = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;

export function estimateSections(shots: Item[], options: {
  filmMinutes: number;
  averageCutSeconds: number;
  style: EstimateStyle;
  marginPercent: number;
  bRollPercent: number;
  multicam?: boolean;
  availableByStage?: Record<string, number>;
}): SectionEstimate[] {
  const filmSeconds = finitePositive(options.filmMinutes) * 60;
  const average = Math.max(1, finitePositive(options.averageCutSeconds) || 4);
  const margin = Math.max(0, Math.min(300, Number(options.marginPercent) || 0)) / 100;
  const factor = styleFactor[options.style] ?? 1;
  const bRoll = Math.max(0, Math.min(80, Number(options.bRollPercent) || 0));
  const groups = new Map<string, Item[]>();
  for (const shot of shots.filter((item) => item.status !== "archivé")) {
    const key = String(shot.section || "Autres plans");
    groups.set(key, [...(groups.get(key) ?? []), shot]);
  }
  if (!groups.size || !filmSeconds) return [];
  const weighted = [...groups].map(([section, list]) => {
    const weight = list.reduce((sum, shot) => sum + (shot.priority === "MUST HAVE" ? 2.5 : shot.priority === "IMPORTANT" ? 1.5 : 1), 0);
    return { section, list, weight };
  });
  const totalWeight = weighted.reduce((sum, group) => sum + group.weight, 0);
  const recommendedTotal = Math.ceil((filmSeconds / average) * factor * (1 + margin));
  return weighted.map(({ section, list, weight }) => {
    const target = Math.max(1, Math.round(recommendedTotal * weight / totalWeight));
    const minimum = Math.max(1, Math.floor(target * 0.7));
    const comfort = Math.ceil(target * 1.35);
    const shootMinutes = list.reduce((sum, shot) => sum + finitePositive(shot.shootMinutes), 0);
    const explicitTimes = list.some((shot) => finitePositive(shot.shootMinutes));
    const stageIds = [...new Set(list.map((shot) => String(shot.stageId || "")).filter(Boolean))];
    const availableValues = stageIds.map((id) => finitePositive(options.availableByStage?.[id])).filter(Boolean);
    const availableMinutes = availableValues.length ? Math.min(...availableValues) : null;
    const ratio = availableMinutes && explicitTimes ? shootMinutes / availableMinutes : null;
    const state = ratio === null ? "à renseigner" : ratio > 1 ? "critique" : ratio > 0.8 ? "serré" : "confortable";
    const planned = list.length;
    const categories: Record<string, number> = Object.fromEntries(buckets.map((bucket) => [bucket, 0]));
    const reserve = Math.round(target * bRoll / 100);
    categories["B-roll"] = reserve;
    const rest = Math.max(0, target - reserve);
    const split: [string, number][] = options.multicam
      ? [["Lieu", 0.07], ["Détails", 0.1], ["Large", 0.2], ["Moyen", 0.1], ["Gros plan", 0.1], ["Action", 0.15], ["Réaction", 0.18], ["Transition", 0.03], ["Sécurité", 0.07]]
      : [["Lieu", 0.08], ["Détails", 0.14], ["Large", 0.12], ["Moyen", 0.14], ["Gros plan", 0.12], ["Action", 0.2], ["Réaction", 0.1], ["Transition", 0.06], ["Sécurité", 0.04]];
    for (const [name, share] of split) categories[name] = Math.round(rest * share);
    return { section, minimum, target, comfort, planned, shootMinutes: explicitTimes ? shootMinutes : null, availableMinutes, state, distribution: categories };
  });
}

export function estimateTotal(filmMinutes: number, averageCutSeconds: number, style: EstimateStyle, marginPercent: number) {
  const factors = styleFactor;
  const filmSeconds = finitePositive(filmMinutes) * 60;
  const average = Math.max(1, finitePositive(averageCutSeconds) || 4);
  const margin = Math.max(0, Math.min(300, Number(marginPercent) || 0)) / 100;
  return filmSeconds ? Math.ceil(filmSeconds / average * (factors[style] ?? 1) * (1 + margin)) : 0;
}
