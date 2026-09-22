// Prises d'un plan : stockées en JSON dans le champ `takesLog` (les éléments n'acceptent que des valeurs simples).
import type { Item } from "../types";
import { mediaFor } from "./common";

export const takeFlags = ["OK", "Favorite", "Focus", "Son", "Cadrage", "À refaire"] as const;
export type TakeFlag = (typeof takeFlags)[number];
export interface Take {
  n: number;
  flags: TakeFlag[];
  at: string;
}

export function readTakes(item: Item): Take[] {
  try {
    const value = JSON.parse(String(item.takesLog ?? "[]"));
    return Array.isArray(value) ? value.filter((t) => Number.isFinite(t?.n) && Array.isArray(t?.flags)) : [];
  } catch {
    return [];
  }
}
export const writeTakes = (takes: Take[]) => JSON.stringify(takes);

export function addTake(item: Item): Partial<Item> {
  const takes = readTakes(item);
  const n = (takes.at(-1)?.n ?? 0) + 1;
  return { takesLog: writeTakes([...takes, { n, flags: ["OK"], at: new Date().toISOString() }]) };
}
export function toggleFlag(item: Item, n: number, flag: TakeFlag): Partial<Item> {
  return {
    takesLog: writeTakes(
      readTakes(item).map((t) => (t.n === n ? { ...t, flags: t.flags.includes(flag) ? t.flags.filter((f) => f !== flag) : [...t.flags, flag] } : t)),
    ),
  };
}

/** Référence à montrer pour un plan : ses propres médias, puis le clip source, puis l'inspiration liée. */
export const referenceFor = mediaFor;
