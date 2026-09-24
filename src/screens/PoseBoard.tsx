import QuickStatus from "./QuickStatus";
import "./missions.css";
import ReferenceGallery from "./ReferenceGallery";
import FloatDock from "./FloatDock";
import { Unlink } from "lucide-react";
import { groupSimilar, imageHash } from "../similar";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { ArrowDownUp, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, GalleryHorizontal, GripVertical, Heart, Images, Layers, LayoutGrid, Pencil, Play, Plus, Star, Trash2, X } from "lucide-react";
import type { Item, MediaEntry } from "../types";
import { done, makeItem, poseCategories } from "../model";
import { operatorGuides } from "../operatorGuide";
import { addPoseSection, movePoseSection, poseSectionTitles, removePoseSection, renamePoseSection, setPoseSectionCollapsed } from "../poseSections";
import { useProject } from "../store";
import { reorderBlock, reorderOnDrop, usePointerReorder, type DropZone } from "../reorder";
import { dissolveSeries, doneAngles, mergeIntoSeries, seriesMedia, viewStyle } from "../merge";
import { Empty, MediaViewer, Screen, Thumb, navigate, useMedia } from "../ui";
import { clockShort, ItemEditor, itemsOf, mediaFor, nextOrder, operatorsOf, shortFocal, titleOf } from "./common";
import { accepted, DropVeil, ImportProgress, ImportSheet, PickFiles, useFileDrop, useImporter } from "./MediaDrop";
import "./poses.css";
import "./viewer.css";

const categoryOf = (i: Item) => String(i.category || "Sans catégorie");
type Filter = "all" | "favorites" | "essentials" | "todo" | "hidden" | `cat:${string}`;
const poseDragType = "application/x-visionnary-pose";

/**
 * Pose Board : le moodboard photo du mariage. Les références gardent leur format (façon Pinterest),
 * se rangent par catégorie, se cochent le jour J, se marquent en favori et se réordonnent.
 * Sur tout le mariage (/m/poses) ou dans une étape.
 */
