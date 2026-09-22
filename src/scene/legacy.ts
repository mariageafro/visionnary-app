// Ancien plan multicam (Placement[] en pixels) → plan de scène en mètres. L'ancien plan n'est
// jamais effacé : la conversion crée un nouveau plan à côté.
import type { Item, Placement, Project } from "../types";
import type { SceneElement, ScenePlan } from "./types";
import { makeLight, makePerson, newPlan, uid } from "./ops";
import { sceneLength } from "./motion";

/** L'ancienne toile faisait 900 × 560 px : 900 px ≈ 30 m. */
const M = 30 / 900;
const focalOf = (value: string) => {
  const n = parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 4 ? n : 35;
};

export function legacyPlan(p: Project): ScenePlan | null {
  if (!p.placements?.length) return null;
  const team = p.items.filter((i): i is Item => i.module === "team");
  const byName = (name: string) => team.find((m) => m.title.trim().toLowerCase() === name.trim().toLowerCase())?.id;
  const plan = newPlan("Ancien plan multicam", { width: 30, height: (560 / 900) * 30 });
  let camIndex = 0;
  plan.elements = p.placements.map((pl: Placement): SceneElement => {
    const at = { x: pl.x * M, y: pl.y * M };
    const moved = Math.hypot(pl.endX - pl.x, pl.endY - pl.y) > 2;
    const motion = moved ? { type: pl.type === "camera" ? "custom" : "walk", start: 0, duration: Math.max(1, pl.duration || 8), path: [{ x: pl.endX * M, y: pl.endY * M }] } : undefined;
    if (pl.type === "camera") {
      const tag = "CAM " + String.fromCharCode(65 + (camIndex++ % 26));
      return {
        id: uid(),
        kind: "camera",
        name: pl.label || tag,
        tag,
        x: at.x,
        y: at.y,
        rotation: pl.angle,
        layer: "cameras",
        sensor: "ff",
        focal: focalOf(pl.focal),
        height: 1.5,
        support: "trepied",
        ...(pl.operatorId || byName(pl.operator) ? { operatorId: pl.operatorId || byName(pl.operator) } : {}),
        ...(pl.framing ? { framing: pl.framing } : {}),
        ...(motion ? { motion } : {}),
      };
    }
    if (pl.type === "light") return makeLight("led", at, { name: pl.label || "Lumière", rotation: pl.angle });
    if (pl.type === "mic") return { id: uid(), kind: "audio", name: pl.label || "Micro", asset: "micro", x: at.x, y: at.y, rotation: pl.angle, layer: "audio" };
    return makePerson("invite", at, { name: pl.label || "Sujet", rotation: pl.angle, ...(motion ? { motion } : {}) });
  });
  plan.duration = sceneLength(plan.elements);
  return plan;
}
