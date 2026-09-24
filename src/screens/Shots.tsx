import { groupSimilar, mediaHash } from "../similar";
import FloatDock from "./FloatDock";
import SectionProgress from "./SectionProgress";
import { Clock3, ClipboardPaste, Scissors, Unlink } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { EyeOff, Camera, Check, ChevronDown, ChevronRight, Clapperboard, Copy, Film, GripVertical, Layers, ListPlus, Pencil, Plane, Plus, Search, Sparkles, Trash2, Video, RotateCcw, SlidersHorizontal, Play, Pause } from "lucide-react";
import type { Item } from "../types";
import type { ShotSection } from "../types";
import { done, makeItem, orderSections, sectionOf, shotSections } from "../model";
import { isDroneShot, isPhotoShot, isVideoShot } from "../stageStats";
import { withOrder } from "../features";
import { linkShotsToStages, professionalShotList, shotListCount } from "../shotlist";
import { useProject } from "../store";
import { reorderBlock, reorderOnDrop, usePointerReorder, type DropZone } from "../reorder";
import { dissolveSeries, doneAngles, mergeIntoSeries, seriesMedia } from "../merge";
import { Empty, Screen, Sheet, Tabs, useMedia } from "../ui";
import { ItemEditor, itemsOf, mediaFor, MediaCard, nextOrder, operatorsOf } from "./common";
import { matchesShotSearch } from "../shotSearch";
import { orderedSectionTitles, orderShotSectionsByDay, reorderShotSection, siblingSectionTitles } from "../shotSections";
import "./shots.css";
import BulkAdd from "./BulkAdd";
import { accepted as acceptedImportFile, DropVeil, ImportProgress, ImportSheet, PickFiles, useFileDrop, useImporter, type ImportTarget } from "./MediaDrop";
import MomentSplit from "./MomentSplit";
import ShotViewer from "./ShotViewer";

type Kind = "all" | "video" | "photo" | "drone";
const shotDragType = "application/x-visionnary-shot";
const sectionDragType = "application/x-visionnary-section";
const kindTest: Record<Kind, (i: Item) => boolean> = { all: () => true, video: isVideoShot, photo: isPhotoShot, drone: isDroneShot };

/**
 * Plans & scènes : la shot list groupée chapitre par chapitre, comme le déroulé du film —
 * on ouvre l'écran et on sait exactement quoi tourner, dans quel ordre, sans se perdre.
 */
