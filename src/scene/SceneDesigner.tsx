import SceneDisplay, { cleanScene } from "./SceneDisplay";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BoxSelect,
  ChevronDown,
  ChevronUp,
  Download,
  Expand,
  Eye,
  EyeOff,
  Hand,
  Image as ImageIcon,
  Layers as LayersIcon,
  Lock,
  LockOpen,
  Magnet,
  Maximize,
  Minimize,
  MousePointer2,
  Move,
  Pause,
  Play,
  Plus,
  Redo2,
  Route,
  SlidersHorizontal,
  Timer,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Point, SceneBackground, SceneElement, ScenePlan, TimelineCue } from "./types";
import { assetById, layers, movementById, roles } from "./catalog";
import { addElements, alignElements, duplicateElements, expandGroups, groupElements, makeElement, makeLight, makePerson, removeElements, reorder, setLayer, shiftElement, ungroupElements, updateElements, withMovement, type Align } from "./ops";
import { sceneLength } from "./motion";
import { useScenePlans } from "./store";
import { usePlayback } from "./usePlayback";
import SceneCanvas, { type CanvasHandle, type Tool } from "./SceneCanvas";
import Library, { type LibraryPick } from "./Library";
import Inspector from "./Inspector";
import TimelinePanel, { timecode } from "./Timeline";
import MediaPicker from "./MediaPicker";
import CameraCard from "./CameraCard";
import { useProject } from "../store";
import { Empty, navigate, useMedia, useMediaQuery } from "../ui";
import { itemsOf, nextOrder, operatorsOf } from "../screens/common";
import { makeItem } from "../model";
import "./scene.css";

type Panel = "library" | "inspector" | "timeline" | "layers";
const pathTypes = new Set(["dolly", "tracking", "custom", "walk", "fly-over"]);
const PHONE = "(max-width: 767px) and (orientation: portrait)";

