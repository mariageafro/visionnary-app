import { useState } from "react";
import { Images, Plus, Search, Scissors } from "lucide-react";
import type { Item } from "../types";
import { makeItem } from "../model";
import { useProject } from "../store";
import { reorderOnDrop, usePointerReorder } from "../reorder";
import { GripVertical } from "lucide-react";
import { Empty, Screen, Sheet, useMedia } from "../ui";
import { ItemEditor, itemsOf, mediaFor, MediaCard, nextOrder, QuickView } from "./common";

type Segment = { id: string; title: string; clipIn: number; clipOut: number; type: string; framing: string; movement: string; transition: string; subject: string; stageId: string; effect: string; notes: string; shotId?: string };
const segmentsOf = (item: Item): Segment[] => {
  try {
    const parsed: unknown = JSON.parse(String(item.segments || "[]"));
    return Array.isArray(parsed) ? parsed.filter((entry): entry is Segment => !!entry && typeof entry === "object" && typeof entry.id === "string") : [];
  } catch { return []; }
};

function SegmentsEditor({ item, mediaId, duration, onClose }: { item: Item; mediaId: string; duration?: number; onClose: () => void }) {
  const { project: p, update } = useProject();
  const [segments, setSegments] = useState(() => segmentsOf(item));
  const save = (next: Segment[], message = "Découpage enregistré") => {
    setSegments(next);
    update({ ...p, items: p.items.map((entry) => entry.id === item.id ? { ...entry, segments: JSON.stringify(next) } : entry) }, message);
  };
  const edit = (id: string, key: keyof Segment, value: string | number) => setSegments((current) => current.map((segment) => segment.id === id ? { ...segment, [key]: value } : segment));
  const createShot = (segment: Segment) => {
    const clipIn = Math.max(0, segment.clipIn);
    const clipOut = duration ? Math.min(duration, segment.clipOut) : segment.clipOut;
    if (!Number.isFinite(clipIn) || !Number.isFinite(clipOut) || clipOut <= clipIn) return;
    const shot = makeItem("shots", segment.title || item.title, {
      referenceId: item.id, sourceMediaId: mediaId, clipIn, clipOut,
      framing: segment.framing || undefined, segmentType: segment.type || undefined, movement: segment.movement || undefined,
      transition: segment.transition || undefined, subject: segment.subject || undefined,
      stageId: segment.stageId || undefined, effect: segment.effect || undefined, notes: segment.notes || undefined,
      order: nextOrder(p, "shots"),
    });
    const next = segments.map((entry) => entry.id === segment.id ? { ...entry, shotId: shot.id } : entry);
    setSegments(next);
    update({ ...p, items: [...p.items.map((entry) => entry.id === item.id ? { ...entry, segments: JSON.stringify(next) } : entry), shot] }, "Plan créé depuis le découpage");
  };
  const add = () => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    save([...segments, { id, title: "Segment " + (segments.length + 1), clipIn: 0, clipOut: Math.min(duration || 5, 5), type: "", framing: "", movement: "", transition: "", subject: "", stageId: String(item.stageId || ""), effect: "", notes: "" }], "Segment ajouté");
  };
  return <Sheet title={"Découpage — " + (item.title || "Inspiration")} onClose={onClose}>
    <p className="muted">Repères non destructifs : la vidéo d’origine reste intacte. Durée source : {duration ? duration.toFixed(1) + " s" : "indisponible dans ce navigateur"}.</p>
    <div className="stack">
      {segments.map((segment) => <section className="card stack" key={segment.id}>
        <div className="form-grid">
          <label className="field span">Titre<input value={segment.title} onChange={(e) => edit(segment.id, "title", e.target.value)} /></label>
          <label className="field">IN (s)<input type="number" min="0" step="0.1" value={segment.clipIn} onChange={(e) => edit(segment.id, "clipIn", Number(e.target.value))} /></label>
          <label className="field">OUT (s)<input type="number" min="0" step="0.1" max={duration} value={segment.clipOut} onChange={(e) => edit(segment.id, "clipOut", Number(e.target.value))} /></label>
          <p className="field">Durée : {Math.max(0, segment.clipOut - segment.clipIn).toFixed(1)} s</p>
          <label className="field">Type de plan<input value={segment.type} onChange={(e) => edit(segment.id, "type", e.target.value)} /></label>
          <label className="field">Cadrage<input value={segment.framing} onChange={(e) => edit(segment.id, "framing", e.target.value)} /></label>
          <label className="field">Mouvement<input value={segment.movement} onChange={(e) => edit(segment.id, "movement", e.target.value)} /></label>
          <label className="field">Transition<input value={segment.transition} onChange={(e) => edit(segment.id, "transition", e.target.value)} /></label>
          <label className="field">Sujet<input value={segment.subject} onChange={(e) => edit(segment.id, "subject", e.target.value)} /></label>
          <label className="field">Étape<select value={segment.stageId} onChange={(e) => edit(segment.id, "stageId", e.target.value)}><option value="">Sans étape</option>{itemsOf(p, "stages").map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}</select></label>
          <label className="field">Effet<input value={segment.effect} onChange={(e) => edit(segment.id, "effect", e.target.value)} /></label>
          <label className="field span">Notes<textarea value={segment.notes} onChange={(e) => edit(segment.id, "notes", e.target.value)} /></label>
        </div>
        <div className="btn-row">
          {segment.shotId ? <span className="muted">Plan créé et lié à ce segment</span> : <button className="btn gold" type="button" onClick={() => createShot(segment)}>Créer le plan à tourner depuis ce segment</button>}
          <button className="btn danger" type="button" onClick={() => save(segments.filter((entry) => entry.id !== segment.id), "Segment supprimé")}>Supprimer</button>
        </div>
      </section>)}
      <div className="btn-row"><button className="btn" type="button" onClick={add}><Plus size={16} /> Ajouter un segment</button><button className="btn gold" type="button" onClick={() => save(segments)}>Enregistrer le découpage</button></div>
    </div>
  </Sheet>;
}

