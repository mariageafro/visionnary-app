import { useState, type ReactNode } from "react";
import { Camera, Grid2X2, GripVertical, Heart, List as ListIcon, MapPin, Plus, Search } from "lucide-react";
import type { Item, ModuleId } from "../types";
import { done, makeItem, moduleById } from "../model";
import { useProject } from "../store";
import { reorderOnDrop, usePointerReorder } from "../reorder";
import { Empty, Row, Screen, Tabs, useMedia } from "../ui";
import { ItemEditor, itemsOf, mediaFor, MediaCard, nextOrder, QuickView, titleOf } from "./common";

// « shots » et « inspirations » ont leur propre écran (Shots.tsx, Inspirations.tsx) : plus riche,
// groupé par chapitre / catégorie. Cet écran générique reste pour les autres galeries.
const gridModules = new Set(["poses", "venues"]);
const gridIcon: Record<string, ReactNode> = {
  poses: <Heart size={26} />,
  venues: <MapPin size={26} />,
};
const subtitleFor = (i: Item) => (i.module === "venues" ? String(i.address ?? "") : String(i.category ?? i.framing ?? ""));

/** Écran générique : couvre tous les modules qui n'ont pas d'écran dédié (matériel, lieux, audio…). */
export default function ModuleScreen({ moduleId }: { moduleId: string }) {
  const { project: p, update } = useProject();
  const m = moduleById(moduleId)!;
  const [filter, setFilter] = useState<"all" | "todo" | "must" | "done">("all");
  const [query, setQuery] = useState("");
  const isGrid = gridModules.has(moduleId);
  const [layout, setLayout] = useState<"list" | "grid">(isGrid ? "grid" : "list");
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewing, setViewing] = useState<Item | null>(null);
  const media = useMedia(p.id);
  const all = itemsOf(p, moduleId as ModuleId, true);
  const items = all.filter(
    (i) =>
      (filter === "all" ? i.status !== "archivé" : filter === "todo" ? !done(i) && i.status !== "archivé" : filter === "must" ? i.priority === "MUST HAVE" : done(i)) &&
      (i.title + " " + i.notes).toLowerCase().includes(query.toLowerCase()),
  );
  const dragItem = usePointerReorder({
    onDropTile: (draggedId, targetId) => {
      const result = reorderOnDrop(items, draggedId, targetId);
      if (result) update({ ...p, items: p.items.map((entry) => (result.orders.has(entry.id) ? { ...entry, order: result.orders.get(entry.id)! } : entry)) }, "Ordre modifié");
    },
  });
  const grip = (i: Item) => <span className="shot-card-grip" role="button" tabIndex={0} title={`Glisser « ${i.title || "élément"} » pour changer sa place`} onPointerDown={(event) => dragItem(event, i.id)}><GripVertical size={13} /> Déplacer</span>;
  const add = () => setEditing(makeItem(m.id, "", { order: nextOrder(p, m.id) }));
  return (
    <Screen
      title={m.label}
      backTo="/tournage"
      actions={
        <button className="icon-btn gold" aria-label={"Ajouter · " + m.label} onClick={add}>
          <Plus size={20} />
        </button>
      }
    >
      <p className="muted" style={{ marginBottom: 12 }}>
        {m.subtitle}
      </p>
      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          ["all", "Tous", all.filter((i) => i.status !== "archivé").length],
          ["todo", "À faire"],
          ["must", "Essentiels"],
          ["done", "Faits"],
        ]}
      />
      <div className="search" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div className="search" style={{ flex: 1, margin: 0 }}>
          <Search size={16} />
          <input placeholder="Rechercher…" aria-label="Rechercher" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {isGrid && (
          <button className="icon-btn" aria-label={layout === "grid" ? "Vue liste" : "Vue grille"} onClick={() => setLayout(layout === "grid" ? "list" : "grid")}>
            {layout === "grid" ? <ListIcon size={18} /> : <Grid2X2 size={18} />}
          </button>
        )}
      </div>
      {items.length ? (
        layout === "grid" ? (
          <div className="insp-grid">
            {items.map((i) => (
              <div key={i.id} className="shot-draggable" data-reorder={i.id}>
              {grip(i)}
              <MediaCard
                item={i}
                thumb={mediaFor(media, i)}
                subtitle={subtitleFor(i)}
                icon={gridIcon[moduleId] ?? <Camera size={26} />}
                onView={() => setViewing(i)}
                onEdit={() => setEditing(i)}
              />
              </div>
            ))}
          </div>
        ) : (
          <div className="list">
            {items.map((i) => (
              <div key={i.id} className="shot-draggable" data-reorder={i.id}>
              {grip(i)}
              <Row
                done={done(i)}
                title={i.title || "Sans titre"}
                sub={[i.category, i.role, i.address, i.model, titleOf(p, i.operatorId), titleOf(p, i.stageId), i.notes].filter(Boolean).join(" · ") || undefined}
                trail={i.priority === "MUST HAVE" ? <span className="chip red">MUST</span> : i.status !== "prévu" ? <span className="chip outline">{i.status}</span> : undefined}
                onClick={() => setEditing(i)}
              />
              </div>
            ))}
          </div>
        )
      ) : (
        <Empty
          title={all.length ? "Aucun résultat" : `Aucun élément pour l’instant`}
          text="Ajoutez le premier élément."
          action={
            <button className="btn gold" onClick={add}>
              <Plus size={17} /> Ajouter
            </button>
          }
        />
      )}
      <div className="fab-bar">
        <button className="btn gold full" onClick={add}>
          <Plus size={18} /> Ajouter {m.id === "shots" ? "un plan" : "un élément"}
        </button>
      </div>
      {viewing && (
        <QuickView
          item={viewing}
          media={media}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      )}
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </Screen>
  );
}
