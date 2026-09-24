import { useMemo, useState } from "react";
import { Heart, Plus, Search, Sparkles } from "lucide-react";
import type { Item } from "../types";
import { useStore } from "../store";
import { libraryOf } from "../library";
import { listMedia, putMedia } from "../storage";
import { uid, makeItem } from "../model";
import { Empty, Screen, Sheet, Thumb, useMedia } from "../ui";
import { itemsOf, mediaFor, VideoPreview } from "./common";
import { REF_PRIORITIES, REF_STAGES } from "../refs";
import "./references-couple.css";

const PAGE = 120;

/**
 * Bibliothèque d'inspiration VISIONNARY : plans classés issus d'une timeline DaVinci Resolve. Distincte des références
 * choisies par le couple. « Ajouter au mariage » copie un plan dans le tournage actif ; le retirer ensuite du tournage
 * ne touche jamais la bibliothèque.
 */
export default function InspirationLibrary() {
  const { w, project: p, update, change, notify } = useStore();
  const library = libraryOf(w);
  const media = useMedia(library?.id ?? "__aucune__");
  const all = useMemo(() => (library ? library.items.filter((i) => i.module === "inspirations" && i.refSource === "library" && i.status !== "archivé") : []), [library]);
  const [category, setCategory] = useState("");
  const [sub, setSub] = useState("");
  const [tag, setTag] = useState("");
  const [query, setQuery] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [viewing, setViewing] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [adding, setAdding] = useState<string[] | null>(null);

  const categories = useMemo(() => { const m = new Map<string, number>(); all.forEach((i) => m.set(String(i.category), (m.get(String(i.category)) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]); }, [all]);
  const subs = useMemo(() => [...new Set(all.filter((i) => !category || i.category === category).map((i) => String(i.subject)))].sort(), [all, category]);
  const q = query.trim().toLowerCase();
  const shown = all.filter((i) => (!category || i.category === category) && (!sub || i.subject === sub) && (!onlyFav || i.favorite === true) && (!tag || String(i.tags).includes(tag)) && (!q || `${i.title} ${i.category} ${i.subject} ${i.tags} ${i.refVideo}`.toLowerCase().includes(q)));
  const current = all.find((i) => i.id === viewing);

  const toggleFav = (id: string) => library && change({ ...w, projects: w.projects.map((x) => (x.id === library.id ? { ...x, items: x.items.map((i) => (i.id === id ? { ...i, favorite: i.favorite !== true } : i)) } : x)) }, "Favori modifié");
  const toggle = (id: string) => setPicked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  if (!library || !all.length) {
    return (
      <Screen title="Bibliothèque d'inspiration" backTo="/plus">
        <Empty icon={<Sparkles size={32} />} title="La bibliothèque d'inspiration est vide" text="Importez le manifeste de la timeline d'inspiration DaVinci Resolve (Fichiers & sauvegarde › Importer des références). Les plans y sont classés par catégorie." />
      </Screen>
    );
  }
  return (
    <Screen title="Bibliothèque d'inspiration VISIONNARY" backTo="/plus">
      <p className="muted">Idées supplémentaires, classées par catégorie. Elles sont distinctes des références choisies par le couple. Choisissez des plans puis « Ajouter au mariage ».</p>
      <div className="ref-stages">
        <button className={"choice" + (!category ? " on" : "")} onClick={() => { setCategory(""); setSub(""); setLimit(PAGE); }}>Tout <small>{all.length}</small></button>
        {categories.map(([name, n]) => <button key={name} className={"choice" + (category === name ? " on" : "")} onClick={() => { setCategory(name); setSub(""); setLimit(PAGE); }}>{name} <small>{n}</small></button>)}
      </div>
      <div className="ref-filters">
        <label className="ref-search"><Search size={15} /><input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} placeholder="Rechercher : robe, drone, réaction, ralenti…" /></label>
        <select value={sub} onChange={(e) => setSub(e.target.value)} aria-label="Sous-catégorie"><option value="">Toutes sous-catégories</option>{subs.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Type"><option value="">Tous types</option>{["drone", "night", "golden hour", "slow motion", "mouvement", "silhouette", "split screen", "b-roll", "making-of", "étincelles"].map((t) => <option key={t}>{t}</option>)}</select>
        <button className={"btn small" + (onlyFav ? " gold" : "")} onClick={() => setOnlyFav(!onlyFav)}><Heart size={14} /> Favoris</button>
      </div>
      {picked.length > 0 && (
        <div className="select-bar" role="status">
          <strong>{picked.length} plan{picked.length > 1 ? "s" : ""}</strong>
          <button className="btn gold" onClick={() => setAdding(picked)}><Plus size={16} /> Ajouter au mariage</button>
          <button className="btn small" onClick={() => setPicked([])}>Tout décocher</button>
        </div>
      )}
      <p className="muted">{shown.length} plan{shown.length > 1 ? "s" : ""}</p>
      <div className="ref-grid">
        {shown.slice(0, limit).map((i) => {
          const thumb = mediaFor(media, i);
          const on = picked.includes(i.id);
          return (
            <article key={i.id} className={"ref-card" + (on ? " is-on" : "")}>
              <button className="ref-media" onClick={(e) => (e.metaKey || e.ctrlKey || e.shiftKey || picked.length ? toggle(i.id) : setViewing(i.id))} aria-label={`Ouvrir ${i.title}`}>
                {thumb ? <Thumb media={thumb} className="ref-thumb" /> : <span className="ref-empty">Aperçu</span>}
                <span className="ref-prio">{String(i.subject)}</span>
                <span className={"ref-check" + (on ? " on" : "")} onClick={(e) => { e.stopPropagation(); toggle(i.id); }}>{on ? "✓" : "+"}</span>
              </button>
              <div className="ref-info"><strong>{String(i.title).replace(/^INS \d+ — /, "")}</strong><small>{String(i.refCode)} · {String(i.category)}</small></div>
              <div className="ref-quick">
                <button onClick={() => setAdding([i.id])}><Plus size={16} /> Ajouter</button>
                <button className={i.favorite === true ? "on" : ""} aria-label="Favori" onClick={() => toggleFav(i.id)}><Heart size={16} /></button>
              </div>
            </article>
          );
        })}
      </div>
      {shown.length > limit && <button className="btn full" onClick={() => setLimit(limit + PAGE)}>Afficher {Math.min(PAGE, shown.length - limit)} plans de plus</button>}

      {current && (
        <Sheet title={String(current.title)} onClose={() => setViewing("")}>
          <div className="ref-viewer">
            <div className="ref-player">{mediaFor(media, current) ? <div className="ref-video"><VideoPreview media={mediaFor(media, current)!} className="ref-video-el" loop /></div> : null}</div>
            <div className="ref-detail">
              <p className="ref-desc">{String(current.notes)}</p>
              <dl className="ref-facts"><div><dt>Catégorie</dt><dd>{String(current.category)} › {String(current.subject)}</dd></div><div><dt>Mouvement</dt><dd>{String(current.movement)}</dd></div><div><dt>Source</dt><dd>{String(current.refVideo)} · {String(current.srcIn)}</dd></div><div><dt>Analyse</dt><dd>{String(current.confidence)} — à valider</dd></div></dl>
              <button className="btn gold full" onClick={() => { setAdding([current.id]); setViewing(""); }}><Plus size={16} /> Ajouter au mariage</button>
            </div>
          </div>
        </Sheet>
      )}
      {adding && <AddSheet ids={adding} onClose={() => setAdding(null)} onDone={(n) => { setAdding(null); setPicked([]); notify(`${n} plan${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""} à « ${p?.name ?? "ce mariage"} »`); }} items={all} project={p} update={update} libraryId={library.id} />}
    </Screen>
  );
}

function AddSheet({ ids, items, project, update, libraryId, onClose, onDone }: { ids: string[]; items: Item[]; project: ReturnType<typeof useStore>["project"]; update: ReturnType<typeof useStore>["update"]; libraryId: string; onClose: () => void; onDone: (n: number) => void }) {
  const [stageId, setStageId] = useState("");
  const [refStage, setRefStage] = useState("");
  const [priority, setPriority] = useState("IMPORTANT");
  const [assignee, setAssignee] = useState("");
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState(ids.length === 1 ? String(items.find((i) => i.id === ids[0])?.title ?? "").replace(/^INS \d+ — /, "") : "");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  if (!project) return null;
  const stages = itemsOf(project, "stages");
  const team = itemsOf(project, "team");
  async function run() {
    if (!project) return;
    setBusy(true);
    try {
      const libMedia = await listMedia(libraryId);
      const base = project.items.filter((i) => i.module === "inspirations").length;
      const created: Item[] = [];
      for (const [n, id] of ids.entries()) {
        const src = items.find((i) => i.id === id);
        if (!src) continue;
        const newId = uid();
        let cover = "";
        for (const m of libMedia.filter((x) => x.itemId === src.id)) {
          const copy = { ...m, id: uid(), projectId: project.id, itemId: newId };
          await putMedia(copy);
          if (!cover) cover = copy.id;
        }
        created.push({ ...makeItem("inspirations", (title.trim() && ids.length === 1 ? title.trim() : String(src.title).replace(/^INS \d+ — /, "")), {}), ...src, id: newId, order: base + n, coverId: cover, stageId, refStage: refStage || String(src.refStage ?? ""), priority, assignee, category: category.trim() || String(src.category), status: "prévu", favorite: false, packKey: `added:${src.id}:${newId}`, notes: [String(src.notes ?? ""), notes.trim()].filter(Boolean).join(" · "), title: title.trim() && ids.length === 1 ? title.trim() : String(src.title).replace(/^INS \d+ — /, ""), fromLibrary: src.id });
      }
      update({ ...project, items: [...project.items, ...created] }, `${created.length} inspiration(s) ajoutée(s) au mariage`);
      onDone(created.length);
    } finally { setBusy(false); }
  }
  return (
    <Sheet title={`Ajouter ${ids.length} plan${ids.length > 1 ? "s" : ""} au mariage`} onClose={onClose}>
      <div className="ref-detail">
        <label>Étape du tournage<select value={stageId} onChange={(e) => setStageId(e.target.value)}><option value="">Sans étape</option>{stages.map((s) => <option key={s.id} value={s.id}>{String(s.time || "")} · {s.title}</option>)}</select></label>
        <label>Étape (classement)<select value={refStage} onChange={(e) => setRefStage(e.target.value)}><option value="">Celle de la bibliothèque</option>{REF_STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Priorité<select value={priority} onChange={(e) => setPriority(e.target.value)}>{REF_PRIORITIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label>Cadreur<select value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Non assigné</option>{team.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
        {ids.length === 1 && <label>Titre<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>}
        <label>Catégorie (facultatif)<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Laisser vide pour garder celle de la bibliothèque" /></label>
        <label>Notes<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <button className="btn gold full" disabled={busy} onClick={() => void run()}>{busy ? "Ajout…" : `Ajouter au mariage`}</button>
      </div>
    </Sheet>
  );
}
