import type { Item } from "./types";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");

/** Tous les mots doivent être présents, sans imposer leur ordre ni les accents. */
export function matchesShotSearch(shot: Item, query: string, items: Item[]): boolean {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const related = items.filter((item) => item.id === shot.stageId || item.id === shot.operatorId).map((item) => item.title);
  const text = normalize([shot.title, shot.notes, shot.subject, shot.section, shot.framing, shot.focal, shot.movement, shot.camera, ...related].filter(Boolean).join(" "));
  return words.every((word) => text.includes(word));
}
