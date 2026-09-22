import { useState } from "react";
import { Images, Plus, Search } from "lucide-react";
import type { Item } from "../types";
import { makeItem } from "../model";
import { useProject } from "../store";
import { Empty, Screen, useMedia } from "../ui";
import { ItemEditor, itemsOf, mediaFor, MediaCard, nextOrder, QuickView } from "./common";

/** Galerie d'inspirations : catégories, vidéos jouables d'un tap, transformation en plan. */
export default function Inspirations() {
  const { project: p, addItems } = useProject();
  const [category, setCategory] = useState("Toutes");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewing, setViewing] = useState<Item | null>(null);
  const media = useMedia(p.id);
  const all = itemsOf(p, "inspirations");
  const categories = ["Toutes", ...new Set(all.map((i) => String(i.category || "Sans catégorie")))];
  const items = all.filter(
    (i) => (category === "Toutes" || String(i.category || "Sans catégorie") === category) && (i.title + " " + i.tags + " " + i.notes).toLowerCase().includes(query.toLowerCase()),
  );
  const withVideo = all.filter((i) => mediaFor(media, i)?.type.startsWith("video/")).length;
  const add = () => setEditing(makeItem("inspirations", "", { order: nextOrder(p, "inspirations"), category: category === "Toutes" ? undefined : category }));
  const transform = (i: Item) => {
    const ref = mediaFor(media, i);
    addItems(
      [
        makeItem("shots", i.title, {
          referenceId: i.id,
          framing: i.framing,
          clipIn: ref?.type.startsWith("video/") ? i.clipIn : undefined,
          clipOut: ref?.type.startsWith("video/") ? i.clipOut : undefined,
          notes: i.intention ? String(i.intention) : i.notes,
          order: 0,
        }),
      ],
      "Plan créé, lié à cette inspiration",
    );
  };
  return (
    <Screen
      title="Inspirations"
      backTo="/tournage"
      actions={
        <button className="icon-btn gold" aria-label="Ajouter une inspiration" onClick={add}>
          <Plus size={20} />
        </button>
      }
    >
      <p className="muted" style={{ marginBottom: 12 }}>
        {all.length} référence{all.length > 1 ? "s" : ""} · {withVideo} vidéo{withVideo > 1 ? "s" : ""} — appuyez sur une vignette pour la voir en grand.
      </p>
      <div className="search">
        <Search size={16} />
        <input placeholder="Rechercher une inspiration…" aria-label="Rechercher" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="choices" style={{ marginBottom: 14 }}>
        {categories.map((c) => (
          <button key={c} type="button" className={"choice" + (category === c ? " on" : "")} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      {items.length ? (
        <div className="insp-grid">
          {items.map((i) => (
            <MediaCard
              key={i.id}
              item={i}
              thumb={mediaFor(media, i)}
              subtitle={String(i.category || "")}
              icon={<Images size={26} />}
              onView={() => setViewing(i)}
              onEdit={() => setEditing(i)}
            />
          ))}
        </div>
      ) : (
        <Empty
          icon={<Images size={32} />}
          title={all.length ? "Aucun résultat" : "Votre moodboard commence ici"}
          text="Importez des photos et vidéos de référence : elles restent disponibles hors ligne, même le jour J."
          action={
            <button className="btn gold" onClick={add}>
              <Plus size={17} /> Ajouter une inspiration
            </button>
          }
        />
      )}
      <div className="fab-bar">
        <button className="btn gold full" onClick={add}>
          <Plus size={18} /> Ajouter une inspiration
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
          onTransform={() => transform(viewing)}
        />
      )}
      {editing && (
        <ItemEditor
          item={editing}
          onClose={() => setEditing(null)}
          extra={
            itemsOf(p, "inspirations").some((i) => i.id === editing.id) && !itemsOf(p, "shots").some((s) => s.referenceId === editing.id) ? (
              <button
                type="button"
                className="btn full"
                onClick={() => {
                  transform(editing);
                  setEditing(null);
                }}
              >
                Transformer en plan
              </button>
            ) : undefined
          }
        />
      )}
    </Screen>
  );
}