/** Export du plan (image vectorielle ou PNG haute définition), photo de fond incluse. */
async function exportPlan(svgEl: SVGSVGElement, plan: ScenePlan, kind: "svg" | "png") {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const pad = 1;
  const minX = Math.min(0, ...plan.elements.map((e) => e.x - (e.w ?? 1)));
  const minY = Math.min(0, ...plan.elements.map((e) => e.y - (e.h ?? 1)));
  const maxX = Math.max(plan.width, ...plan.elements.map((e) => e.x + (e.w ?? 1)));
  const maxY = Math.max(plan.height, ...plan.elements.map((e) => e.y + (e.h ?? 1)));
  const scale = 80;
  clone.setAttribute("viewBox", `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`);
  clone.setAttribute("width", String(Math.round((maxX - minX + pad * 2) * scale)));
  clone.setAttribute("height", String(Math.round((maxY - minY + pad * 2) * scale)));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.querySelectorAll("[data-role]").forEach((n) => n.remove());
  // L'image de fond est intégrée au fichier (sinon elle manquerait hors de l'application).
  for (const img of Array.from(clone.querySelectorAll("image"))) {
    const href = img.getAttribute("href");
    if (!href?.startsWith("blob:")) continue;
    const blob = await (await fetch(href)).blob();
    const data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
    img.setAttribute("href", data);
  }
  const text = new XMLSerializer().serializeToString(clone);
  const name = plan.name.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "plan";
  const save = (blob: Blob, file: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  if (kind === "svg") return save(new Blob([text], { type: "image/svg+xml" }), `${name}.svg`);
  const image = new Image();
  image.src = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Number(clone.getAttribute("width"));
  canvas.height = Number(clone.getAttribute("height"));
  canvas.getContext("2d")!.drawImage(image, 0, 0);
  URL.revokeObjectURL(image.src);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (blob) save(blob, `${name}.png`);
}

/**
 * Scene Designer : construire le lieu vu du dessus, placer personnes, caméras et lumières,
 * dessiner leurs mouvements et jouer la scène. Plein écran, pensé pour ordinateur et tablette,
 * utilisable au téléphone (panneaux sous le plan).
 */
export default function SceneDesigner({ id }: { id: string }) {
  const { project: p, notify, update, undo, redo, canUndo, canRedo } = useProject();
  const { plans, save } = useScenePlans();
  const plan = plans.find((s) => s.id === id);
  const [display, setDisplay] = useState(cleanScene);
  const media = useMedia(p.id);
  const canvas = useRef<CanvasHandle>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Écran plein : sur mobile/tablette, masque aussi la barre d'adresse — plus de place pour construire
  // et lire l'animation, surtout en paysage. Sort tout seul (Échap, geste système) : on suit l'état réel.
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === screenRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      screen.orientation?.unlock?.();
      void document.exitFullscreen();
    } else if (screenRef.current?.requestFullscreen) {
      screenRef.current
        .requestFullscreen()
        // Bascule automatique en paysage là où le navigateur le permet (Android). Safari iOS ne le
        // propose pas : le plein écran seul (barre d'adresse masquée) reste le gain, à tourner à la main.
        .then(() => void (screen.orientation as { lock?: (o: string) => Promise<void> })?.lock?.("landscape").catch(() => {}))
        .catch(() => notify("Plein écran indisponible sur ce navigateur"));
    }
  };
  const [selection, setSelection] = useState<string[]>([]);
  const [draft, setDraft] = useState<Map<string, SceneElement> | null>(null);
  const [bgDraft, setBgDraft] = useState<SceneBackground | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [snapOn, setSnapOn] = useState(true);
  const [panel, setPanel] = useState<Panel>("inspector");
  const [picker, setPicker] = useState<{ for: "background" } | { for: "reference"; el: SceneElement } | null>(null);
  const [card, setCard] = useState<SceneElement | null>(null);
  const [menu, setMenu] = useState(false);
  const [multi, setMulti] = useState(false);
  // Téléphone : outils posés sur le plan, panneau repliable pour laisser tout l'écran au plan.
  const compact = useMediaQuery("(max-width: 767px)");
  const phone = useMediaQuery(PHONE);
  const noFooter = useMediaQuery("(max-width: 767px), (max-height: 500px) and (orientation: landscape)");
  const [sheetOpen, setSheetOpen] = useState(() => !(typeof matchMedia === "function" && matchMedia(PHONE).matches));
  const operators = operatorsOf(p);
  const team = itemsOf(p, "team");
  const shots = itemsOf(p, "shots").filter((s) => !plan?.stageId || s.stageId === plan.stageId);
  const duration = plan ? Math.max(plan.duration, sceneLength(plan.elements)) : 1;
  // Horloge de lecture : une seule pour toute la scène, vitesse et boucle réglables.
  const { time, setTime, playing, setPlaying, toggle, loop, setLoop, speed, setSpeed, timeRef } = usePlayback(duration);

  const selected = plan ? plan.elements.filter((el) => selection.includes(el.id)) : [];
  const single = selected.length === 1 ? selected[0] : undefined;
  const commit = (next: ScenePlan, message?: string) => {
    setDraft(null);
    save(next, message);
  };

  // Raccourcis : Suppr, ⌘D, flèches, Échap, espace.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!plan) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, dialog")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selection.length) {
        e.preventDefault();
        commit(removeElements(plan, selection), `${selection.length} élément(s) supprimé(s)`);
        setSelection([]);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && selection.length) {
        e.preventDefault();
        const copy = duplicateElements(plan, selection);
        commit(copy.plan, "Dupliqué");
        setSelection(copy.ids);
      } else if (e.key === "Escape") {
        setSelection([]);
        setTool("select");
        setMulti(false);
      } else if (e.key === " " && !e.metaKey) {
        e.preventDefault();
        setPlaying((v) => !v);
      } else if (e.key.startsWith("Arrow") && selection.length) {
        e.preventDefault();
        const d = e.shiftKey ? 1 : 0.1;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        commit(updateElements(plan, selection, (el) => (el.locked ? el : shiftElement(el, dx, dy))));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!plan)
    return (
      <div className="sd-screen">
        <Empty title="Ce plan de scène n’existe plus" text="Retrouvez vos plans dans « Plans de scène »." action={<button className="btn gold" onClick={() => navigate("/scenes")}>Plans de scène</button>} />
      </div>
    );

  const view: ScenePlan = {
    ...plan,
    ...(bgDraft ? { background: bgDraft } : {}),
    elements: draft ? plan.elements.map((el) => draft.get(el.id) ?? el) : plan.elements,
  };
  const add = (element: SceneElement, message?: string) => {
    commit(addElements(plan, [element]), message ?? `${element.name} ajouté`);
    setSelection([element.id]);
    setPanel("inspector");
    setSheetOpen(!phone);
    setTool("select");
  };
  const place = (pick: LibraryPick | string, at?: Point) => {
    const c = at ?? canvas.current?.center() ?? { x: plan.width / 2, y: plan.height / 2 };
    const jitter = at ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * 1.2, y: (Math.random() - 0.5) * 1.2 };
    const pos = { x: Math.round((c.x + jitter.x) * 10) / 10, y: Math.round((c.y + jitter.y) * 10) / 10 };
    const key = typeof pick === "string" ? pick : "asset" in pick ? "asset:" + pick.asset.id : "role" in pick ? "role:" + pick.role : "light:" + pick.light;
    const [kind, value] = key.split(":");
    if (kind === "role") return add(makePerson(value, pos, { name: roles.find((r) => r.id === value)?.label }));
    if (kind === "light") return add(makeLight(value, pos));
    const def = assetById(value);
    if (def) add(makeElement(plan, def, pos));
  };
  const patch = (ids: string[], change: Partial<SceneElement> | ((el: SceneElement) => SceneElement), message?: string) => commit(updateElements(plan, ids, change), message);
  const preview = (ids: string[], change: Partial<SceneElement> | ((el: SceneElement) => SceneElement)) =>
    setDraft(new Map(plan.elements.filter((el) => ids.includes(el.id)).map((el) => [el.id, typeof change === "function" ? change(el) : { ...el, ...change }])));
  // Enregistre le mouvement d'une caméra comme un plan à tourner, lié à l'étape du déroulé : un seul
  // update() (items + scenePlans ensemble) pour éviter qu'un enregistrement en efface un autre.
  const onCreateShot = (el: SceneElement) => {
    const move = movementById(el.motion?.type);
    const title = el.mission?.trim() || `${el.tag ?? el.name} — plan`;
    const item = makeItem("shots", title, {
      stageId: plan.stageId,
      operatorId: el.operatorId,
      framing: el.framing,
      movement: move?.label,
      order: nextOrder(p, "shots"),
    });
    const nextPlan = updateElements(plan, [el.id], (e) => ({ ...e, shotIds: [...(e.shotIds ?? []), item.id] }));
    update({ ...p, items: [...p.items, item], scenePlans: plans.map((s) => (s.id === nextPlan.id ? nextPlan : s)) }, "Plan créé et lié au déroulé");
  };
  const background = view.background;
  const openPanel = (pid: Panel) => {
    setPanel(pid);
    setSheetOpen(true);
  };
  const panelVisible = (pid: Panel) => panel === pid && (sheetOpen || !phone);
  const cue = [...plan.cues].sort((a, b) => a.t - b.t).filter((c) => c.t <= time + 0.05).at(-1);
  const label = (el: SceneElement) => (el.kind === "camera" ? el.tag ?? el.name : el.name);

  const toolButtons = (
    <>
      <button
        className={"icon-btn" + (tool === "select" && !multi ? " on" : "")}
        aria-pressed={tool === "select" && !multi}
        aria-label="Sélection"
        title="Sélection"
        onClick={() => {
          setTool("select");
          setMulti(false);
        }}
      >
        <MousePointer2 size={18} />
      </button>
      <button className={"icon-btn" + (tool === "pan" ? " on" : "")} aria-pressed={tool === "pan"} aria-label="Déplacer la vue" title="Déplacer la vue sans bouger les éléments" onClick={() => { setTool("pan"); setMulti(false); }}>
        <Hand size={18} />
      </button>
      <button
        className={"icon-btn" + (multi ? " on" : "")}
        aria-pressed={multi}
        aria-label="Sélection multiple"
        title="Sélection multiple : touchez plusieurs éléments, ou glissez sur le vide pour les entourer"
        onClick={() => {
          setTool("select");
          setMulti(!multi);
        }}
      >
        <BoxSelect size={18} />
      </button>
      <button
        className={"icon-btn" + (tool === "path" ? " on" : "")}
        aria-pressed={tool === "path"}
        aria-label="Dessiner une trajectoire"
        title="Dessiner une trajectoire (élément sélectionné)"
        disabled={!single?.motion || !pathTypes.has(single.motion.type)}
        onClick={() => setTool(tool === "path" ? "select" : "path")}
      >
        <Route size={18} />
      </button>
      <button className={"icon-btn" + (tool === "background" ? " on" : "")} aria-pressed={tool === "background"} aria-label="Déplacer la photo de fond" title="Déplacer la photo de fond" disabled={!plan.background} onClick={() => setTool(tool === "background" ? "select" : "background")}>
        <Move size={18} />
      </button>
      <button className={"icon-btn" + (snapOn ? " on" : "")} aria-pressed={snapOn} aria-label="Aimanter" title="Aimanter à la grille (25 cm, 15°)" onClick={() => setSnapOn(!snapOn)}>
        <Magnet size={18} />
      </button>
    </>
  );
  const viewButtons = (
    <>
      <button className="icon-btn" aria-label="Zoom avant" title="Zoom avant" onClick={() => canvas.current?.zoom(1.3)}>
        <ZoomIn size={18} />
      </button>
      <button className="icon-btn" aria-label="Zoom arrière" title="Zoom arrière" onClick={() => canvas.current?.zoom(1 / 1.3)}>
        <ZoomOut size={18} />
      </button>
      <button className="icon-btn" aria-label="Tout voir" title="Tout voir" onClick={() => canvas.current?.fit()}>
        <Maximize size={18} />
      </button>
      {typeof document !== "undefined" && document.fullscreenEnabled !== false && (
        <button className={"icon-btn" + (fullscreen ? " on" : "")} aria-pressed={fullscreen} aria-label={fullscreen ? "Quitter le plein écran" : "Plein écran"} title={fullscreen ? "Quitter le plein écran" : "Plein écran — plus de place pour construire et voir l’animation"} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize size={18} /> : <Expand size={18} />}
        </button>
      )}
    </>
  );

  return (
    <div ref={screenRef} className={"sd-screen panel-" + panel + (sheetOpen ? "" : " sheet-closed") + (fullscreen ? " sd-fullscreen" : "")}>
      <header className="sd-top">
        <button className="icon-btn" aria-label="Retour" onClick={() => navigate(plan.stageId ? "/etape/" + plan.stageId : "/scenes")}>
          <ArrowLeft size={21} />
        </button>
        <input
          className="sd-name"
          aria-label="Nom du plan"
          defaultValue={plan.name}
          key={plan.name}
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (name && name !== plan.name) commit({ ...plan, name }, "Plan renommé");
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        />
        <div className="sd-toolbar" role="toolbar" aria-label="Outils">
          {!compact && (
            <>
              {toolButtons}
              <span className="sd-sep" />
              {viewButtons}
              <span className="sd-sep" />
            </>
          )}
          <button className="icon-btn" aria-label="Annuler" title="Annuler (⌘Z)" disabled={!canUndo} onClick={undo}>
            <Undo2 size={18} />
          </button>
          <button className="icon-btn" aria-label="Rétablir" title="Rétablir (⇧⌘Z)" disabled={!canRedo} onClick={redo}>
            <Redo2 size={18} />
          </button>
          <button className={"icon-btn" + (menu ? " on" : "")} aria-expanded={menu} aria-label="Fond, export et réglages" title="Fond, export et réglages" onClick={() => setMenu(!menu)}>
            <ImageIcon size={18} />
          </button>
        </div>
        {menu && (
          <>
            <button type="button" className="sd-menu-backdrop" aria-label="Fermer le menu" onClick={() => setMenu(false)} />
            <div className="sd-menu">
              <div className="sd-menu-group">
                <strong>Photo ou plan du lieu en fond</strong>
                <div className="btn-row">
                  <button className="btn small" onClick={() => setPicker({ for: "background" })}>
                    <ImageIcon size={15} /> {plan.background ? "Changer l’image" : "Choisir une image"}
                  </button>
                  {plan.background && (
                    <>
                      <button className="btn small" onClick={() => commit({ ...plan, background: { ...plan.background!, locked: !plan.background!.locked } }, plan.background?.locked ? "Fond déverrouillé" : "Fond verrouillé")}>
                        {plan.background.locked ? <LockOpen size={15} /> : <Lock size={15} />} {plan.background.locked ? "Déverrouiller" : "Verrouiller"}
                      </button>
                      <button className="btn small danger" onClick={() => commit({ ...plan, background: undefined }, "Fond retiré")}>
                        <Trash2 size={15} /> Retirer
                      </button>
                    </>
                  )}
                </div>
                {background && (
                  <div className="sd-row">
                    <label className="sd-field sd-range">
                      <span>
                        Opacité <b>{Math.round(background.opacity * 100)} %</b>
                      </span>
                      <input type="range" min={0.1} max={1} step={0.05} value={background.opacity} onChange={(e) => setBgDraft({ ...background, opacity: Number(e.target.value) })} onPointerUp={() => bgDraft && (commit({ ...plan, background: bgDraft }), setBgDraft(null))} />
                    </label>
                    <label className="sd-field sd-range">
                      <span>
                        Largeur réelle <b>{background.w.toFixed(1)} m</b>
                      </span>
                      <input type="range" min={3} max={120} step={0.5} value={background.w} onChange={(e) => setBgDraft({ ...background, w: Number(e.target.value) })} onPointerUp={() => bgDraft && (commit({ ...plan, background: bgDraft }), setBgDraft(null))} />
                    </label>
                  </div>
                )}
                {plan.background && <p className="muted sd-hint">Outil « Déplacer la photo de fond » (flèches croisées) pour la caler, puis verrouillez-la.</p>}
              </div>
              <div className="sd-menu-group">
                <strong>Zone de travail</strong>
                <div className="sd-row">
                  <label className="sd-field">
                    <span>Largeur (m)</span>
                    <input type="number" min={2} max={300} defaultValue={plan.width} onBlur={(e) => Number(e.target.value) > 1 && commit({ ...plan, width: Number(e.target.value) }, "Zone modifiée")} />
                  </label>
                  <label className="sd-field">
                    <span>Profondeur (m)</span>
                    <input type="number" min={2} max={300} defaultValue={plan.height} onBlur={(e) => Number(e.target.value) > 1 && commit({ ...plan, height: Number(e.target.value) }, "Zone modifiée")} />
                  </label>
                </div>
              </div>
              <div className="sd-menu-group">
                <strong>Exporter</strong>
                <div className="btn-row">
                  <button className="btn small" onClick={() => void exportPlan(canvas.current!.svg()!, view, "png").then(() => notify("Image PNG exportée"))}>
                    <Download size={15} /> Image PNG
                  </button>
                  <button className="btn small" onClick={() => void exportPlan(canvas.current!.svg()!, view, "svg").then(() => notify("Plan SVG exporté"))}>
                    <Download size={15} /> Plan SVG
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      <div className="sd-body">
        <aside className="sd-left" aria-label="Bibliothèque">
          <Library onPick={(pick) => place(pick)} />
        </aside>
        <main className="sd-center">
          <SceneDisplay value={display} onChange={setDisplay}/>
          <SceneCanvas
            display={display}
            ref={canvas}
            plan={view}
            time={time}
            selection={selection}
            editable={!playing}
            tool={tool}
            multi={multi}
            snapOn={snapOn}
            media={media}
            operatorColor={(oid) => (oid ? operators.get(oid)?.color : undefined)}
            onSelect={(ids) => setSelection(expandGroups(plan, ids))}
            onDraft={(els) => setDraft(els ? new Map(els.map((el) => [el.id, el])) : null)}
            onCommit={(els, message) => {
              const map = new Map(els.map((el) => [el.id, el]));
              commit({ ...plan, elements: plan.elements.map((el) => map.get(el.id) ?? el) }, message);
            }}
            onPathPoint={(pt) => {
              if (!single?.motion || !pathTypes.has(single.motion.type)) return;
              commit(updateElements(plan, [single.id], (el) => ({ ...el, motion: { ...el.motion!, path: [...(el.motion!.path ?? []), pt] } })));
            }}
            onMovePathPoint={(index, pt, done) => {
              if (!single?.motion?.path) return;
              const next: SceneElement = { ...single, motion: { ...single.motion, path: single.motion.path.map((q, n) => (n === index ? pt : q)) } };
              if (done) commit(updateElements(plan, [single.id], () => next));
              else setDraft(new Map([[single.id, next]]));
            }}
            onCancel={() => { setDraft(null); setBgDraft(null); }}
            onBackground={(bg, done) => {
              if (done) {
                setBgDraft(null);
                commit({ ...plan, background: bg });
              } else setBgDraft(bg);
            }}
            onOpen={(el) => el.kind === "camera" && setCard(el)}
            onDropAsset={(key, at) => place(key, at)}
          />
          {compact && (
            <>
              <div className="sd-rail sd-rail-tools" role="toolbar" aria-label="Outils du plan">
                {toolButtons}
              </div>
              <div className="sd-rail sd-rail-view" role="toolbar" aria-label="Vue">
                {viewButtons}
              </div>
            </>
          )}
          {tool === "pan" && <p className="sd-banner">Glissez pour explorer · les éléments restent en place</p>}
          {tool === "path" && <p className="sd-banner">Touchez le plan pour poser les points de la trajectoire · {compact ? "touchez « Sélection » pour terminer" : "Échap pour terminer"}</p>}
          {tool === "background" && <p className="sd-banner">Glissez pour caler la photo du lieu sous le plan</p>}
          {multi && tool === "select" && <p className="sd-banner">Sélection multiple : touchez les éléments, ou glissez sur le vide pour les entourer</p>}
          {phone && selected.length > 0 && !panelVisible("inspector") && tool === "select" && !multi && (
            <button type="button" className="sd-selchip" onClick={() => openPanel("inspector")}>
              <SlidersHorizontal size={15} />
              <span>{selected.length === 1 ? label(selected[0]) : `${selected.length} éléments`}</span>
              <b>Régler</b>
            </button>
          )}
          {noFooter && !panelVisible("timeline") && (
            <div className="sd-mini">
              <button className="sd-play" aria-label={playing ? "Pause" : "Lecture"} onClick={toggle}>
                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <button type="button" className="sd-mini-time" onClick={() => openPanel("timeline")} aria-label="Ouvrir la timeline">
                <span className="sd-time">
                  {timecode(time)} <small>/ {timecode(duration)}</small>
                </span>
                {cue && <em>{cue.text}</em>}
              </button>
            </div>
          )}
          {!panelVisible("library") && (
            <button className="sd-fab" aria-label="Ajouter un élément" onClick={() => openPanel("library")}>
              <Plus size={22} />
            </button>
          )}
        </main>
        <aside className="sd-right" aria-label="Réglages">
          <div className="sd-tabbar">
          <nav className="sd-tabs" role="tablist">
            {(
              [
                ["library", "Ajouter", Plus],
                ["inspector", "Réglages", SlidersHorizontal],
                ["layers", "Calques", LayersIcon],
                ["timeline", "Timeline", Timer],
              ] as [Panel, string, typeof Plus][]
            ).map(([pid, name, Icon]) => (
              <button
                key={pid}
                role="tab"
                aria-selected={panel === pid}
                className={panelVisible(pid) ? "on" : ""}
                onClick={() => {
                  // Au téléphone, toucher l'onglet ouvert replie le panneau : tout l'écran revient au plan.
                  if (phone && panel === pid && sheetOpen) setSheetOpen(false);
                  else openPanel(pid);
                }}
              >
                <Icon size={16} /> {name}
              </button>
            ))}
          </nav>
            {phone && (
              <button type="button" className="icon-btn sd-sheet-toggle" aria-label={sheetOpen ? "Replier le panneau" : "Déplier le panneau"} aria-expanded={sheetOpen} onClick={() => setSheetOpen(!sheetOpen)}>
                {sheetOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            )}
          </div>
          <div className="sd-panel sd-panel-library">
            <Library onPick={(pick) => place(pick)} />
          </div>
          <div className="sd-panel sd-panel-inspector">
            <Inspector
              plan={view}
              selection={view.elements.filter((el) => selection.includes(el.id))}
              team={team}
              operators={operators}
              shots={shots}
              media={media}
              drawing={tool === "path"}
              onPatch={patch}
              onPreview={preview}
              onMovement={(el, type) => {
                commit(updateElements(plan, [el.id], (e) => withMovement(e, type, Math.round(timeRef.current * 10) / 10)), type === "none" ? "Mouvement retiré" : "Mouvement ajouté");
                if (pathTypes.has(type)) setTool("path");
              }}
              onRemove={() => {
                commit(removeElements(plan, selection), `${selection.length} élément(s) supprimé(s)`);
                setSelection([]);
              }}
              onDuplicate={() => {
                const copy = duplicateElements(plan, selection);
                commit(copy.plan, "Dupliqué");
                setSelection(copy.ids);
              }}
              onGroup={() => commit(groupElements(plan, selection), "Groupé")}
              onUngroup={() => commit(ungroupElements(plan, selection), "Dégroupé")}
              onAlign={(mode: Align) => commit(alignElements(plan, selection, mode), "Aligné")}
              onOrder={(where) => commit(reorder(plan, selection, where))}
              onDrawPath={() => setTool(tool === "path" ? "select" : "path")}
              onPinReference={(el) => setPicker({ for: "reference", el })}
              onCreateShot={onCreateShot}
              onOpenCard={setCard}
            />
          </div>
          <div className="sd-panel sd-panel-layers">
            <LayersPanel
              plan={plan}
              selection={selection}
              onLayer={(layer, change) => commit(setLayer(plan, layer, change))}
              onSelect={(ids) => {
                setSelection(ids);
                openPanel("inspector");
              }}
            />
          </div>
          <div className="sd-panel sd-panel-timeline sd-timeline-mobile">
            {timeline()}
          </div>
        </aside>
      </div>
      <footer className="sd-bottom">{timeline()}</footer>

      {picker && (
        <MediaPicker
          title={picker.for === "background" ? "Photo ou plan du lieu" : "Référence à reproduire"}
          ownerId={plan.id}
          media={media}
          videos={picker.for !== "background"}
          onClose={() => setPicker(null)}
          onPick={(m) => {
            if (picker.for === "background") {
              const w = Math.max(plan.width, 10);
              commit({ ...plan, background: { mediaId: m.id, x: 0, y: 0, w, opacity: 0.55 } }, "Photo du lieu en fond · calez-la puis verrouillez-la");
              setTool("background");
              setMenu(false);
            } else commit(updateElements(plan, [picker.el.id], { referenceId: m.id }), "Référence épinglée sur " + (picker.el.tag ?? picker.el.name));
            setPicker(null);
          }}
        />
      )}
      {card && <CameraCard el={plan.elements.find((e) => e.id === card.id) ?? card} plan={plan} media={media} operator={operators.get(String(card.operatorId))} shots={shots} onClose={() => setCard(null)} />}
    </div>
  );

  function timeline() {
    if (!plan) return null;
    return (
      <TimelinePanel
        plan={view}
        time={time}
        playing={playing}
        loop={loop}
        speed={speed}
        selection={selection}
        editable={!playing}
        onTime={(t) => {
          setPlaying(false);
          setTime(t);
        }}
        onToggle={toggle}
        onReset={() => {
          setPlaying(false);
          setTime(0);
        }}
        onLoop={() => setLoop(!loop)}
        onSpeed={setSpeed}
        onSelect={(sid) => setSelection([sid])}
        onClip={(sid, start, dur, done) => {
          const el = plan.elements.find((e) => e.id === sid);
          if (!el?.motion) return;
          const next = { ...el, motion: { ...el.motion, start, duration: dur } };
          if (!done) return setDraft(new Map([[sid, next]]));
          if (start === el.motion.start && dur === el.motion.duration) return setDraft(null);
          commit(updateElements(plan, [sid], () => next), "Timing modifié");
        }}
        onCues={(cues: TimelineCue[]) => commit({ ...plan, cues }, "Repères mis à jour")}
      />
    );
  }
}

/** Calques : afficher / verrouiller par famille, et la liste des éléments pour les retrouver vite. */
function LayersPanel({
  plan,
  selection,
  onLayer,
  onSelect,
}: {
  plan: ScenePlan;
  selection: string[];
  onLayer: (layer: (typeof layers)[number][0], change: { hidden?: boolean; locked?: boolean }) => void;
  onSelect: (ids: string[]) => void;
}) {
  return (
    <div className="sd-layers">
      {layers.map(([lid, label]) => {
        const items = plan.elements.filter((el) => el.layer === lid);
        const state = plan.layers?.[lid] ?? {};
        return (
          <section key={lid}>
            <header>
              <strong>{label}</strong>
              <small>{items.length}</small>
              <button className="icon-btn" aria-label={(state.hidden ? "Afficher " : "Masquer ") + label} onClick={() => onLayer(lid, { hidden: !state.hidden })}>
                {state.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button className="icon-btn" aria-label={(state.locked ? "Déverrouiller " : "Verrouiller ") + label} onClick={() => onLayer(lid, { locked: !state.locked })}>
                {state.locked ? <Lock size={16} /> : <LockOpen size={16} />}
              </button>
            </header>
            {items.map((el) => (
              <button key={el.id} type="button" className={"sd-layer-item" + (selection.includes(el.id) ? " on" : "") + (el.hidden ? " is-hidden" : "")} onClick={() => onSelect([el.id])}>
                {el.kind === "camera" ? el.tag : el.name}
                {el.motion && <em>{el.motion.type === "static" ? "" : "animé"}</em>}
                {el.locked && <Lock size={12} />}
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}
