import { useState } from "react";
import { Camera, Clapperboard, Copy, History, Lightbulb, Map as MapIcon, Plus, Trash2, Users } from "lucide-react";
import type { ScenePlan } from "./types";
import { sceneTemplates } from "./templates";
import { clonePlan, newPlan } from "./ops";
import { legacyPlan } from "./legacy";
import { useScenePlans } from "./store";
import { useProject } from "../store";
import { Empty, Screen, Sheet, navigate } from "../ui";
import { itemsOf, titleOf } from "../screens/common";
import "./scene.css";

/** Résumé d'un plan : ce qu'il contient, lisible sur une carte. */
export function planSummary(plan: ScenePlan) {
  const count = (kind: string) => plan.elements.filter((e) => e.kind === kind).length;
  const guests = plan.elements.filter((e) => e.kind === "crowd").reduce((n, e) => n + (e.count ?? 0), 0);
  return { cameras: count("camera") + count("drone"), people: count("person") + guests, lights: count("light"), animated: plan.elements.filter((e) => e.motion && e.motion.type !== "static").length };
}

/** Choisir un preset (ou partir d'un plan vierge) pour une étape. */
export function TemplatePicker({ stageId, onClose }: { stageId?: string; onClose: () => void }) {
  const { project: p } = useProject();
  const { plans, save } = useScenePlans();
  const stage = stageId ? p.items.find((i) => i.id === stageId) : undefined;
  const create = (plan: ScenePlan) => {
    // Le plan prend le nom de l'étape (« Cérémonie religieuse », puis « Cérémonie religieuse · plan 2 ») ;
    // sans étape, celui du preset.
    const others = plans.filter((s) => stageId && s.stageId === stageId).length;
    const name = stage ? stage.title + (others ? ` · plan ${others + 1}` : "") : plan.name;
    const next = { ...plan, stageId, venueId: stage?.venueId ? String(stage.venueId) : undefined, name };
    save(next, "Plan de scène créé");
    onClose();
    navigate("/scene/" + next.id);
  };
  return (
    <Sheet title="Nouveau plan de scène" onClose={onClose}>
      <div className="sd-templates">
        {sceneTemplates.map((t) => {
          const built = t.build();
          const s = planSummary(built);
          return (
            <button key={t.id} type="button" className="sd-template" onClick={() => create(clonePlan(built))}>
              <strong>{t.name}</strong>
              <small>{t.description}</small>
              <span className="sd-template-meta">
                <Camera size={13} /> {s.cameras} · <Users size={13} /> {s.people} · <Lightbulb size={13} /> {s.lights} · {s.animated} mouvement{s.animated > 1 ? "s" : ""}
              </span>
            </button>
          );
        })}
        <button type="button" className="sd-template blank" onClick={() => create(newPlan("Plan vierge"))}>
          <strong>Plan vierge</strong>
          <small>Construire le lieu de zéro : murs, portes, allée, mobilier, personnes, caméras.</small>
        </button>
      </div>
    </Sheet>
  );
}

/** Tous les plans de scène du tournage, et la reprise de l'ancien plan multicam. */
export default function ScenesList() {
  const { project: p } = useProject();
  const { plans, save, remove } = useScenePlans();
  const [picking, setPicking] = useState(false);
  const legacy = legacyPlan(p);
  const stages = itemsOf(p, "stages");
  return (
    <Screen
      title="Plans de scène"
      backTo="/tournage"
      actions={
        <button className="icon-btn gold" aria-label="Nouveau plan de scène" onClick={() => setPicking(true)}>
          <Plus size={20} />
        </button>
      }
    >
      <p className="muted" style={{ marginBottom: 14 }}>
        Le lieu vu du dessus : personnes, caméras et leur champ de vision, lumières, mouvements animés. Un plan par étape (cérémonie, salle, chambre…).
      </p>
      {legacy && !plans.some((s) => s.name === "Ancien plan multicam") && (
        <div className="notice" style={{ marginBottom: 14 }}>
          <History size={18} />
          <span>Votre ancien plan multicam ({p.placements.length} éléments) peut devenir un plan de scène complet. L’ancien plan reste intact.</span>
          <button className="btn small gold" onClick={() => save(legacy, "Ancien plan converti en plan de scène")}>
            Convertir
          </button>
          <button className="btn small" onClick={() => navigate("/scenes/ancien")}>
            Voir l’ancien
          </button>
        </div>
      )}
      {plans.length ? (
        <div className="sd-plans">
          {plans.map((plan) => {
            const s = planSummary(plan);
            return (
              <div key={plan.id} className="sd-plan-card">
                <button type="button" className="sd-plan-open" onClick={() => navigate("/scene/" + plan.id)}>
                  <MapIcon size={22} />
                  <span>
                    <strong>{plan.name}</strong>
                    <small>{plan.stageId ? titleOf(p, plan.stageId) ?? "Étape supprimée" : "Sans étape"}</small>
                    <small>
                      {s.cameras} caméra{s.cameras > 1 ? "s" : ""} · {s.people} personne{s.people > 1 ? "s" : ""} · {s.lights} lumière{s.lights > 1 ? "s" : ""} · {s.animated} mouvement{s.animated > 1 ? "s" : ""}
                    </small>
                  </span>
                </button>
                <div className="btn-row">
                  <select
                    aria-label={"Étape de " + plan.name}
                    value={plan.stageId ?? ""}
                    onChange={(e) => save({ ...plan, stageId: e.target.value || undefined }, "Étape du plan modifiée")}
                  >
                    <option value="">Sans étape</option>
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.title}
                      </option>
                    ))}
                  </select>
                  <button className="icon-btn" aria-label={"Dupliquer " + plan.name} onClick={() => save({ ...clonePlan(plan, new Map(), true), name: plan.name + " (copie)" }, "Plan dupliqué")}>
                    <Copy size={17} />
                  </button>
                  <button
                    className="icon-btn danger"
                    aria-label={"Supprimer " + plan.name}
                    onClick={() => {
                      if (confirm(`Supprimer le plan « ${plan.name} » ?`)) remove(plan.id, "Plan supprimé");
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          icon={<Clapperboard size={32} />}
          title="Aucun plan de scène"
          text="Partez d’un preset (cérémonie 4 caméras, salle, flashmob, chambre, first look) puis ajustez-le à votre lieu."
          action={
            <button className="btn gold" onClick={() => setPicking(true)}>
              <Plus size={17} /> Créer un plan de scène
            </button>
          }
        />
      )}
      {picking && <TemplatePicker onClose={() => setPicking(false)} />}
    </Screen>
  );
}
