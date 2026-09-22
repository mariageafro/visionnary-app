import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import type { Item } from "../types";
import { legacySections, orderSections, sectionOf } from "../model";
import { proposeMoments } from "../shotlist";
import { useProject } from "../store";
import { Sheet } from "../ui";

/**
 * Anciens préparatifs (un seul bloc « Préparatifs mariée / marié ») : propose de ranger chaque plan
 * dans son moment. Aperçu avant validation, rien d'autre ne change, et « Annuler » reste possible.
 */
export default function MomentSplit({ shots }: { shots: Item[] }) {
  const { project: p, update, notify } = useProject();
  const [open, setOpen] = useState(false);
  const legacy = shots.filter((s) => legacySections[sectionOf(s)]);
  const proposals = proposeMoments(legacy);
  // Un plan non reconnu reste visible dans son ancien chapitre : pas de bandeau pour lui seul.
  if (!proposals.length) return null;
  const target = new Map(proposals.map((x) => [x.item.id, x.section]));
  const kept = legacy.filter((s) => !target.has(s.id));
  const groups = orderSections(proposals.map((x) => x.section));
  function apply() {
    update({ ...p, items: p.items.map((i) => (target.has(i.id) ? { ...i, section: target.get(i.id)! } : i)) });
    notify(`${target.size} plans rangés en ${groups.length} moments`, true);
    setOpen(false);
  }
  return (
    <>
      <div className="notice" style={{ marginTop: 14 }}>
        <Sparkles size={18} />
        <span>
          {proposals.length > 1 ? `${proposals.length} plans` : "1 plan"} des préparatifs {proposals.length > 1 ? "sont rangés" : "est rangé"} en
          un seul bloc par côté (ancienne shot-list). Rangez-les par moment : détails, maquillage, seul·e, avec ses proches,
          habillage.
        </span>
        <button className="btn small gold" onClick={() => setOpen(true)}>
          Voir
        </button>
      </div>
      {open && (
        <Sheet title="Ranger par moment" onClose={() => setOpen(false)}>
          <p className="muted">
            Chaque plan rejoint le moment reconnu d’après son titre. Statut, références et opérateur ne changent pas.
          </p>
          <div className="split-groups">
            {groups.map((section) => (
              <section key={section}>
                <strong>{section}</strong>
                <ul>
                  {proposals
                    .filter((x) => x.section === section)
                    .map((x) => (
                      <li key={x.item.id}>{x.item.title}</li>
                    ))}
                </ul>
              </section>
            ))}
            {kept.length > 0 && (
              <section>
                <strong>Restent dans leur ancien chapitre</strong>
                <ul>
                  {kept.map((s) => (
                    <li key={s.id}>{s.title}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <div className="form-actions">
            <button className="btn" onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button className="btn gold" onClick={apply}>
              <Check size={16} /> Ranger les {target.size} plans
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
