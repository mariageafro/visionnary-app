// Aide discrète à la continuité : signale deux plans consécutifs dont la direction s'inverse.
import type { Item, Project } from "./types";

const opposite: Record<string, string> = {
  "Gauche → droite": "Droite → gauche",
  "Droite → gauche": "Gauche → droite",
  "Vers la caméra": "S’éloigne",
  "S’éloigne": "Vers la caméra",
};

export interface ContinuityWarning {
  a: Item;
  b: Item;
  message: string;
}

export function continuityWarnings(p: Project): ContinuityWarning[] {
  const shots = p.items.filter((i) => i.module === "shots" && i.status !== "archivé").sort((a, b) => a.order - b.order);
  const warnings: ContinuityWarning[] = [];
  for (let n = 1; n < shots.length; n++) {
    const a = shots[n - 1],
      b = shots[n];
    // Seulement dans une même scène : entre deux scènes, un changement de direction est normal.
    const sameScene = (a.stageId && a.stageId === b.stageId) || (a.scene && a.scene === b.scene);
    if (!sameScene || !a.direction || !b.direction) continue;
    if (opposite[String(a.direction)] === b.direction)
      warnings.push({
        a,
        b,
        message: `« ${a.title} » (${a.direction}) puis « ${b.title} » (${b.direction}) : direction inversée, vérifiez la règle des 180° ou prévoyez un plan neutre entre les deux.`,
      });
  }
  return warnings;
}
