import { useState } from "react";
import type { Item } from "../types";
import { makeItem } from "../model";
import { useProject } from "../store";
import { Empty, Screen, Tabs } from "../ui";
import { ItemEditor, itemsOf, nextOrder, QuickAdd } from "./common";

export default function Notes() {
  const { project: p, update } = useProject();
  const [tab, setTab] = useState<"all" | "Note" | "Idée" | "Inspiration">("all");
  const [editing, setEditing] = useState<Item | null>(null);
  const all = itemsOf(p, "notes");
  const items = tab === "all" ? all : all.filter((i) => i.category === tab);
  return (
    <Screen title="Notes & idées" backTo="/tournage">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ["all", "Toutes", all.length],
          ["Note", "Notes"],
          ["Idée", "Idées"],
          ["Inspiration", "Inspirations"],
        ]}
      />
      <div className="list" style={{ marginBottom: 14 }}>
        <QuickAdd
          placeholder="Écrire une note ou une idée…"
          onAdd={(title) => update({ ...p, items: [...p.items, makeItem("notes", title, { category: tab === "all" ? "Note" : tab, order: nextOrder(p, "notes") })] }, "Note ajoutée")}
        />
      </div>
      {items.length ? (
        <div className="list">
          {items.map((n) => (
            <button key={n.id} className="row" onClick={() => setEditing(n)} style={{ textAlign: "left" }}>
              <span className="row-main">
                <strong>{n.title}</strong>
                <small>
                  {n.category}
                  {n.notes ? " · " + n.notes : ""}
                  {n.tags ? " · " + n.tags : ""}
                </small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Empty title="Aucune note" text="Notez une intuition avant de l’oublier : elle sera là au prochain repérage." />
      )}
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </Screen>
  );
}
