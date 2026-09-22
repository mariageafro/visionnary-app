import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { Item } from "../types";
import { done, makeItem, standardChecklists } from "../model";
import { withOrder } from "../features";
import { useProject } from "../store";
import { CheckBox, Empty, Screen, Tabs } from "../ui";
import { ItemEditor, itemsOf, QuickAdd, titleOf } from "./common";

type Phase = "avant" | "jourj" | "apres";
const phaseOf = (i: Item) => (["avant", "jourj", "apres"].includes(String(i.phase)) ? (i.phase as Phase) : "avant");

export default function Checklist() {
  const { project: p, update, patchItem } = useProject();
  const [phase, setPhase] = useState<Phase>(() => (p.date === new Date().toISOString().slice(0, 10) ? "jourj" : "avant"));
  const [editing, setEditing] = useState<Item | null>(null);
  const all = itemsOf(p, "checklists");
  const items = all.filter((i) => phaseOf(i) === phase);
  const sections = [...new Set(items.map((i) => String(i.category || "Divers")))];
  const count = (ph: Phase) => {
    const list = all.filter((i) => phaseOf(i) === ph);
    return list.filter((i) => !done(i)).length;
  };
  const setMany = (list: Item[], status: string) => {
    const ids = new Set(list.map((i) => i.id));
    update({ ...p, items: p.items.map((i) => (ids.has(i.id) ? { ...i, status } : i)) });
  };
  return (
    <Screen title="Checklist" backTo="/accueil">
      <Tabs
        value={phase}
        onChange={setPhase}
        options={[
          ["avant", "Avant", count("avant")],
          ["jourj", "Jour J", count("jourj")],
          ["apres", "Après", count("apres")],
        ]}
      />
      {items.length > 0 && (
        <div className="progress dark" style={{ marginBottom: 14 }}>
          <span style={{ width: `${(items.filter(done).length / items.length) * 100}%` }} />
        </div>
      )}
      <div className="stack">
        {sections.map((section) => {
          const list = items.filter((i) => String(i.category || "Divers") === section);
          const allDone = list.every(done);
          return (
            <div className="list" key={section}>
              <div className="list-head">
                {section}
                <button onClick={() => setMany(list, allDone ? "prévu" : "terminé")}>{allDone ? "Tout décocher" : "Tout cocher"}</button>
              </div>
              {list.map((i) => (
                <div key={i.id} className={"row" + (done(i) ? " is-done" : "")}>
                  <CheckBox on={done(i)} label={i.title} onToggle={() => patchItem(i.id, { status: done(i) ? "prévu" : "terminé" })} />
                  <button className="row-main" style={{ textAlign: "left" }} onClick={() => patchItem(i.id, { status: done(i) ? "prévu" : "terminé" })}>
                    <strong>{i.title}</strong>
                    {(i.operatorId || i.stageId) && <small>{[titleOf(p, i.operatorId), titleOf(p, i.stageId)].filter(Boolean).join(" · ")}</small>}
                  </button>
                  <button className="icon-btn" aria-label={"Modifier " + i.title} onClick={() => setEditing(i)}>
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        {!items.length && (
          <Empty
            title="Rien pour ce moment"
            text="Ajoutez vos propres tâches ou chargez la checklist standard (matériel, audio, tournage, fin de journée)."
            action={
              !all.length && (
                <button className="btn gold" onClick={() => update({ ...p, items: [...p.items, ...withOrder(standardChecklists(), p.items)] }, "Checklist standard ajoutée")}>
                  Charger la checklist standard
                </button>
              )
            }
          />
        )}
        <div className="list">
          <QuickAdd
            placeholder={`Ajouter une tâche « ${phase === "avant" ? "Avant" : phase === "jourj" ? "Jour J" : "Après"} »`}
            onAdd={(title) =>
              update(
                { ...p, items: [...p.items, ...withOrder([makeItem("checklists", title, { phase, category: sections.at(-1) ?? "Divers" })], p.items)] },
                "Tâche ajoutée",
              )
            }
          />
        </div>
        {phase === "apres" && items.length > 0 && items.every(done) && <p className="script" style={{ textAlign: "center" }}>On n’oublie rien, on fait les choses bien !</p>}
      </div>
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </Screen>
  );
}