export default function PoseBoard({ stageId, embedded = false }: { stageId?: string; embedded?: boolean }) {
  const { project: p, patchItem, update, notify } = useProject();
  const media = useMedia(p.id);
  const importer = useImporter();
  const [selectedStage,setSelectedStage] = useState("");
  const activeStage=stageId||selectedStage;
  const [filter, setFilter] = useState<Filter>("all");
  const [reorder, setReorder] = useState(false);
  const [layout, setLayout] = useState<"grid" | "carousel">("grid");
  const [selectMode, setSelectMode] = useState(false);
  const [autoSimilar, setAutoSimilar] = useState(() => { try { return localStorage.getItem("visionnary-auto-similar") === "1"; } catch { return false; } });
  const [similarBusy, setSimilarBusy] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [simLevel, setSimLevel] = useState(() => { try { return Number(localStorage.getItem("visionnary-sim-level")) || 14; } catch { return 14; } });
  const [simAcross, setSimAcross] = useState(false);
  const hashes = useRef(new Map<string, string>());
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewer, setViewer] = useState<{ ids: string[]; start: number } | null>(null);
  const [pending, setPending] = useState<File[] | null>(null);
  const [pendingCategory, setPendingCategory] = useState("");
  const [pendingEssential, setPendingEssential] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [renaming, setRenaming] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const [dragTarget, setDragTarget] = useState("");
  const [photoGuide, setPhotoGuide] = useState(p.operatorGuide?.photo ?? operatorGuides.photo.tips.join("\n"));
  const queueImport = (files: File[], category = "", essential = false) => { setPendingCategory(category); setPendingEssential(essential); setPending(files); };
  const dragging = useFileDrop((files) => queueImport(files), !embedded);
  const all = itemsOf(p, "poses").filter((i) => !activeStage || i.stageId === activeStage);
  // Masquées (statut « archivé ») : retirées de « Toutes » mais retrouvables ici pour les réafficher.
  const hiddenPoses = itemsOf(p, "poses", true).filter((i) => i.status === "archivé" && !i.mergedInto && (!activeStage || i.stageId === activeStage));
  const categories = poseSectionTitles(p);
  const current = filter.startsWith("cat:") ? filter.slice(4) : "";
  const shown = filter === "hidden" ? hiddenPoses : all.filter((i) =>
    filter === "all" ? true : filter === "favorites" ? i.favorite === true : filter === "essentials" ? i.priority === "MUST HAVE" : filter === "todo" ? !done(i) : categoryOf(i) === current,
  );
  // Regroupées par catégorie (comme les chapitres de Plans & scènes) : un titre de section par catégorie présente dans le filtre courant.
  const sections = filter === "essentials" || filter === "hidden" ? [[filter === "hidden" ? "Masquées" : "À faire absolument", shown] as const] : categories.map((c) => [c, shown.filter((i) => categoryOf(i) === c)] as const).filter(([c, list]) => list.length || filter === "all" && (p.poseSections ?? []).some((section) => section.title === c));
  const order = sections.flatMap(([, list]) => list);
  const operators = operatorsOf(p);
  const doneCount = all.filter(done).length;
  const add = (section = current, essential = filter === "essentials") => setEditing(makeItem("poses", "", { order: nextOrder(p, "poses"), ...(activeStage ? { stageId:activeStage } : {}), ...(section && section !== "Sans catégorie" && section !== "À faire absolument" ? { category: section } : {}), ...(essential ? { priority: "MUST HAVE" } : {}) }));
  const createSection = () => {
    const next = addPoseSection(p, newSection);
    if (next === p) return;
    update(next, `Section photo « ${newSection.trim()} » créée`);
    setNewSection("");
    setFilter("all");
  };
  const saveSectionTitle = (section: string) => {
    const next = renamePoseSection(p, section, renameDraft);
    if (next === p && section !== renameDraft.trim()) return;
    if (next !== p) update(next, `Section photo « ${section} » renommée`);
    if (current === section) setFilter(`cat:${renameDraft.trim()}`);
    setRenaming("");
  };
  const deleteSection = (section: string) => {
    if (!window.confirm(`Supprimer la section photo « ${section} » ? Ses poses et leurs photos seront conservées dans « Sans catégorie ».`)) return;
    update(removePoseSection(p, section), `Section photo « ${section} » supprimée ; poses conservées`);
    if (current === section) setFilter("all");
  };
  const duplicateSection = (section: string) => {
    let title = `${section} (copie)`;
    let number = 2;
    while (poseSectionTitles(p).includes(title)) title = `${section} (copie ${number++})`;
    const configured = addPoseSection(p, title);
    const copies = itemsOf(p, "poses").filter((pose) => categoryOf(pose) === section).map((pose, index) => ({ ...pose, id: crypto.randomUUID(), title: `${pose.title} (copie)`, category: title, sourceMediaId: pose.sourceMediaId || mediaFor(media, pose)?.id, status: "prévu", order: nextOrder(p, "poses") + index }));
    update({ ...configured, items: [...configured.items, ...copies] }, `Section photo « ${section} » dupliquée avec ${copies.length} pose(s)`);
    setFilter(`cat:${title}`);
  };
  const dropOnSection = (event: DragEvent<HTMLElement>, section: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDragTarget("");
    if (Array.from(event.dataTransfer.types).includes("Files")) {
      const files = Array.from(event.dataTransfer.files).filter(accepted);
      if (files.length) queueImport(files, section === "À faire absolument" ? "" : section, section === "À faire absolument");
      return;
    }
    const id = event.dataTransfer.getData(poseDragType);
    if (!id) return;
    if (section === "À faire absolument") patchItem(id, { priority: "MUST HAVE" }, "Pose ajoutée aux essentiels photo");
    else patchItem(id, { category: section === "Sans catégorie" ? undefined : section }, `Pose déplacée vers « ${section} »`);
  };
  // Glisser une pose (poignée) : bord = insérer avant/après, centre = l'ajouter comme angle de cette pose
  // (souris, doigt ou stylet). Plusieurs poses cochées se glissent ensemble.
  const dropOnPose = (draggedId: string, targetId: string, zone: DropZone, ids: string[]) => {
    const list = sections.map(([, l]) => l).find((l) => l.some((i) => i.id === targetId));
    const target = list?.find((i) => i.id === targetId);
    if (!list || !target) return;
    if (zone === "merge") {
      const items = mergeIntoSeries(p.items, targetId, ids);
      if (!items) return;
      update({ ...p, items: items.map((i) => (i.id === targetId && !i.coverId ? { ...i, coverId: mediaFor(media, p.items.find((x) => x.id === ids[0])!)?.id } : i)) }, ids.length > 1 ? `${ids.length} poses ajoutées comme angles de « ${target.title} »` : `« ${p.items.find((x) => x.id === draggedId)?.title} » ajoutée comme angle de « ${target.title} »`);
      setPicked([]);
      return;
    }
    if (ids.length > 1) {
      const moved = order.filter((i) => ids.includes(i.id));
      const block = reorderBlock(list, moved, targetId, zone === "after" ? "after" : "before");
      if (!block) return;
      update({ ...p, items: p.items.map((i) => (block.orders.has(i.id) ? { ...i, order: block.orders.get(i.id)!, ...(block.crossed.has(i.id) && !["À faire absolument", "Masquées"].includes(String(target.category ?? "")) ? { category: target.category } : {}) } : i)) }, `${moved.length} poses déplacées`);
      setPicked([]); setSelectMode(false);
      return;
    }
    const dragged = p.items.find((i) => i.id === draggedId && i.module === "poses");
    if (!dragged) return;
    const result = reorderOnDrop(list, draggedId, targetId, dragged, zone);
    if (!result) return;
    update({ ...p, items: p.items.map((i) => (result.orders.has(i.id) ? { ...i, order: result.orders.get(i.id)!, ...(i.id === draggedId && result.crossed && !["À faire absolument", "Masquées"].includes(String(target.category ?? "")) ? { category: target.category } : {}) } : i)) }, result.crossed ? `Pose déplacée vers « ${categoryOf(target)} »` : "Ordre des poses modifié");
  };
  const dropPoseOnSection = (draggedId: string, section: string) => {
    if (section === "À faire absolument") patchItem(draggedId, { priority: "MUST HAVE" }, "Pose ajoutée aux essentiels photo");
    else if (section !== "Masquées") patchItem(draggedId, { category: section === "Sans catégorie" ? undefined : section }, `Pose déplacée vers « ${section} »`);
  };

  /** Regroupe en séries les photos d'une même section qui se ressemblent (même angle, même pose). */
  async function groupSimilarPhotos(auto: boolean) {
    if (similarBusy) return;
    setSimilarBusy(true);
    try {
      const singles = all.filter((i) => !i.mergedInto && i.status !== "archivé" && !String(i.includes ?? "")).map((i) => ({ item: i, m: seriesMedia(media, i)[0] })).filter((x) => x.m && x.m.type.startsWith("image/"));
      const byCategory = new Map<string, typeof singles>();
      const keyOf = (i: Item) => (simAcross ? "*" : categoryOf(i));
      for (const x of singles) byCategory.set(keyOf(x.item), [...(byCategory.get(keyOf(x.item)) ?? []), x]);
      const groups: string[][] = [];
      for (const list of byCategory.values()) {
        const map = new Map<string, string>();
        for (const { item, m } of list) {
          let h = hashes.current.get(m.id) ?? null;
          if (!h) { h = await imageHash(m.thumbnail ?? m.blob); if (h) hashes.current.set(m.id, h); }
          if (h) map.set(item.id, h);
        }
        groups.push(...groupSimilar(map, simLevel));
      }
      if (!groups.length) { if (!auto) notify(`Aucune photo similaire parmi ${singles.length} analysées${singles.length !== all.length ? "" : ""} — essayez « Large ».`); return; }
      if (!auto && !window.confirm(`${groups.length} groupe(s) de photos similaires trouvé(s) (${groups.reduce((n, g) => n + g.length, 0)} photos). Les regrouper en séries d'angles ? (annulable)`)) return;
      let items = p.items;
      for (const g of groups) items = mergeIntoSeries(items, g[0], g.slice(1)) ?? items;
      update({ ...p, items }, `${groups.length} série(s) créée(s) à partir de photos similaires`);
    } finally { setSimilarBusy(false); }
  }
  const toggleAutoSimilar = () => { const next = !autoSimilar; setAutoSimilar(next); try { localStorage.setItem("visionnary-auto-similar", next ? "1" : "0"); } catch { /* préférence non mémorisée */ } if (next) void groupSimilarPhotos(false); };
  useEffect(() => { if (autoSimilar && media.length) void groupSimilarPhotos(true); }, [autoSimilar, media.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const dragPose = usePointerReorder({ onDropTile: dropOnPose, onDropSection: dropPoseOnSection, groupOf: (id) => (selectMode && picked.includes(id) ? picked : [id]) });
  const mergePicked = () => {
    if (picked.length < 2) return;
    const target = order.find((i) => picked.includes(i.id))!;
    dropOnPose(target.id, target.id, "merge", picked.filter((id) => id !== target.id).concat([]));
  };
  // Réordonner : on échange l'ordre avec la voisine de la même section, sans toucher aux autres.
  const move = (list: Item[], item: Item, step: number) => {
    const at = list.findIndex((i) => i.id === item.id);
    const other = list[at + step];
    if (!other) return;
    update({ ...p, items: p.items.map((i) => (i.id === item.id ? { ...i, order: other.order } : i.id === other.id ? { ...i, order: item.order } : i)) });
  };

  const body = (
    <>
      {!stageId&&<div className="mission-filters"><select aria-label="Étape des poses" value={selectedStage} onChange={e=>{setSelectedStage(e.target.value);setFilter("all");}}><option value="">Poses de toute la journée</option>{itemsOf(p,"stages").map(s=><option key={s.id} value={s.id}>{s.time} · {s.title}</option>)}</select></div>}
      <div className="board-head">
        <div className="board-count">
          <strong>
            {doneCount} / {all.length}
          </strong>
          <span>poses réalisées</span>
          <div className="progress dark">
            <span style={{ width: `${all.length ? (doneCount / all.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="board-actions">
          <button className="btn gold" onClick={() => add()}>
            <Plus size={17} /> Ajouter<span className="hide-narrow"> une pose</span>
          </button>
          <PickFiles label={<>Importer<span className="hide-narrow"> des références</span></>} onFiles={(files) => queueImport(files, current, filter === "essentials")} />
          {all.length > 1 && (
            <button className={"btn" + (reorder ? " gold" : "")} aria-pressed={reorder} aria-label="Réordonner les poses" onClick={() => setReorder(!reorder)}>
              <ArrowDownUp size={16} /> {reorder ? "Terminer" : <span className="hide-narrow">Réordonner</span>}
            </button>
          )}
          <button className={"btn" + (selectMode ? " gold" : "")} aria-pressed={selectMode} onClick={() => { setSelectMode(!selectMode); setPicked([]); }} title="Cocher plusieurs photos pour les regrouper en une série"><Layers size={16} /> <span className="hide-narrow">{selectMode ? "Terminer" : "Sélectionner"}</span></button>
          <button className={"btn" + (autoSimilar || simOpen ? " gold" : "")} aria-pressed={simOpen} onClick={() => setSimOpen(!simOpen)} title="Regrouper automatiquement les photos qui se ressemblent"><Layers size={16} /> <span className="hide-narrow">Similaires</span></button>
          <button className="btn" onClick={() => navigate("/bibliotheque")} title="Piocher des poses dans la bibliothèque"><Images size={16} /> <span className="hide-narrow">Bibliothèque</span></button>
          <button className="icon-btn" aria-label={layout === "grid" ? "Passer en mode carrousel" : "Passer en mode grille"} title={layout === "grid" ? "Vue carrousel (glisser à gauche/droite)" : "Vue grille"} onClick={() => setLayout(layout === "grid" ? "carousel" : "grid")}>
            {layout === "grid" ? <GalleryHorizontal size={18} /> : <LayoutGrid size={18} />}
          </button>
        </div>
      </div>

      <div className="pose-customize">
        <form className="pose-section-create" onSubmit={(event) => { event.preventDefault(); createSection(); }}>
          <label className="sr-only" htmlFor="pose-new-section">Titre de la nouvelle section photo</label>
          <input id="pose-new-section" value={newSection} onChange={(event) => setNewSection(event.target.value)} placeholder="Nouvelle section photo…" maxLength={80} />
          <button className="btn small" type="submit" disabled={!newSection.trim()}><Plus size={15} /> Section</button>
        </form>
        <details className="pose-guide-editor">
          <summary>Consignes photographe</summary>
          <label className="field">Consignes pour ce mariage<textarea value={photoGuide} onChange={(event) => setPhotoGuide(event.target.value)} /></label>
          <div className="btn-row"><button className="btn small gold" onClick={() => update({ ...p, operatorGuide: { ...(p.operatorGuide ?? {}), photo: photoGuide } }, "Consignes photographe enregistrées")}>Enregistrer les consignes</button><button className="btn small" onClick={() => { const defaults = operatorGuides.photo.tips.join("\n"); const next = { ...(p.operatorGuide ?? {}) }; delete next.photo; setPhotoGuide(defaults); update({ ...p, operatorGuide: next }, "Consignes photographe par défaut rétablies"); }}>Rétablir par défaut</button></div>
        </details>
      </div>

      {(all.length > 0 || categories.length > 0) && (
        <div className="pose-filters" role="group" aria-label="Filtrer les poses">
          <button className={"op-pill" + (filter === "all" ? " on" : "")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            Toutes <small>{all.length}</small>
          </button>
          <button className={"op-pill" + (filter === "favorites" ? " on" : "")} aria-pressed={filter === "favorites"} onClick={() => setFilter("favorites")}>
            <Star size={14} /> Favoris <small>{all.filter((i) => i.favorite === true).length}</small>
          </button>
          <button className={"op-pill" + (filter === "essentials" ? " on" : "")} aria-pressed={filter === "essentials"} onClick={() => setFilter("essentials")}>
            À faire absolument <small>{all.filter((i) => i.priority === "MUST HAVE").length}</small>
          </button>
          <button className={"op-pill" + (filter === "todo" ? " on" : "")} aria-pressed={filter === "todo"} onClick={() => setFilter("todo")}>
            À faire <small>{all.length - doneCount}</small>
          </button>
          {hiddenPoses.length > 0 && (
            <button className={"op-pill" + (filter === "hidden" ? " on" : "")} aria-pressed={filter === "hidden"} onClick={() => setFilter("hidden")}>
              <EyeOff size={14} /> Masquées <small>{hiddenPoses.length}</small>
            </button>
          )}
          {categories.map((c) => (
            <button key={c} className={"op-pill" + (current === c ? " on" : "")} aria-pressed={current === c} onClick={() => setFilter(`cat:${c}`)}>
              {c} <small>{all.filter((i) => categoryOf(i) === c).length}</small>
            </button>
          ))}
        </div>
      )}

      <FloatDock onExit={() => { setSelectMode(false); setPicked([]); }} selectMode={selectMode} onSelect={() => { setSelectMode(true); setPicked([]); }} />
      {simOpen && (
        <div className="card sim-panel">
          <strong>Regrouper les photos qui se ressemblent</strong>
          <p className="muted">Même angle, même pose, ou petit changement (une autre expression, un léger déplacement). Vous pourrez tout modifier ensuite, et annuler d'un clic.</p>
          <div className="choices">
            {([[8, "Strict"], [14, "Moyen"], [20, "Large"]] as const).map(([v, label]) => (
              <button key={v} type="button" className={"choice" + (simLevel === v ? " on" : "")} onClick={() => { setSimLevel(v); try { localStorage.setItem("visionnary-sim-level", String(v)); } catch { /* non mémorisé */ } }}>{label}</button>
            ))}
          </div>
          <label className="sim-auto"><input type="checkbox" checked={simAcross} onChange={(e) => setSimAcross(e.target.checked)} /> Comparer aussi entre les sections</label>
          <label className="sim-auto"><input type="checkbox" checked={autoSimilar} onChange={toggleAutoSimilar} /> Automatique pour les nouvelles photos</label>
          <button className="btn gold full" disabled={similarBusy} onClick={() => void groupSimilarPhotos(false)}>{similarBusy ? "Analyse en cours…" : "Analyser et regrouper"}</button>
        </div>
      )}
      {selectMode && (
        <div className="select-bar" role="status">
          <strong>{picked.length} pose{picked.length > 1 ? "s" : ""} cochée{picked.length > 1 ? "s" : ""}</strong>
          <span className="muted">Glissez-en une sur le centre d'une autre pour l'ajouter comme angle, ou regroupez.</span>
          <button className="btn gold" disabled={picked.length < 2} onClick={mergePicked}><Layers size={16} /> Regrouper en une série</button>
          <button className="btn small" onClick={() => { update({ ...p, items: p.items.map((i) => (picked.includes(i.id) ? { ...i, status: i.status === "archivé" ? "prévu" : "archivé" } : i)) }, "Sélection masquée ou réaffichée"); setPicked([]); setSelectMode(false); }}><EyeOff size={16} /> Masquer / réafficher</button>
          <button className="btn small" onClick={() => { if (!window.confirm(`Supprimer ${picked.length} élément(s) et leurs photos/vidéos regroupées ?`)) return; const gone = new Set(picked); update({ ...p, items: p.items.filter((i) => !gone.has(i.id)) }, "Sélection supprimée"); setPicked([]); setSelectMode(false); }}><Trash2 size={16} /> Supprimer</button>
          <button className="btn small" onClick={() => { const n = p.items.filter((i) => picked.includes(i.id) && String(i.includes ?? "")).length; if (!n) return notify("Aucune série dans la sélection."); update({ ...p, items: dissolveSeries(p.items, picked) }, "Série(s) dégroupée(s) : les photos ressortent"); setPicked([]); setSelectMode(false); }}><Unlink size={16} /> Dégrouper</button>
          <button className="btn small" onClick={() => setPicked(order.map((i) => i.id))}>Tout sélectionner</button>
          <button className="btn small" onClick={() => setPicked([])}>Tout décocher</button>
          <button className="btn small" onClick={() => { setSelectMode(false); setPicked([]); setSelectMode(false); }}>Terminer</button>
        </div>
      )}

      {sections.length ? (
        sections.map(([section, list]) => (
          <section key={section} data-reorder-section={section} className={dragTarget === section ? "pose-drop-target" : ""} onDragOver={(event) => { if (Array.from(event.dataTransfer.types).some((type) => type === poseDragType || type === "Files")) { event.preventDefault(); setDragTarget(section); } }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragTarget(""); }} onDrop={(event) => dropOnSection(event, section)}>
            <div className="section-title pose-section-head">
              {section !== "À faire absolument" && <button className="icon-btn small" aria-label={`${(p.poseSections ?? []).find((entry) => entry.title === section)?.collapsed ? "Déplier" : "Replier"} ${section}`} onClick={() => update(setPoseSectionCollapsed(p, section, !(p.poseSections ?? []).find((entry) => entry.title === section)?.collapsed))}><ChevronDown size={16} className={(p.poseSections ?? []).find((entry) => entry.title === section)?.collapsed ? "pose-folded" : ""} /></button>}
              {selectMode && <button className="btn small" onClick={() => setPicked((cur) => [...new Set([...cur, ...list.map((i) => i.id)])])}>Sélectionner la section</button>}
              {renaming === section ? <form className="pose-rename" onSubmit={(event) => { event.preventDefault(); saveSectionTitle(section); }}><input autoFocus aria-label={`Nouveau titre de ${section}`} value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} maxLength={80} /><button className="btn small" type="submit">Enregistrer</button><button className="icon-btn small" type="button" aria-label="Annuler" onClick={() => setRenaming("")}><X size={15} /></button></form> : <strong>{section}</strong>}
              <span>{list.filter(done).length}/{list.length}</span>
              <div className="pose-section-actions">
                <button className="btn small" onClick={() => add(section, section === "À faire absolument")}><Plus size={14} /> Pose</button>
                <PickFiles className="btn small" label="Photo / vidéo" onFiles={(files) => queueImport(files, section === "À faire absolument" ? "" : section, section === "À faire absolument")} />
                {section !== "À faire absolument" && <>
                  <button className="icon-btn small" aria-label={`Renommer ${section}`} onClick={() => { setRenaming(section); setRenameDraft(section); }}><Pencil size={15} /></button>
                  <button className="icon-btn small" aria-label={`Dupliquer ${section}`} onClick={() => duplicateSection(section)}><Copy size={15} /></button>
                  <button className="icon-btn small" aria-label={`Monter ${section}`} disabled={categories.indexOf(section) <= 0} onClick={() => update(movePoseSection(p, section, -1), "Sections photo réordonnées")}>↑</button>
                  <button className="icon-btn small" aria-label={`Descendre ${section}`} disabled={categories.indexOf(section) >= categories.length - 1} onClick={() => update(movePoseSection(p, section, 1), "Sections photo réordonnées")}>↓</button>
                  {section !== "Sans catégorie" && <button className="icon-btn small" aria-label={`Supprimer ${section}`} onClick={() => deleteSection(section)}><Trash2 size={15} /></button>}
                </>}
              </div>
            </div>
            {!(p.poseSections ?? []).find((entry) => entry.title === section)?.collapsed && <div className={"pose-wall" + (reorder ? " is-reordering" : "") + (layout === "carousel" ? " is-carousel" : "")}>
              {list.map((pose, n) => {
                const thumb = mediaFor(media, pose);
                const op = operators.get(String(pose.operatorId));
                const isVideo = thumb?.type.startsWith("video/");
                const series = seriesMedia(media, pose);
                const taken = series.filter((m) => doneAngles(pose).has(m.id)).length;
                return (
                  <div key={pose.id} className={"pose-tile" + (done(pose) ? " is-done" : "") + (pose.favorite === true ? " is-fav" : "")} data-reorder={pose.id} data-merge="">
                    <button type="button" className="pose-media" onClick={(event) => (selectMode || event.metaKey || event.ctrlKey || event.shiftKey ? (setSelectMode(true),  setPicked((current) => (current.includes(pose.id) ? current.filter((x) => x !== pose.id) : [...current, pose.id]))) : setViewer({ ids: order.map((i) => i.id), start: order.findIndex((i) => i.id === pose.id) }))} aria-label={"Voir la pose " + (pose.title || "")}>
                      <span className="pose-frame">
                        {thumb ? <span className="pose-zoom" style={viewStyle(thumb)}><Thumb media={thumb} className="pose-thumb" /></span> : <span className="pose-empty"><Heart size={28} /></span>}
                      </span>
                      {isVideo && Number(thumb?.duration) > 0 && (
                        <span className="chip dark insp-duration pose-duration">
                          <Play size={9} fill="#fff" /> {clockShort(Number(thumb!.duration))}
                        </span>
                      )}
                      <span className="pose-shade" />
                      <span className="pose-info">
                        <strong>{pose.title || "Sans titre"}</strong>
                        <small>
                          {op && (
                            <>
                              <i style={{ background: op.color }} /> {op.name}
                            </>
                          )}
                        </small>
                      </span>
                    </button>
                    <button type="button" className="pose-fav" aria-pressed={pose.favorite === true} aria-label={pose.favorite === true ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={() => patchItem(pose.id, { favorite: pose.favorite !== true })}>
                      <Star size={15} fill={pose.favorite === true ? "currentColor" : "none"} />
                    </button>
                    <button type="button" className="pose-essential" aria-pressed={pose.priority === "MUST HAVE"} aria-label={pose.priority === "MUST HAVE" ? "Retirer des essentiels photo" : "Marquer essentiel photo"} onClick={() => patchItem(pose.id, { priority: pose.priority === "MUST HAVE" ? "IMPORTANT" : "MUST HAVE" })}>Essentiel</button>
                    {series.length > 1 && <button type="button" className="pose-ungroup" aria-label="Dégrouper : faire ressortir les photos" title="Dégrouper : faire ressortir les photos" onClick={() => update({ ...p, items: dissolveSeries(p.items, [pose.id]) }, "Série dégroupée : les photos ressortent")}><Unlink size={13} /></button>}
                    {series.length > 1 && <span className={"pose-angles" + (taken === series.length ? " is-complete" : "")} title={`${series.length} angles · ${taken} pris`}><Layers size={12} /> {taken ? `${taken}/${series.length}` : series.length} prises</span>}
                    {selectMode && <button type="button" className="pose-select" aria-pressed={picked.includes(pose.id)} aria-label={`Cocher ${pose.title}`} onClick={() => setPicked((current) => (current.includes(pose.id) ? current.filter((x) => x !== pose.id) : [...current, pose.id]))}>{picked.includes(pose.id) ? <Check size={18} /> : null}</button>}
                    <span className="pose-drag" role="button" tabIndex={0} onPointerDown={(event) => dragPose(event, pose.id)} title={`Glisser « ${pose.title} » vers une autre place ou une autre section`} aria-label={`Déplacer ${pose.title} : glisser vers une autre photo ou une autre section`}><GripVertical size={16} /></span>
                    <QuickStatus item={pose}/>
                    {reorder && (
                      <div className="pose-move">
                        <button type="button" aria-label="Avancer" disabled={n === 0} onClick={() => move(list, pose, -1)}>
                          <ChevronLeft size={18} />
                        </button>
                        <button type="button" aria-label="Reculer" disabled={n === list.length - 1} onClick={() => move(list, pose, 1)}>
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>}
          </section>
        ))
      ) : (
        <Empty
          icon={<Heart size={32} />}
          title={all.length ? "Rien dans ce filtre" : "Votre moodboard photo commence ici"}
          text={
            all.length
              ? "Changez de filtre pour retrouver vos poses."
              : "Déposez 5, 20 ou 50 références d’un coup : chaque image devient une pose à cocher le jour J, rangée dans sa catégorie."
          }
          action={
            !all.length ? (
              <div className="btn-row" style={{ justifyContent: "center" }}>
                <PickFiles className="btn gold" label="Importer des références" onFiles={(files) => queueImport(files)} />
                <button className="btn" onClick={() => add()}>
                  <Plus size={17} /> Ajouter une pose
                </button>
              </div>
            ) : undefined
          }
        />
      )}

      <DropVeil show={dragging} text="Chaque image devient une pose du moodboard." />
      <ImportProgress jobs={importer.jobs} />
      {pending && (
        <ImportSheet
          files={pending}
          target="pose"
          targets={["pose"]}
          categories={[...new Set([...categories.filter((c) => c !== "Sans catégorie"), ...poseCategories])]}
          category={pendingCategory && pendingCategory !== "Sans catégorie" ? pendingCategory : ""}
          onClose={() => setPending(null)}
          onConfirm={(_target, _section, category) => {
            void importer.run(pending, "pose", { ...(activeStage ? { stageId:activeStage } : {}), ...(category ? { category } : {}), ...(pendingEssential ? { priority: "MUST HAVE" } : {}) }, all.length);
            setPending(null);
            if (pendingEssential) setFilter("essentials"); else if (category) setFilter(`cat:${category}`);
          }}
        />
      )}
      {viewer && <PoseViewer ids={viewer.ids} start={viewer.start} onClose={() => setViewer(null)} onEdit={setEditing} />}
      {editing && <ItemEditor key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
  // Dans une étape, le tableau de bord gère déjà le glisser-déposer et l'en-tête.
  if (embedded) return body;
  return (
    <Screen title="Galerie photographe" backTo="/tournage">
      {body}
    </Screen>
  );
}

const visual = (m: MediaEntry) => !m.unsupported && /^(image|video)\//.test(m.type);

/** Une pose en plein écran : la référence en grand, la phrase à dire, qui la fait, et la suivante d'un swipe. */
export function PoseViewer({ ids, start, onClose, onEdit }: { ids: string[]; start: number; onClose: () => void; onEdit: (pose: Item) => void }) {
  const { project: p, patchItem } = useProject();
  const media = useMedia(p.id);
  const dialog = useRef<HTMLDialogElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState(start);
  const [pick, setPick] = useState(0);
  const [full, setFull] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const poses = ids.map((id) => p.items.find((i) => i.id === id)).filter((i): i is Item => !!i);
  const at = Math.min(index, poses.length - 1);
  const pose = poses[at];
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  useEffect(() => {
    if (!poses.length) onClose();
  }, [poses.length, onClose]);
  useEffect(() => setPick(0), [pose?.id]);
  if (!pose) return null;
  const own = media.filter((m) => m.itemId === pose.id && visual(m));
  const gallery = own.length ? own : [mediaFor(media, pose)].filter((m): m is MediaEntry => !!m);
  const current = gallery[Math.min(pick, gallery.length - 1)];
  const team = itemsOf(p, "team");
  const operators = operatorsOf(p);
  const go = (step: number) => setIndex((n) => Math.max(0, Math.min(poses.length - 1, n + step)));
  const facts: [string, unknown][] = [
    ["Mains / regard", pose.hands],
    ["Cadrage", pose.framing],
    ["Focale", shortFocal(pose.focal)],
    ["Lumière", pose.light],
    ["Orientation", pose.orientation],
    ["Durée", pose.duration ? `${pose.duration} min` : ""],
    ["Étape", titleOf(p, pose.stageId)],
  ];
  return (
    <dialog
      ref={dialog}
      className="shot-viewer"
      aria-label={"Pose : " + pose.title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if ((e.target as Element).closest("input,textarea,select")) return;
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="sv">
        <header className="sv-top">
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <X size={22} />
          </button>
          <div className="sv-count">
            <strong>
              {at + 1} / {poses.length}
            </strong>
            <small>{String(pose.category || "Poses")}</small>
          </div>
          <button className="icon-btn" aria-pressed={!showInfo} aria-label={showInfo ? "Cacher les infos" : "Montrer les infos"} title={showInfo ? "Cacher les infos" : "Montrer les infos"} onClick={() => setShowInfo(!showInfo)}>
            {showInfo ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
          <button className="icon-btn" aria-label="Modifier la pose" onClick={() => onEdit(pose)}>
            <Pencil size={19} />
          </button>
        </header>
        <nav className="mission-nav" aria-label="Changer de pose"><button className="btn small" disabled={at===0} onClick={()=>go(-1)}>Pose précédent</button><button className="btn small" disabled={at>=poses.length-1} onClick={()=>go(1)}>Pose suivant</button></nav>
        <div
          className={"sv-main" + (showInfo ? "" : " info-hidden")}
          onPointerDown={(e) => {
            if ((e.target as Element).closest("video, button, select, input, a")) return;
            swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(dx < 0 ? 1 : -1);
          }}
        >
          <ReferenceGallery key={pose.id} item={pose} media={media} />
          <div className="sv-body">
            <div className="sv-chips">
              {pose.category && <span className="chip dark">{String(pose.category)}</span>}
              {pose.favorite === true && (
                <span className="chip gold">
                  <Star size={12} fill="currentColor" /> Favori
                </span>
              )}
              {done(pose) && (
                <span className="chip green">
                  <Check size={13} /> Réalisée
                </span>
              )}
            </div>
            <h2>{pose.title}</h2>
            {pose.instruction && <p className="pose-say">« {String(pose.instruction)} »</p>}
            {facts.some(([, v]) => v) && (
              <dl className="sv-more">
                {facts
                  .filter(([, v]) => v)
                  .map(([label, v]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {team.length > 0 && (
              <div className="field sv-transition">
                Photographe
                <div className="op-pills pose-assign">
                  {team.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={"op-pill" + (pose.operatorId === m.id ? " on" : "")}
                      aria-pressed={pose.operatorId === m.id}
                      onClick={() => patchItem(pose.id, { operatorId: pose.operatorId === m.id ? "" : m.id })}
                    >
                      <i style={{ background: operators.get(m.id)?.color }} />
                      {m.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label className="field sv-transition">Déplacer vers une section photo
              <select value={String(pose.category || "")} onChange={(event) => patchItem(pose.id, { category: event.target.value || undefined }, "Pose déplacée ; références conservées") }>
                <option value="">Sans catégorie</option>
                {poseSectionTitles(p).filter((title) => title !== "Sans catégorie" && title !== "À faire absolument").map((title) => <option key={title} value={title}>{title}</option>)}
              </select>
            </label>
            {pose.notes && <p className="sv-notes">{pose.notes}</p>}
            <details className="sv-notes"><summary>Consignes photographe</summary><p style={{ whiteSpace: "pre-line" }}>{p.operatorGuide?.photo ?? operatorGuides.photo.tips.join("\n")}</p></details>
          </div>
        </div>
        <nav className="sv-status pose-status" aria-label="Statut de la pose">
          <button className={"star" + (pose.favorite === true ? " on" : "")} aria-label="Favori" onClick={() => patchItem(pose.id, { favorite: pose.favorite !== true })}>
            <Star size={20} fill={pose.favorite === true ? "currentColor" : "none"} />
          </button>
          <button className={pose.priority === "MUST HAVE" ? "on" : ""} aria-pressed={pose.priority === "MUST HAVE"} onClick={() => patchItem(pose.id, { priority: pose.priority === "MUST HAVE" ? "IMPORTANT" : "MUST HAVE" })}>ESSENTIEL</button>
          <button className={!done(pose) ? "on" : ""} onClick={() => patchItem(pose.id, { status: "prévu" })}>
            À FAIRE
          </button>
          <button
            className={"done" + (done(pose) ? " on" : "")}
            onClick={() => {
              patchItem(pose.id, { status: "terminé" }, `${pose.title} · réalisée`);
              if (at < poses.length - 1) setTimeout(() => go(1), 280);
            }}
          >
            <Check size={22} strokeWidth={3} /> RÉALISÉE
          </button>
        </nav>
      </div>
      {full && current && <MediaViewer media={current} onClose={() => setFull(false)} />}
    </dialog>
  );
}
