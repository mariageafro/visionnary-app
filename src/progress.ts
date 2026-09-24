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
}

/**
 * Avancement d'un ensemble de poses ou de plans. Les éléments masqués, archivés ou regroupés ne comptent pas,
 * ni les angles masqués : ils sortent du nombre de prises prévues.
 */
export function progressOf(items: Item[], media: MediaEntry[]): Progress {
  let total = 0;
  let taken = 0;
  const pending: Item[] = [];
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
    if (d < t) pending.push(item);
  }
  return { total, taken, pct: total ? Math.round((taken / total) * 100) : 0, pending };
}