export default function Shots() {
  const { project: p, update, patchItem, notify } = useProject();
  const [filter, setFilter] = useState<"all" | "todo" | "must" | "done" | "favorites">("all");
  const [kind, setKind] = useState<Kind>("all");
  const [motion, setMotion] = useState(false);
  const [query, setQuery] = useState("");
  const [stageId, setStageId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewer, setViewer] = useState<{ ids: string[]; start: number } | null>(null);
  const [confirmLoad, setConfirmLoad] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [pending, setPending] = useState<{ files: File[]; target: ImportTarget; section?: string } | null>(null);
  const [sectionEditor, setSectionEditor] = useState<{ title: string; parentId?: string; original?: ShotSection } | null>(null);
  const [sectionActions, setSectionActions] = useState<string | null>(null);
  const [showHiddenSections, setShowHiddenSections] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [cut, setCut] = useState<string[]>([]);
  const [simOpen, setSimOpen] = useState(false);
  const [simBusy, setSimBusy] = useState(false);
  const [simLevel, setSimLevel] = useState(() => { try { return Number(localStorage.getItem("visionnary-sim-level")) || 14; } catch { return 14; } });
  const [simAcross, setSimAcross] = useState(false);
  const hashes = useRef(new Map<string, string>());
  const [picked, setPicked] = useState<string[]>([]);
  const media = useMedia(p.id);
  const importer = useImporter();
  const dragging = useFileDrop((files) => setPending({ files, target: kind === "video" || kind === "drone" ? "video" : "photo" }));
  const all = itemsOf(p, "shots", true);
  const operators = operatorsOf(p);
  const stages = itemsOf(p, "stages");
  const active = all.filter((i) => i.status !== "archivé");
  const scoped = active.filter((i) =>
    (stageId === "unassigned" ? !i.stageId : !stageId || i.stageId === stageId) &&
    (operatorId === "unassigned" ? !i.operatorId : !operatorId || i.operatorId === operatorId) &&
    matchesShotSearch(i, query, p.items),
  );
  const typed = scoped.filter(kindTest[kind]);
  const statusTests = {
    all: () => true,
    todo: (i: Item) => !done(i),
    must: (i: Item) => i.priority === "MUST HAVE",
    done,
    favorites: (i: Item) => i.favorite === true,
  };
  const configured = p.shotSections ?? [];
  const hiddenIds = new Set(configured.filter((section) => section.hidden).map((section) => section.id));
  const sectionHidden = (section: ShotSection) => !!section.hidden || !!(section.parentId && hiddenIds.has(section.parentId));
  const hiddenTitles = new Set(configured.filter(sectionHidden).map((section) => section.title));
  const items = typed.filter(statusTests[filter]);
  const visibleItems = items.filter((i) => showHiddenSections || !hiddenTitles.has(sectionOf(i)));
  const sectionTitles = (parentId?: string) => configured.filter((s) => s.parentId === parentId && !s.hidden).sort((a,b) => a.order-b.order);
  const orderedSections = orderedSectionTitles(
    configured.filter((section) => !sectionHidden(section) || showHiddenSections),
    orderSections(visibleItems.map(sectionOf)),
  );
  const filtered = !!(query || stageId || operatorId || kind !== "all" || filter !== "all");
  const resetFilters = () => { setQuery(""); setStageId(""); setOperatorId(""); setKind("all"); setFilter("all"); };
  // Ordre de lecture de l'écran (chapitre par chapitre) : la fiche plein écran le suit.
  const order = orderedSections.flatMap((section) => items.filter((i) => sectionOf(i) === section));
  const transitions = new Map(
    p.items.filter((i) => i.module === "transitions" && i.fromId && i.status !== "archivé").map((t) => [String(t.fromId), String(t.movement || "Transition")]),
  );
  const kinds: [Kind, string, typeof Camera, number][] = [
    ["all", "Tous types", Clapperboard, scoped.length],
    ["video", "Vidéo", Video, scoped.filter(isVideoShot).length],
    ["photo", "Photo", Camera, scoped.filter(isPhotoShot).length],
    ["drone", "Drone", Plane, scoped.filter(isDroneShot).length],
  ];
  const loadShotList = () => {
    const stages = p.items.filter((i) => i.module === "stages");
    const linked = linkShotsToStages(professionalShotList(), stages);
    update(
      { ...p, items: [...p.items, ...withOrder(linked, p.items)] },
      `${shotListCount} plans ajoutés, prêts à tourner`,
    );
    setConfirmLoad(false);
  };
  const saveSection = () => {
    if (!sectionEditor) return;
    const title = sectionEditor.title.trim();
    if (!title) return;
    const sections = [...configured];
    const existing = sectionEditor.original;
    if (existing) {
      const oldTitle = existing.title;
      if (sections.some((s) => s.title === title && s.id !== existing.id)) return;
      const at = sections.findIndex((s) => s.id === existing.id);
      if (at >= 0) sections[at] = { ...existing, title };
      else sections.push({ ...existing, title });
      const children = configured.filter((s) => s.parentId === existing.id);
      for (const child of children) {
        const suffix = child.title.startsWith(oldTitle + " · ") ? child.title.slice(oldTitle.length + 3) : child.title;
        const renamedChild = `${title} · ${suffix}`;
        const childIndex = sections.findIndex((s) => s.id === child.id);
        if (childIndex >= 0) sections[childIndex] = { ...child, title: renamedChild };
      }
      const sectionNames = new Map(children.map((child) => [child.title, `${title} · ${child.title.startsWith(oldTitle + " · ") ? child.title.slice(oldTitle.length + 3) : child.title}`]));
      update({ ...p, shotSections: sections, items: oldTitle === title ? p.items : p.items.map((i) => i.module === "shots" ? { ...i, section: sectionNames.get(sectionOf(i)) ?? (sectionOf(i) === oldTitle ? title : i.section) } : i) }, `Section « ${oldTitle} » renommée`);
    } else {
      let parent = sectionEditor.parentId ? sections.find((s) => s.id === sectionEditor.parentId || s.title === sectionEditor.parentId) : undefined;
      if (sectionEditor.parentId && !parent) {
        parent = { id: crypto.randomUUID(), title: sectionEditor.parentId, order: orderedSections.indexOf(sectionEditor.parentId) };
        sections.push(parent);
      }
      const fullTitle = parent ? `${parent.title} · ${title}` : title;
      if (sections.some((s) => s.title === fullTitle)) return;
      const entry = { id: crypto.randomUUID(), title: fullTitle, order: sectionTitles(sectionEditor.parentId).length, ...(parent ? { parentId: parent.id } : {}) };
      sections.push(entry);
      update({ ...p, shotSections: sections }, `Section « ${fullTitle} » créée`);
    }
    setSectionEditor(null);
  };
  const moveSectionTo = (section: string, destination: string) => {
    if (section === destination) return;
    const sections = reorderShotSection(configured, orderSections(active.map(sectionOf)), section, destination);
    if (sections) update({ ...p, shotSections: sections }, "Ordre des sections modifié");
    else notify("Déplacez une sous-section parmi celles du même chapitre");
  };
  const moveSection = (section: string, delta: number) => {
    const siblings = siblingSectionTitles(configured, orderSections(active.map(sectionOf)), section);
    const index = siblings.indexOf(section);
    const destination = siblings[index + delta];
    if (destination) moveSectionTo(section, destination);
  };
  // Glisser aux pointeurs (souris, doigt, stylet) : un plan sur un autre plan ou une section, ou une section sur une autre.
  const dropShotOnShot = (draggedId: string, targetId: string, zone: DropZone = "before", ids: string[] = [draggedId]) => {
    const dragged = all.find((item) => item.id === draggedId);
    const target = all.find((item) => item.id === targetId);
    if (!dragged || !target) return;
    if (zone === "merge") {
      const merged = mergeIntoSeries(p.items, targetId, ids);
      if (!merged) return;
      update({ ...p, items: merged.map((item) => (item.id === targetId && !item.coverId ? { ...item, coverId: mediaFor(media, dragged)?.id } : item)) }, ids.length > 1 ? `${ids.length} plans ajoutés comme angles de « ${target.title} »` : `« ${dragged.title} » ajouté comme angle de « ${target.title} »`);
      setPicked([]); setSelectMode(false);
      return;
    }
    const list = items.filter((item) => sectionOf(item) === sectionOf(target));
    if (ids.length > 1) {
      const moved = order.filter((i) => ids.includes(i.id));
      const block = reorderBlock(list, moved, targetId, zone === "after" ? "after" : "before");
      if (!block) return;
      update({ ...p, items: p.items.map((item) => (block.orders.has(item.id) ? { ...item, order: block.orders.get(item.id)!, ...(block.crossed.has(item.id) ? { section: sectionOf(target) } : {}) } : item)) }, `${moved.length} plans déplacés`);
      setPicked([]); setSelectMode(false);
      return;
    }
    const result = reorderOnDrop(list, draggedId, targetId, dragged, zone);
    if (!result) return;
    update({ ...p, items: p.items.map((item) => (result.orders.has(item.id) ? { ...item, order: result.orders.get(item.id)!, ...(item.id === draggedId && result.crossed ? { section: sectionOf(target) } : {}) } : item)) }, result.crossed ? `Plan déplacé vers « ${sectionOf(target)} »` : "Ordre des plans modifié");
  };
  const pasteInto = (section: string) => {
    if (!cut.length) return;
    const top = Math.max(-1, ...all.map((i) => i.order));
    const ids = order.filter((i) => cut.includes(i.id)).map((i) => i.id);
    update({ ...p, items: p.items.map((i) => { const n = ids.indexOf(i.id); return n < 0 ? i : { ...i, order: top + 1 + n, section }; }) }, `${ids.length} plan${ids.length > 1 ? "s" : ""} collé${ids.length > 1 ? "s" : ""} dans « ${section} »`);
    setCut([]);
  };
  const dropOnSectionPointer = (draggedId: string, section: string) => {
    const shot = all.find((item) => item.id === draggedId);
    if (shot) {
      if (sectionOf(shot) !== section) patchItem(draggedId, { section }, `Plan déplacé vers « ${section} »`);
      return;
    }
    if (draggedId !== section) moveSectionTo(draggedId, section);
  };
  /** Regroupe en séries les vidéos (et photos) de plans qui se ressemblent. */
  async function groupSimilarShots(only?: string) {
    if (simBusy) return;
    setSimBusy(true);
    try {
      const singles = active.filter((i) => (!only || sectionOf(i) === only) && !i.mergedInto && !String(i.includes ?? "")).map((i) => ({ item: i, m: seriesMedia(media, i)[0] })).filter((x) => x.m);
      const buckets = new Map<string, typeof singles>();
      for (const x of singles) { const k = simAcross ? "*" : sectionOf(x.item); buckets.set(k, [...(buckets.get(k) ?? []), x]); }
      const groups: string[][] = [];
      for (const list of buckets.values()) {
        const map = new Map<string, string>();
        for (const { item, m } of list) {
          let h = hashes.current.get(m.id) ?? null;
          if (!h) { h = await mediaHash(m); if (h) hashes.current.set(m.id, h); }
          if (h) map.set(item.id, h);
        }
        groups.push(...groupSimilar(map, simLevel));
      }
      if (!groups.length) return notify(`Aucun plan similaire parmi ${singles.length} analysés — essayez « Large ».`);
      if (!window.confirm(`${groups.length} groupe(s) de plans similaires trouvé(s) (${groups.reduce((n, g) => n + g.length, 0)} éléments). Les regrouper en séries d'angles ? (annulable)`)) return;
      let items = p.items;
      for (const g of groups) items = mergeIntoSeries(items, g[0], g.slice(1)) ?? items;
      update({ ...p, items }, `${groups.length} série(s) créée(s) à partir de plans similaires`);
    } finally { setSimBusy(false); }
  }
  const dragShot = usePointerReorder({ onDropTile: dropShotOnShot, onDropSection: dropOnSectionPointer, groupOf: (id) => (selectMode && picked.includes(id) ? picked : [id]) });
  const isInternalDrag = (event: DragEvent<HTMLElement>) => Array.from(event.dataTransfer.types).some((type) => type === shotDragType || type === sectionDragType);
  const dropOnSection = (event: DragEvent<HTMLElement>, section: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDragTarget(null);
    if (Array.from(event.dataTransfer.types).includes("Files")) {
      const files = Array.from(event.dataTransfer.files).filter(acceptedImportFile);
      if (files.length) setPending({ files, target: kind === "video" || kind === "drone" ? "video" : "photo", section });
      else notify("Aucune photo ou vidéo compatible dans ce dépôt");
      return;
    }
    const shotId = event.dataTransfer.getData(shotDragType);
    if (shotId) {
      const shot = all.find((item) => item.id === shotId);
      if (shot && sectionOf(shot) !== section) patchItem(shotId, { section }, `Plan déplacé vers « ${section} »`);
      return;
    }
    const source = event.dataTransfer.getData(sectionDragType);
    if (source) moveSectionTo(source, section);
  };
  const deleteSection = (section: string) => {
    const parent = configured.find((entry) => entry.title === section);
    const children = parent ? configured.filter((s) => s.parentId === parent.id) : [];
    const removedTitles = new Set([section, ...children.map((s) => s.title)]);
    const count = p.items.filter((i) => i.module === "shots" && removedTitles.has(sectionOf(i))).length;
    if (!window.confirm(`Supprimer la section « ${section} » ? ${count ? `${count} plan(s) seront conservés dans « Autres plans ».` : ""}`)) return;
    update({ ...p, shotSections: configured.filter((s) => !removedTitles.has(s.title)), items: p.items.map((i) => i.module === "shots" && removedTitles.has(sectionOf(i)) ? { ...i, section: "" } : i) }, `Section « ${section} » supprimée; plans conservés`);
  };
  const duplicateSection = (section: string) => {
    let title = `${section} (copie)`;
    let copyNumber = 2;
    while (configured.some((entry) => entry.title === title) || all.some((item) => sectionOf(item) === title)) {
      title = `${section} (copie ${copyNumber++})`;
    }
    const parent = configured.find((entry) => entry.title === section);
    const children = parent ? configured.filter((entry) => entry.parentId === parent.id) : [];
    const parentId = crypto.randomUUID();
    const childCopies = children.map((child) => ({ ...child, id: crypto.randomUUID(), parentId, title: `${title} · ${child.title.split(" · ").at(-1)}` }));
    const copies = p.items.filter((i) => i.module === "shots" && (sectionOf(i) === section || children.some((child) => sectionOf(i) === child.title))).map((i, index) => {
      const childIndex = children.findIndex((child) => child.title === sectionOf(i));
      return { ...i, id: crypto.randomUUID(), title: `${i.title} (copie)`, section: childIndex >= 0 ? childCopies[childIndex].title : title, sourceMediaId: i.sourceMediaId || mediaFor(media, i)?.id, status: "prévu", order: nextOrder(p, "shots") + index };
    });
    update({ ...p, shotSections: [...configured, { id: parentId, title, order: parent ? parent.order + 0.5 : configured.length, ...(parent?.parentId ? { parentId: parent.parentId } : {}) }, ...childCopies], items: [...p.items, ...copies] }, `Section « ${section} » dupliquée avec ses plans`);
  };
  const toggleCollapsed = (section: string) => {
    const sections = [...configured]; const found = sections.find((s) => s.title === section);
    if (found) sections[sections.indexOf(found)] = { ...found, collapsed: !found.collapsed };
    else sections.push({ id: crypto.randomUUID(), title: section, order: orderedSections.indexOf(section), collapsed: true });
    update({ ...p, shotSections: sections });
  };
  return (
    <Screen
      title="Plans & scènes"
      backTo="/tournage"
      actions={
        <>
          <button
            className="icon-btn gold"
            aria-label="Ajouter un plan"
            onClick={() => setEditing(makeItem("shots", "", { order: nextOrder(p, "shots"), ...(kind !== "all" ? { media: kind } : {}) }))}
          >
            <Plus size={20} />
          </button>
        </>
      }
    >
      {active.length > 0 ? (
        <div className="card shotlist-progress">
          <div className="section-title" style={{ margin: 0 }}>
            Couverture
            <span>
              {active.filter(done).length}/{active.length} tournés
            </span>
          </div>
          <div className="progress" style={{ marginTop: 8 }}>
            <span
              style={{
                width: `${active.length ? (active.filter(done).length / active.length) * 100 : 0}%`,
              }}
            />
          </div>
          {active.some((i) => i.priority === "MUST HAVE" && !done(i)) && (
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              {active.filter((i) => i.priority === "MUST HAVE" && !done(i)).length} plan(s) essentiel(s)
              restant(s).
            </p>
          )}
        </div>
      ) : (
        <div className="notice" style={{ marginBottom: 14 }}>
          <Sparkles size={18} />
          <span>
            Commencez par la shot-list complète : {shotListCount} plans de réalisateur, déjà cadrés,
            mouvementés et rangés du premier « bonjour » au dernier « au revoir ». Modifiable ensuite
            librement.
          </span>
          <button className="btn small gold" onClick={() => setConfirmLoad(true)}>
            Charger
          </button>
        </div>
      )}

      <MomentSplit shots={active} />
      <div className="shot-toolbar">
      <div className="search">
        <Search size={16} />
        <input
          placeholder="Plan, cadrage, étape, cadreur…"
          aria-label="Rechercher"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

        <PickFiles className="btn gold" label="Importer" onFiles={(files) => setPending({ files, target: kind === "video" ? "video" : "photo" })} />
      </div>
      <div className="shot-gallery-options">
        <details className="shot-filter-panel">
          <summary><SlidersHorizontal size={16} /> Filtres{filtered ? " actifs" : ""}</summary>
      <div className="choices kind-choices">
        {kinds.map(([id, label, Icon, n]) => (
          <button key={id} type="button" className={"choice" + (kind === id ? " on" : "")} aria-pressed={kind === id} onClick={() => setKind(id)}>
            <Icon size={15} /> {label} <small>{n}</small>
          </button>
        ))}

      </div>
      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          ["all", "Tous", typed.length],
          ["todo", "À faire", typed.filter(statusTests.todo).length],
          ["must", "Essentiels", typed.filter(statusTests.must).length],
          ["favorites", "Favoris", typed.filter(statusTests.favorites).length],
          ["done", "Faits", typed.filter(done).length],
        ]}
      />
      <div className="shot-filters">
        <label className="field">Étape
          <select aria-label="Étape" value={stageId} onChange={(e) => setStageId(e.target.value)}>
            <option value="">Toutes les étapes</option>
            <option value="unassigned">Sans étape</option>
            {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}
          </select>
        </label>
        <label className="field">Cadreur
          <select aria-label="Cadreur" value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
            <option value="">Toute l’équipe</option>
            <option value="unassigned">Sans affectation</option>
            {itemsOf(p, "team").map((member) => <option key={member.id} value={member.id}>{member.title}</option>)}
          </select>
        </label>
      </div>
          <div className="shot-extra-actions">
            <button className="btn small" onClick={() => setBulk(true)}><ListPlus size={16} /> Ajouter plusieurs plans</button>
            <button className="btn small" onClick={() => setConfirmLoad(true)}><Sparkles size={16} /> Trame de mariage</button>
          </div>
        </details>
        <button className="btn small" onClick={() => { if (window.confirm("Réorganiser les sections dans l'ordre de la journée ? Vous pouvez annuler ensuite.")) update({ ...p, shotSections: orderShotSectionsByDay(configured, orderSections(active.map(sectionOf)), (titles) => active.filter((x) => titles.includes(sectionOf(x))), p.items.filter((x) => x.module === "stages")) }, "Sections rangées dans l'ordre de la journée"); }} title="Ranger les sections dans l'ordre de la journée"><Clock3 size={16} /> Ordre du jour</button>
        <button className={"btn small" + (simOpen ? " gold" : "")} aria-pressed={simOpen} onClick={() => setSimOpen(!simOpen)} title="Regrouper les plans qui se ressemblent"><Layers size={16} /> Similaires</button>
        <button className={"btn small" + (selectMode ? " gold" : "")} aria-pressed={selectMode} onClick={() => { setSelectMode(!selectMode); setPicked([]); }} title="Cocher plusieurs plans ou vidéos pour les regrouper en une série d'angles"><Layers size={15} /> {selectMode ? "Terminer" : "Sélectionner"}</button>
        <button className="btn small shot-motion" aria-pressed={motion} onClick={() => setMotion(!motion)}>{motion ? <Pause size={15} /> : <Play size={15} />}{motion ? "Figer" : "Animer"}</button>
      </div>
      <FloatDock onExit={() => { setSelectMode(false); setPicked([]); }} selectMode={selectMode} onSelect={() => { setSelectMode(true); setPicked([]); }} />
      {simOpen && (
        <div className="card sim-panel">
          <strong>Regrouper les plans qui se ressemblent</strong>
          <p className="muted">Même angle ou même plan, avec un petit changement. Vous pourrez tout modifier ensuite, et annuler d'un clic.</p>
          <div className="choices">
            {([[8, "Strict"], [14, "Moyen"], [20, "Large"]] as const).map(([v, label]) => (
              <button key={v} type="button" className={"choice" + (simLevel === v ? " on" : "")} onClick={() => { setSimLevel(v); try { localStorage.setItem("visionnary-sim-level", String(v)); } catch { /* non mémorisé */ } }}>{label}</button>
            ))}
          </div>
          <label className="sim-auto"><input type="checkbox" checked={simAcross} onChange={(e) => setSimAcross(e.target.checked)} /> Comparer aussi entre les sections</label>
          <button className="btn gold full" disabled={simBusy} onClick={() => void groupSimilarShots()}>{simBusy ? "Analyse en cours…" : "Analyser et regrouper"}</button>
        </div>
      )}
      {cut.length > 0 && <div className="select-bar cut-bar" role="status"><strong>{cut.length} coupé{cut.length > 1 ? "s" : ""}</strong><span className="muted">Allez dans une section (bouton « Aller à une section ») puis « Coller ici ».</span><button className="btn small" onClick={() => setCut([])}>Annuler</button></div>}
      {selectMode && (
        <div className="select-bar" role="status">
          <strong>{picked.length} plan{picked.length > 1 ? "s" : ""} coché{picked.length > 1 ? "s" : ""}</strong>
          <span className="muted">Glissez-en un sur le centre d'un autre pour l'ajouter comme angle, ou regroupez.</span>
          <button className="btn gold" disabled={picked.length < 2} onClick={() => dropShotOnShot(picked[0], picked[0], "merge", picked.slice(1))}><Layers size={16} /> Regrouper en une série</button>
          <button className="btn small" onClick={() => { update({ ...p, items: p.items.map((i) => (picked.includes(i.id) ? { ...i, status: i.status === "archivé" ? "prévu" : "archivé" } : i)) }, "Sélection masquée ou réaffichée"); setPicked([]); setSelectMode(false); }}><EyeOff size={16} /> Masquer / réafficher</button>
          <button className="btn small" onClick={() => { if (!window.confirm(`Supprimer ${picked.length} élément(s) et leurs photos/vidéos regroupées ?`)) return; const gone = new Set(picked); update({ ...p, items: p.items.filter((i) => !gone.has(i.id)) }, "Sélection supprimée"); setPicked([]); setSelectMode(false); }}><Trash2 size={16} /> Supprimer</button>
          <button className="btn small" onClick={() => { const n = p.items.filter((i) => picked.includes(i.id) && String(i.includes ?? "")).length; if (!n) return notify("Aucune série dans la sélection."); update({ ...p, items: dissolveSeries(p.items, picked) }, "Série(s) dégroupée(s) : les photos ressortent"); setPicked([]); setSelectMode(false); }}><Unlink size={16} /> Dégrouper</button>
          <button className="btn small" disabled={!picked.length} onClick={() => { setCut(picked); setPicked([]); setSelectMode(false); notify(`${picked.length} coupé(s) : ouvrez une section et cliquez « Coller ici »`); }}><Scissors size={16} /> Couper</button>
          <button className="btn small" onClick={() => setPicked(order.map((i) => i.id))}>Tout sélectionner</button>
          <button className="btn small" onClick={() => setPicked([])}>Tout décocher</button>
          <button className="btn small" onClick={() => { setSelectMode(false); setPicked([]); setSelectMode(false); }}>Terminer</button>
        </div>
      )}
      <div className="shot-results">
        <span role="status">{items.length} plan{items.length > 1 ? "s" : ""} affiché{items.length > 1 ? "s" : ""} sur {active.length}</span>
        <button className="btn small" onClick={() => setSectionEditor({ title: "" })}><Plus size={15} /> Section</button>
        {filtered && <button className="btn small" onClick={resetFilters}><RotateCcw size={14} /> Tout afficher</button>}
      </div>

      {items.length || (!filtered && configured.some((section) => !sectionHidden(section) || showHiddenSections)) ? (
        orderedSections.map((section) => {
          const list = items.filter((i) => sectionOf(i) === section);
          const sectionConfig = configured.find((s) => s.title === section);
          if (!list.length && !sectionConfig) return null;
          return (
            <section
              key={section}
              data-reorder-section={section}
              className={"shot-section-drop" + (dragTarget === section ? " is-drop-target" : "")}
              onDragOver={(event) => { if (isInternalDrag(event) || Array.from(event.dataTransfer.types).includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = isInternalDrag(event) ? "move" : "copy"; setDragTarget(section); } }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragTarget(null); }}
              onDrop={(event) => dropOnSection(event, section)}
            >
              <div className="section-title">
                <span className="shot-section-grip" role="button" tabIndex={0} title={"Glisser pour réordonner « " + section + " »"} onPointerDown={(event) => dragShot(event, section)}><GripVertical size={16} /></span>
                <button className="icon-btn small" aria-label={`${sectionConfig?.collapsed ? "Déplier" : "Replier"} ${section}`} onClick={() => toggleCollapsed(section)}>{sectionConfig?.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</button>
                <span>{section}</span>
                <button className="icon-btn small sec-tool" aria-label={`Regrouper les plans similaires de ${section}`} title="Regrouper automatiquement les plans similaires de cette section" disabled={simBusy} onClick={() => void groupSimilarShots(section)}><Layers size={15} /></button>
                {list.some((i) => String(i.includes ?? "")) && <button className="icon-btn small sec-tool" aria-label={`Dégrouper toute la section ${section}`} title="Remettre chaque plan à part dans cette section" onClick={() => { if (window.confirm(`Dégrouper toutes les séries de « ${section} » ?`)) update({ ...p, items: dissolveSeries(p.items, list.map((i) => i.id)) }, `Séries de « ${section} » dégroupées`); }}><Unlink size={15} /></button>}
                {cut.length > 0 && <button className="btn gold small" onClick={() => pasteInto(section)}><ClipboardPaste size={15} /> Coller ici ({cut.length})</button>}
                {selectMode && <button className="btn small" onClick={() => setPicked((cur) => [...new Set([...cur, ...list.map((i) => i.id)])])}>Sélectionner la section</button>}
                <span>
                  {list.filter(done).length}/{list.length}
                </span>
                <SectionProgress items={list} media={media} sequence="séquences" unit="prises" />
                <div className="section-tools">
                  <button className="icon-btn small" aria-label={`Ajouter une sous-section à ${section}`} title="Ajouter une sous-section" onClick={() => setSectionEditor({ title: "", parentId: sectionConfig?.id ?? section })}><Plus size={14} /></button>
                  <button className="icon-btn small" aria-label={`Renommer ${section}`} onClick={() => setSectionEditor({ title: section, original: sectionConfig ?? { id: crypto.randomUUID(), title: section, order: orderedSections.indexOf(section) } })}><Pencil size={14} /></button>
                  <button className="icon-btn small" aria-label={`Dupliquer ${section}`} onClick={() => duplicateSection(section)}><Copy size={14} /></button>
                  <button className="icon-btn small" aria-label={`Monter ${section}`} onClick={() => moveSection(section, -1)}>↑</button>
                  <button className="icon-btn small" aria-label={`${section} en première place`} title="Tout en haut" onClick={() => { const sib = siblingSectionTitles(configured, orderSections(active.map(sectionOf)), section); if (sib[0] && sib[0] !== section) moveSectionTo(section, sib[0]); }}>⤒</button>
                  <button className="icon-btn small" aria-label={`${section} en dernière place`} title="Tout en bas" onClick={() => { const sib = siblingSectionTitles(configured, orderSections(active.map(sectionOf)), section); const last = sib[sib.length - 1]; if (last && last !== section) moveSectionTo(section, last); }}>⤓</button>
                  <button className="icon-btn small" aria-label={`Descendre ${section}`} onClick={() => moveSection(section, 1)}>↓</button>
                  <button className="btn small" onClick={() => update({ ...p, shotSections: sectionConfig ? configured.map((s) => s.id === sectionConfig.id ? { ...s, hidden: true } : s) : [...configured, { id: crypto.randomUUID(), title: section, order: orderedSections.indexOf(section), hidden: true }] }, `Section « ${section} » masquée`)}>Masquer</button>
                  <button className="icon-btn small" aria-label={`Supprimer ${section}`} onClick={() => deleteSection(section)}><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="section-tools">
                <button className="btn small" onClick={() => setEditing(makeItem("shots", "", { section, order: nextOrder(p, "shots"), ...(kind !== "all" ? { media: kind } : {}) }))}><Plus size={14} /> Plan</button>
                <button className="btn small" onClick={() => setSectionActions(section)}><Plus size={14} /> Autre élément</button>
                <PickFiles className="btn small" label="Photo / vidéo" onFiles={(files) => setPending({ files, target: kind === "video" || kind === "drone" ? "video" : "photo", section })} />
                {(sectionConfig ? sectionTitles(sectionConfig.id) : []).map((child) => <button
                  className={"btn small" + (dragTarget === child.title ? " is-drop-target" : "")}
                  key={child.id}
                  data-reorder-section={child.title}
                  onClick={() => setSectionActions(child.title)}
                  onDragOver={(event) => { if (Array.from(event.dataTransfer.types).includes(shotDragType)) { event.preventDefault(); event.stopPropagation(); setDragTarget(child.title); } }}
                  onDrop={(event) => dropOnSection(event, child.title)}
                ><Plus size={14} /> {child.title.split(" · ").at(-1)}</button>)}
              </div>
              {!sectionConfig?.collapsed && <div className="insp-grid">
                {list.map((i) => (
                  <div key={i.id} className="shot-draggable" data-reorder={i.id} data-merge="" onClickCapture={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey) { event.preventDefault(); event.stopPropagation(); setSelectMode(true); setPicked((current) => (current.includes(i.id) ? current.filter((x) => x !== i.id) : [...current, i.id])); } }}>
                  <span className="shot-card-grip" role="button" tabIndex={0} title={`Glisser « ${i.title} » vers une autre place ou une autre section`} onPointerDown={(event) => dragShot(event, i.id)}><GripVertical size={13} /> Déplacer</span>
                  {(() => { const series = seriesMedia(media, i); const taken = series.filter((m) => doneAngles(i).has(m.id)).length; return series.length > 1 ? <span className={"pose-angles" + (taken === series.length ? " is-complete" : "")} title={`${series.length} angles · ${taken} pris`}><Layers size={12} /> {taken ? `${taken}/${series.length}` : series.length} prises</span> : null; })()}
                  {String(i.includes ?? "") && <button type="button" className="pose-ungroup" aria-label="Dégrouper : faire ressortir les vidéos" title="Dégrouper : faire ressortir les vidéos" onClick={() => update({ ...p, items: dissolveSeries(p.items, [i.id]) }, "Série dégroupée : les vidéos ressortent")}><Unlink size={13} /></button>}
                  {selectMode && <button type="button" className="pose-select" aria-pressed={picked.includes(i.id)} aria-label={`Cocher ${i.title}`} onClick={() => setPicked((current) => (current.includes(i.id) ? current.filter((x) => x !== i.id) : [...current, i.id]))}>{picked.includes(i.id) ? <Check size={18} /> : null}</button>}
                  <MediaCard
                    item={i}
                    animate={motion}
                    thumb={mediaFor(media, i)}
                    icon={<Clapperboard size={26} />}
                    operator={operators.get(String(i.operatorId))}
                    transition={transitions.get(i.id)}
                    onFavorite={() => patchItem(i.id, { favorite: i.favorite !== true })}
                    onView={() => setViewer({ ids: order.map((x) => x.id), start: Math.max(0, order.findIndex((x) => x.id === i.id)) })}
                    onEdit={() => setEditing(i)}
                  />
                  </div>
                ))}
              </div>}
              {!sectionConfig?.collapsed && !list.length && <p className="muted shot-section-empty">Aucun plan pour le moment · déposez ici un plan existant ou ajoutez-en un.</p>}
            </section>
          );
        })
      ) : (
        <Empty
          icon={<Clapperboard size={32} />}
          title={active.length ? "Aucun plan ne correspond" : "Votre shot list commence ici"}
          text={active.length ? "Essayez une autre recherche ou retirez les filtres pour retrouver vos plans." : "Chargez la trame complète ou ajoutez vos plans un par un."}
          action={active.length ? <button className="btn gold" onClick={resetFilters}><RotateCcw size={17} /> Effacer les filtres</button> :
            <button className="btn gold" onClick={() => setConfirmLoad(true)}>
              <Film size={17} /> Charger la shot-list complète
            </button>
          }
        />
      )}

      {confirmLoad && (
        <Sheet title="Charger la shot-list complète ?" onClose={() => setConfirmLoad(false)}>
          <p className="muted">
            {shotListCount} plans professionnels s’ajoutent à ceux déjà présents, chapitre par chapitre :
            préparatifs, portraits, cortège, famille, cérémonie, cocktail, interviews, réception, ouverture de
            bal, transitions. Rien n’est supprimé.
          </p>
          <div className="form-actions">
            <button className="btn" onClick={() => setConfirmLoad(false)}>
              Annuler
            </button>
            <button className="btn gold" onClick={loadShotList}>
              <Check size={16} /> Charger les {shotListCount} plans
            </button>
          </div>
        </Sheet>
      )}

      {viewer && <ShotViewer ids={viewer.ids} start={viewer.start} context="Plans & scènes" onClose={() => setViewer(null)} />}
      {configured.some((s) => s.hidden) && <details className="card" style={{ marginTop: 14 }}>
        <summary>Sections masquées ({configured.filter((s) => s.hidden).length})</summary>
        <div className="stack" style={{ marginTop: 10 }}>
          {configured.filter((s) => s.hidden).map((section) => <div className="row" key={section.id}><span>{section.title}</span><button className="btn small" onClick={() => update({ ...p, shotSections: configured.map((s) => s.id === section.id ? { ...s, hidden: false } : s) }, `Section « ${section.title} » réaffichée`)}>Réafficher</button></div>)}
          <button className="btn small" onClick={() => setShowHiddenSections((value) => !value)}>{showHiddenSections ? "Masquer temporairement le contenu" : "Afficher le contenu masqué"}</button>
        </div>
      </details>}
      {bulk && <BulkAdd sections={orderSections([...all.map(sectionOf), ...(p.shotSections ?? []).map((s) => s.title), ...shotSections])} kind={kind === "all" ? "video" : kind} onClose={() => setBulk(false)} />}
      <DropVeil show={dragging} text="Chaque fichier devient un plan illustré." />
      <ImportProgress jobs={importer.jobs} />
      {pending && (
        <ImportSheet
          files={pending.files}
          target={pending.target}
          targets={["photo", "video", "reference"]}
          sections={orderSections([...all.map(sectionOf), ...(p.shotSections ?? []).map((s) => s.title), ...shotSections])}
          section={pending.section}
          category={pending.section}
          categories={orderSections([...all.map(sectionOf), ...(p.shotSections ?? []).map((s) => s.title), ...shotSections])}
          onClose={() => setPending(null)}
          onConfirm={(target, section, category) => {
            const existing = target === "reference" ? itemsOf(p, "inspirations").length : active.filter((s) => (s.media ?? "") === target).length;
            void importer.run(pending.files, target, target === "reference" ? { ...(category || section ? { category: category || section, section: section || category } : {}) } : section ? { section } : {}, existing);
            setPending(null);
          }}
        />
      )}
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
      {sectionActions && <Sheet title={`Ajouter dans « ${sectionActions} »`} onClose={() => setSectionActions(null)}>
        <div className="stack">
          <button className="btn" onClick={() => { setEditing(makeItem("shots", "", { section: sectionActions, order: nextOrder(p, "shots"), ...(kind !== "all" ? { media: kind } : {}) })); setSectionActions(null); }}>Plan</button>
          <button className="btn" onClick={() => { setEditing(makeItem("shots", "", { section: sectionActions, bRoll: "oui", order: nextOrder(p, "shots") })); setSectionActions(null); }}>Plan B-roll</button>
          <PickFiles label="Photo / vidéo" onFiles={(files) => { setPending({ files, target: kind === "video" || kind === "drone" ? "video" : "photo", section: sectionActions }); setSectionActions(null); }} />
          {([
            ["poses", "Pose photo", { section: sectionActions, category: sectionActions }],
            ["inspirations", "Référence photo / vidéo", { section: sectionActions, category: sectionActions }],
            ["notes", "Note", { section: sectionActions, category: sectionActions }],
            ["checklists", "Checklist", { section: sectionActions, category: sectionActions, phase: "jourj" }],
            ["reminders", "Rappel", { section: sectionActions, trigger: "before-start", offset: 15, priority: "IMPORTANT" }],
          ] as const).map(([module, label, values]) => <button className="btn" key={module} onClick={() => { setSectionActions(null); setEditing(makeItem(module, "", { ...values, order: nextOrder(p, module) })); }}>{label}</button>)}
        </div>
      </Sheet>}
      {sectionEditor && <Sheet title={sectionEditor.original ? "Renommer la section" : sectionEditor.parentId ? "Nouvelle sous-section" : "Nouvelle section"} onClose={() => setSectionEditor(null)}>
        <label className="field">Nom<input autoFocus value={sectionEditor.title} onChange={(e) => setSectionEditor({ ...sectionEditor, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") saveSection(); }} /></label>
        <div className="form-actions"><button className="btn" onClick={() => setSectionEditor(null)}>Annuler</button><button className="btn gold" onClick={saveSection}>Enregistrer</button></div>
      </Sheet>}
    </Screen>
  );
}
