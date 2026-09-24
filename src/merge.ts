import type { Item, MediaEntry } from "./types";

/**
 * Séries d'angles : une pose (ou un plan) peut regrouper les photos et vidéos d'autres éléments comme
 * ses angles. Rien n'est copié ni déplacé : la cible garde la liste des éléments regroupés (`includes`),
 * ceux-ci sont masqués (`mergedInto`), donc tout s'annule avec l'historique habituel et se sépare à tout moment.
 */
const list = (value: unknown) => String(value ?? "").split(",").filter(Boolean);

/** Identifiants dont les médias forment la série d'un élément : lui-même et tous les éléments regroupés. */
export const angleOwners = (item: Item) => [item.id, ...list(item.includes)];

/** Fichiers d'une série, la couverture d'abord. */
export function seriesMedia(media: MediaEntry[], item: Item): MediaEntry[] {
  const owners = new Set(angleOwners(item));
  const own = media.filter((m) => owners.has(m.itemId) && !m.unsupported && /^(image|video)\//.test(m.type));
  const order = list(item.angleOrder);
  if (order.length) {
    const rank = (m: MediaEntry) => (order.includes(m.id) ? order.indexOf(m.id) : order.length);
    return [...own].sort((a, b) => rank(a) - rank(b));
  }
  return [...own].sort((a, b) => Number(b.id === item.coverId) - Number(a.id === item.coverId));
}

/** Angles validés (pris) par le photographe ou le vidéaste, parmi ceux de la série. */
export const doneAngles = (item: Item) => new Set(list(item.anglesDone));

/**
 * Regroupe `sourceIds` dans `targetId` : leurs médias deviennent des angles de la cible, ils disparaissent
 * de la liste. Une série regroupée entraîne ses propres angles. Renvoie les éléments mis à jour, ou null
 * si rien à faire.
 */
export function mergeIntoSeries(items: Item[], targetId: string, sourceIds: string[]): Item[] | null {
  const target = items.find((i) => i.id === targetId);
  const sources = items.filter((i) => sourceIds.includes(i.id) && i.id !== targetId && i.module === target?.module && !i.mergedInto);
  if (!target || !sources.length) return null;
  const included = new Set(list(target.includes));
  for (const source of sources) {
    included.add(source.id);
    list(source.includes).forEach((id) => included.add(id));
  }
  const moved = new Set(sources.map((s) => s.id));
  return items.map((item) => {
    if (item.id === targetId) return { ...item, includes: [...included].join(",") };
    if (moved.has(item.id)) return { ...item, mergedInto: targetId, status: "archivé", includes: "" };
    return item;
  });
}

/** Détache un élément d'une série : il redevient une pose ou un plan à part entière. */
export function detachFromSeries(items: Item[], targetId: string, ownerId: string): Item[] {
  const target = items.find((i) => i.id === targetId);
  if (!target || ownerId === targetId) return items;
  const remaining = list(target.includes).filter((id) => id !== ownerId);
  return items.map((item) => {
    if (item.id === targetId) return { ...item, includes: remaining.join(","), anglesDone: list(item.anglesDone).join(",") };
    if (item.id === ownerId) return { ...item, mergedInto: "", status: "prévu" };
    return item;
  });
}

/** Coche ou décoche un angle ; la série est « faite » quand tous ses angles sont pris. */
export function toggleAngle(item: Item, mediaId: string, total: number): Item {
  const done = doneAngles(item);
  if (done.has(mediaId)) done.delete(mediaId);
  else done.add(mediaId);
  const complete = total > 0 && done.size >= total;
  return { ...item, anglesDone: [...done].join(","), ...(complete ? { status: "terminé" } : item.status === "terminé" ? { status: "prévu" } : {}) };
}

/** Défait des séries : chaque élément regroupé ressort et redevient une pose ou un plan à part entière. */
export function dissolveSeries(items: Item[], targetIds: string[]): Item[] {
  const targets = new Set(targetIds);
  const released = new Set(items.filter((i) => targets.has(i.id)).flatMap((i) => list(i.includes)));
  if (!released.size) return items;
  return items.map((item) => {
    if (targets.has(item.id)) return { ...item, includes: "", anglesDone: "", angleOrder: "" };
    if (released.has(item.id) && targets.has(String(item.mergedInto))) return { ...item, mergedInto: "", status: "prévu" };
    return item;
  });
}
