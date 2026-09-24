import type { Item, MediaEntry } from "./types";
import { doneAngles, hiddenAngles, seriesMedia } from "./merge";
import { done } from "./model";

export interface Progress {
  /** Prises prévues (une par angle visible ; une pose ou un plan seul compte pour une prise). */
  total: number;
  taken: number;
  pct: number;
  /** Éléments qui ont encore au moins une prise à faire. */
  pending: Item[];
  /** Nombre d'éléments (poses ou plans) au total et terminés (tous leurs angles pris). */
  items: { total: number; done: number };
  /** Angles restant à prendre par élément non terminé. */
  left: Map<string, { taken: number; total: number }>;
}

/**
 * Avancement d'un ensemble de poses ou de plans. Les éléments masqués, archivés ou regroupés ne comptent pas,
 * ni les angles masqués : ils sortent du nombre de prises prévues.
 */
export function progressOf(items: Item[], media: MediaEntry[]): Progress {
  let total = 0;
  let taken = 0;
  const pending: Item[] = [];
  const left = new Map<string, { taken: number; total: number }>();
  let itemTotal = 0;
  let itemDone = 0;
  for (const item of items) {
    if (item.status === "archivé" || item.mergedInto) continue;
    const angles = seriesMedia(media, item).length;
    let t: number;
    let d: number;
    if (angles > 1) {
      const visible = new Set(seriesMedia(media, item).map((m) => m.id));
      t = angles;
      d = [...doneAngles(item)].filter((id) => visible.has(id) && !hiddenAngles(item).has(id)).length;
      if (done(item) && d < t) d = t;
    } else {
      t = 1;
      d = done(item) ? 1 : 0;
    }
    total += t;
    taken += d;
    itemTotal++;
    if (d >= t) itemDone++;
    else {
      pending.push(item);
      left.set(item.id, { taken: d, total: t });
    }
  }
  return { total, taken, pct: total ? Math.round((taken / total) * 100) : 0, pending, items: { total: itemTotal, done: itemDone }, left };
}