/** Galerie d'inspirations : catégories, vidéos jouables d'un tap, transformation en plan. */
export default function Inspirations() {
  const { project: p, addItems, update } = useProject();
  const [category, setCategory] = useState("Toutes");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewing, setViewing] = useState<Item | null>(null);
  const [segmenting, setSegmenting] = useState<Item | null>(null);
  const media = useMedia(p.id);
  const all = itemsOf(p, "inspirations");
  const categories = ["Toutes", ...new Set(all.map((i) => String(i.category || "Sans catégorie")))];
  const items = all.filter(
    (i) => (category === "Toutes" || String(i.category || "Sans catégorie") === category) && (i.title + " " + i.tags + " " + i.notes).toLowerCase().includes(query.toLowerCase()),
  );
  const dragInspiration = usePointerReorder({
    onDropTile: (draggedId, targetId) => {
      const result = reorderOnDrop(items, draggedId, targetId);
      if (result) update({ ...p, items: p.items.map((entry) => (result.orders.has(entry.id) ? { ...entry, order: result.orders.get(entry.id)! } : entry)) }, "Ordre des inspirations modifié");
    },
  });
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
            <div key={i.id} className="stack shot-draggable" data-reorder={i.id}>
            <span className="shot-card-grip" role="button" tabIndex={0} title={`Glisser « ${i.title} » pour changer sa place`} onPointerDown={(event) => dragInspiration(event, i.id)}><GripVertical size={13} /> Déplacer</span>
            <MediaCard
              item={i}
              thumb={mediaFor(media, i)}
              subtitle={String(i.category || "")}
              icon={<Images size={26} />}
              onView={() => setViewing(i)}
              onEdit={() => setEditing(i)}
            />
            {typeof i.url === "string" && /^https:\/\/www\.instagram\.com\//.test(i.url) && <a className="btn small" href={i.url} target="_blank" rel="noreferrer">Ouvrir dans Instagram</a>}
            {mediaFor(media, i)?.type.startsWith("video/") && <button className="btn small" type="button" onClick={() => setSegmenting(i)}><Scissors size={15} /> Découper en segments</button>}
            </div>
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
      {segmenting && (() => {
        const source = mediaFor(media, segmenting);
        return source ? <SegmentsEditor item={segmenting} mediaId={source.id} duration={source.duration} onClose={() => setSegmenting(null)} /> : null;
      })()}
    </Screen>
  );
}
