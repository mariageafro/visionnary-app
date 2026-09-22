// Accès aux plans de scène du tournage actif : lecture, enregistrement (annulable), suppression.
import type { ScenePlan } from "./types";
import { useProject } from "../store";

export function useScenePlans() {
  const { project: p, update } = useProject();
  const plans = p.scenePlans ?? [];
  const save = (next: ScenePlan, message?: string) =>
    update({ ...p, scenePlans: plans.some((s) => s.id === next.id) ? plans.map((s) => (s.id === next.id ? next : s)) : [...plans, next] }, message);
  const remove = (id: string, message?: string) => update({ ...p, scenePlans: plans.filter((s) => s.id !== id) }, message);
  return { plans, save, remove };
}
