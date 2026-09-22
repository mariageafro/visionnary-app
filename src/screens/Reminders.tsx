import AlertSettings from "../AlertControls";
import { useState } from "react";
import { Bell, Link2, Plus, Undo2 } from "lucide-react";
import type { Item } from "../types";
import { done, makeItem } from "../model";
import { useProject } from "../store";
import { chainTemplates, dueReminders, inverseReminder, makeChain } from "../reminders";
import { hhmm } from "../sun";
import { CheckBox, Empty, Screen, Sheet, Tabs } from "../ui";
import { ItemEditor, itemsOf, nextOrder } from "./common";
import { withOrder } from "../features";

export default function Reminders() {
  const { project: p, update, patchItem } = useProject();
  const [tab, setTab] = useState<"all" | "next" | "done">("next");
  const [editing, setEditing] = useState<Item | null>(null);
  const [chain, setChain] = useState(false);
  const now = Date.now();
  const all = dueReminders(p);
  const shown = all.filter((r) => (tab === "done" ? done(r.item) : tab === "next" ? !done(r.item) && r.active : true));
  return (
    <Screen
      title="Rappels intelligents"
      backTo="/accueil"
      actions={
        <button className="icon-btn gold" aria-label="Créer une chaîne de rappels" onClick={() => setChain(true)}>
          <Link2 size={19} />
        </button>
      }
    >
      <AlertSettings/>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ["all", "Tous", all.length],
          ["next", "À venir", all.filter((r) => !done(r.item) && r.active).length],
          ["done", "Terminés", all.filter((r) => done(r.item)).length],
        ]}
      />
      <div className="list">
        {shown.map((r) => {
          const late = r.due !== null && r.due <= now && !done(r.item);
          return (
            <div key={r.item.id} className={"row" + (done(r.item) ? " is-done" : "")}>
              <Bell size={22} color={late ? "var(--red)" : done(r.item) ? "var(--ink-2)" : "var(--gold-2)"} />
              <button className="row-main" style={{ textAlign: "left" }} onClick={() => setEditing(r.item)}>
                <strong>
                  {r.due ? hhmm(new Date(r.due)) : "—:—"} · {r.item.title}
                </strong>
                <small>
                  {r.reason}
                  {r.item.chainStep ? ` · chaîne étape ${r.item.chainStep}` : ""}
                </small>
              </button>
              {!done(r.item) && !/^récupérer/i.test(r.item.title) && !p.items.some((i) => i.chainId && i.chainId === (r.item.chainId || r.item.id) && i.id !== r.item.id && /^récupérer|^retirer/i.test(i.title)) && (
                <button
                  className="icon-btn"
                  aria-label={"Créer le rappel de récupération pour " + r.item.title}
                  title="Rappel inverse"
                  onClick={() => {
                    const inverse = inverseReminder(r.item, nextOrder(p, "reminders"));
                    update(
                      { ...p, items: [...p.items.map((i) => (i.id === r.item.id && !i.chainId ? { ...i, chainId: i.id, chainStep: 1 } : i)), inverse] },
                      `Ajouté : ${inverse.title}`,
                    );
                  }}
                >
                  <Undo2 size={17} />
                </button>
              )}
              <CheckBox on={done(r.item)} label={r.item.title} onToggle={() => patchItem(r.item.id, { status: done(r.item) ? "prévu" : "terminé" })} />
            </div>
          );
        })}
        {!shown.length && <Empty title={tab === "done" ? "Aucun rappel terminé" : "Aucun rappel"} text="Les rappels suivent le déroulé réel : s’il prend du retard, ils se décalent aussi." />}
      </div>
      <div className="fab-bar">
        <button className="btn gold full" onClick={() => setEditing(makeItem("reminders", "", { trigger: "before-start", offset: 15, order: nextOrder(p, "reminders") }))}>
          <Plus size={18} /> Ajouter un rappel
        </button>
      </div>
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
      {chain && <ChainSheet onClose={() => setChain(false)} />}
    </Screen>
  );
}

function ChainSheet({ onClose }: { onClose: () => void }) {
  const { project: p, update } = useProject();
  const stages = itemsOf(p, "stages");
  const [subject, setSubject] = useState("micro marié");
  const [stage, setStage] = useState(stages[0]?.id ?? "");
  const [template, setTemplate] = useState<keyof typeof chainTemplates>("pair");
  const preview = chainTemplates[template].steps.map((s) => `${s.verb} ${subject}`);
  return (
    <Sheet title="Chaîne de rappels" onClose={onClose}>
      <div className="stack">
        <p className="muted">Préparer → exécuter → vérifier → récupérer → sécuriser : chaque étape se cale sur l’heure réelle de l’étape choisie.</p>
        <label className="field">
          Quoi ?
          <input list="chain-subjects" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <datalist id="chain-subjects">
            {["micro marié", "micro mariée", "micro officiant", "enregistreur DJ", "drone", "lumières", "rushs", "cartes mémoire"].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="field">
          Pendant quelle étape ?
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {String(s.time || "—")} · {s.title}
              </option>
            ))}
          </select>
        </label>
        <div className="choices">
          {Object.entries(chainTemplates).map(([id, t]) => (
            <button key={id} type="button" className={"choice" + (template === id ? " on" : "")} onClick={() => setTemplate(id as keyof typeof chainTemplates)}>
              {t.label}
            </button>
          ))}
        </div>
        <ol className="muted">
          {preview.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        <button
          className="btn gold full"
          disabled={!stage || !subject.trim()}
          onClick={() => {
            update({ ...p, items: [...p.items, ...withOrder(makeChain(subject.trim(), stage, template, 0), p.items)] }, `${preview.length} rappels créés`);
            onClose();
          }}
        >
          Créer la chaîne
        </button>
      </div>
    </Sheet>
  );
}
