import type { SceneDisplayOptions } from "./SceneDisplay";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { MediaEntry } from "../types";
import type { Point, SceneBackground, SceneElement, ScenePlan } from "./types";
import { useObjectUrl } from "../ui";
import { angleTo, bounds, clamp, contains, direction, dist, rad, round, sizeOf, snap } from "./geometry";
import { poseAt, trail, type Pose } from "./motion";
import { shiftElement } from "./ops";
import { AudioNode, CameraNode, CrowdNode, DroneNode, FovCone, LightNode, NoteNode, PersonNode, StaticNode, Trail } from "./nodes";

export type Tool = "select" | "pan" | "path" | "background";
export interface CanvasHandle {
  fit: () => void;
  zoom: (factor: number) => void;
  center: () => Point;
  svg: () => SVGSVGElement | null;
}
interface Props {
  plan: ScenePlan;
  display?: SceneDisplayOptions;
  time: number;
  selection: string[];
  editable: boolean;
  tool: Tool;
  /** Sélection multiple au toucher : chaque élément touché s'ajoute, glisser sur le vide entoure. */
  multi?: boolean;
  snapOn: boolean;
  media: MediaEntry[];
  operatorColor: (id?: string) => string | undefined;
  onSelect: (ids: string[]) => void;
  onDraft: (elements: SceneElement[] | null) => void;
  onCommit: (elements: SceneElement[], message?: string) => void;
  onPathPoint?: (p: Point) => void;
  onMovePathPoint?: (index: number, p: Point, commit: boolean) => void;
  onBackground?: (bg: SceneBackground, commit: boolean) => void;
  onCancel?: () => void;
  onOpen?: (el: SceneElement) => void;
  onDropAsset?: (assetId: string, p: Point) => void;
}

const SIZED = new Set(["zone", "wall", "object", "rows", "crowd"]);
const MOVERS = new Set(["camera", "person", "drone", "light", "crowd"]);
type Gesture =
  | { type: "pan"; x: number; y: number; cx: number; cy: number }
  | { type: "pinch"; d: number; mid: Point; world: Point; scale: number }
  | { type: "move"; start: Point; originals: SceneElement[]; moved: boolean; toggle?: string }
  | { type: "rotate"; el: SceneElement }
  | { type: "resize"; el: SceneElement }
  | { type: "marquee"; start: Point; now: Point }
  | { type: "waypoint"; index: number }
  | { type: "bg"; start: Point; bg: SceneBackground };

/**
 * Toile du plan de scène : unités en mètres, zoom et déplacement libres (molette, pincement),
 * sélection, glisser-déposer, rotation, redimensionnement, trajectoires. Un geste = une seule
 * écriture (brouillon local pendant le geste, validation au relâchement).
 */
const SceneCanvas = forwardRef<CanvasHandle, Props>(function SceneCanvas(props, ref) {
  const { plan, time, selection, editable, tool, snapOn, media } = props;
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [view, setView] = useState({ cx: plan.width / 2, cy: plan.height / 2, scale: 30 });
  const [marquee, setMarquee] = useState<{ a: Point; b: Point } | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const fitted = useRef(false);
  const lastTap = useRef<{ t: number; x: number; y: number; id?: string } | null>(null);
  const layers = plan.layers ?? {};
  const visible = plan.elements.filter((el) => !el.hidden && !layers[el.layer]?.hidden && (props.display?.decor !== false || !["rows", "crowd", "object", "note"].includes(el.kind)));
  const byId = useMemo(() => new Map(plan.elements.map((el) => [el.id, el])), [plan.elements]);
  const find = (id: string) => byId.get(id);
  const bgMedia = plan.background ? media.find((m) => m.id === plan.background!.mediaId) : undefined;
  const bgSharp = bgMedia && bgMedia.type.startsWith("image/") && (bgMedia.width ?? 0) * (bgMedia.height ?? 0) <= 16e6;
  const bgUrl = useObjectUrl(bgMedia ? (bgSharp ? bgMedia.blob : bgMedia.thumbnail ?? bgMedia.blob) : undefined);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: Math.max(50, entry.contentRect.width), h: Math.max(50, entry.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = () => {
    const b = bounds(plan.elements) ?? { minX: 0, minY: 0, maxX: plan.width, maxY: plan.height };
    const minX = Math.min(b.minX, 0);
    const minY = Math.min(b.minY, 0);
    const maxX = Math.max(b.maxX, plan.background || !plan.elements.length ? plan.width : b.maxX);
    const maxY = Math.max(b.maxY, plan.background || !plan.elements.length ? plan.height : b.maxY);
    const scale = clamp(Math.min(size.w / (maxX - minX + 2), size.h / (maxY - minY + 2)), 4, 400);
    fitted.current = false;
    setView({ cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, scale });
  };
  // Cadrage automatique tant qu'on n'a pas soi-même zoomé ou déplacé la vue (la taille de l'écran
  // peut changer à l'ouverture : panneaux, rotation de la tablette).
  useEffect(() => {
    if (fitted.current || size.w === 800) return;
    fit();
  }, [size.w, size.h]);
  useImperativeHandle(ref, () => ({
    fit,
    zoom: (factor) => {
      fitted.current = true;
      setView((v) => ({ ...v, scale: clamp(v.scale * factor, 4, 400) }));
    },
    center: () => ({ x: view.cx, y: view.cy }),
    svg: () => svg.current,
  }));

  const vw = size.w / view.scale;
  const vh = size.h / view.scale;
  const vx = view.cx - vw / 2;
  const vy = view.cy - vh / 2;
  const toWorld = (clientX: number, clientY: number): Point => {
    const r = svg.current!.getBoundingClientRect();
    return { x: vx + (clientX - r.left) / view.scale, y: vy + (clientY - r.top) / view.scale };
  };
  const step = snapOn ? 0.25 : 0.01;
  const selected = selection.length === 1 ? byId.get(selection[0]) : undefined;
  const lockedEl = (el: SceneElement) => el.locked || layers[el.layer]?.locked;

  function down(e: React.PointerEvent<SVGSVGElement>) {
    try {
      svg.current!.setPointerCapture(e.pointerId);
    } catch {
      // Pointeur déjà relâché (clic très bref, stylet) : le geste continue sans capture.
    }
    const p = toWorld(e.clientX, e.clientY);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      props.onDraft(null);
      gesture.current = { type: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y), mid, world: toWorld(mid.x, mid.y), scale: view.scale };
      return;
    }
    // L'outil main et la molette enfoncée déplacent la vue même au-dessus d'un élément.
    if (tool === "pan" || e.button === 1) {
      e.preventDefault();
      fitted.current = true;
      gesture.current = { type: "pan", x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
      return;
    }
    // Double toucher (le navigateur tactile n'émet pas toujours « dblclick ») : fiche de la caméra, ou recadrage sur le vide.
    if (e.pointerType !== "mouse" && tool === "select") {
      const tapId = (e.target as Element).closest("[data-id]")?.getAttribute("data-id") ?? undefined;
      const prev = lastTap.current;
      lastTap.current = { t: e.timeStamp, x: e.clientX, y: e.clientY, id: tapId };
      if (prev && e.timeStamp - prev.t < 320 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 24 && prev.id === tapId) {
        lastTap.current = null;
        const el = tapId ? byId.get(tapId) : undefined;
        if (el) props.onOpen?.(el);
        else fit();
        return;
      }
    }
    const target = (e.target as Element).closest("[data-role]");
    const role = target?.getAttribute("data-role");
    if (editable && role === "rotate" && selected) return void (gesture.current = { type: "rotate", el: selected });
    if (editable && role === "resize" && selected) return void (gesture.current = { type: "resize", el: selected });
    if (editable && role === "waypoint") return void (gesture.current = { type: "waypoint", index: Number(target!.getAttribute("data-index")) });
    const id = (e.target as Element).closest("[data-id]")?.getAttribute("data-id");
    const hit = id ? byId.get(id) : undefined;
    if (editable && tool === "background" && plan.background && !plan.background.locked)
      return void (gesture.current = { type: "bg", start: p, bg: plan.background });
    if (editable && tool === "path" && selected?.motion && !hit) {
      props.onPathPoint?.({ x: round(snap(p.x, step)), y: round(snap(p.y, step)) });
      return;
    }
    if (hit && !layers[hit.layer]?.locked) {
      if (!editable) {
        props.onSelect([hit.id]);
        return;
      }
      const additive = e.shiftKey || e.metaKey || e.ctrlKey || !!props.multi;
      if (additive && selection.includes(hit.id)) {
        // Déjà sélectionné : glisser déplace toute la sélection, un simple toucher le retire.
        const movable = plan.elements.filter((el) => selection.includes(el.id) && !lockedEl(el));
        gesture.current = { type: "move", start: p, originals: movable, moved: false, toggle: hit.id };
        return;
      }
      const ids = additive ? [...selection, hit.id] : selection.includes(hit.id) ? selection : [hit.id];
      props.onSelect(ids);
      const movable = plan.elements.filter((el) => ids.includes(el.id) && !lockedEl(el));
      if (movable.length) gesture.current = { type: "move", start: p, originals: movable, moved: false };
      return;
    }
    if (editable && (e.shiftKey || props.multi)) {
      gesture.current = { type: "marquee", start: p, now: p };
      setMarquee({ a: p, b: p });
      return;
    }
    if (!e.shiftKey) props.onSelect([]);
    gesture.current = { type: "pan", x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
  }

  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const p = toWorld(e.clientX, e.clientY);
    if (g.type === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const scale = clamp(g.scale * (d / g.d), 4, 400);
      fitted.current = true;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const r = svg.current!.getBoundingClientRect();
      setView({ scale, cx: g.world.x - (mid.x - r.left - size.w / 2) / scale, cy: g.world.y - (mid.y - r.top - size.h / 2) / scale });
    } else if (g.type === "pan") {
      if (Math.abs(e.clientX - g.x) + Math.abs(e.clientY - g.y) > 3) fitted.current = true;
      setView((v) => ({ ...v, cx: g.cx - (e.clientX - g.x) / v.scale, cy: g.cy - (e.clientY - g.y) / v.scale }));
    } else if (g.type === "move") {
      const dx = snap(p.x - g.start.x, step);
      const dy = snap(p.y - g.start.y, step);
      if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) * view.scale < 4) return;
      g.moved = true;
      props.onDraft(g.originals.map((el) => shiftElement(el, dx, dy)));
    } else if (g.type === "rotate") {
      let a = angleTo(g.el, p);
      if (snapOn) a = snap(a, 15);
      props.onDraft([{ ...g.el, rotation: Math.round(a) }]);
    } else if (g.type === "resize") {
      const a = rad(-g.el.rotation);
      const dx = p.x - g.el.x;
      const dy = p.y - g.el.y;
      const lx = Math.abs(dx * Math.cos(a) - dy * Math.sin(a));
      const ly = Math.abs(dx * Math.sin(a) + dy * Math.cos(a));
      props.onDraft([{ ...g.el, w: Math.max(0.2, snap(lx * 2, snapOn ? 0.1 : 0.01)), h: Math.max(0.1, snap(ly * 2, snapOn ? 0.1 : 0.01)) }]);
    } else if (g.type === "marquee") {
      g.now = p;
      setMarquee({ a: g.start, b: p });
    } else if (g.type === "waypoint") {
      props.onMovePathPoint?.(g.index, { x: round(snap(p.x, step)), y: round(snap(p.y, step)) }, false);
    } else if (g.type === "bg") {
      props.onBackground?.({ ...g.bg, x: g.bg.x + (p.x - g.start.x), y: g.bg.y + (p.y - g.start.y) }, false);
    }
  }

  function cancel() {
    pointers.current.clear();
    gesture.current = null;
    setMarquee(null);
    props.onDraft(null);
    // Les brouillons du fond doivent eux aussi revenir à la valeur enregistrée.
    props.onCancel?.();
  }

  function up(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size) return;
    gesture.current = null;
    if (!g) return;
    const p = toWorld(e.clientX, e.clientY);
    if (g.type === "move") {
      // Un glisser très rapide peut n'envoyer aucun mouvement intermédiaire : on mesure au relâchement.
      if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) * view.scale < 4) {
        props.onDraft(null);
        if (g.toggle) props.onSelect(selection.filter((s) => s !== g.toggle));
        return;
      }
      const dx = snap(p.x - g.start.x, step);
      const dy = snap(p.y - g.start.y, step);
      props.onCommit(g.originals.map((el) => shiftElement(el, dx, dy)));
    } else if (g.type === "rotate") {
      let a = angleTo(g.el, p);
      if (snapOn) a = snap(a, 15);
      props.onCommit([{ ...g.el, rotation: Math.round(a) }]);
    } else if (g.type === "resize") {
      const a = rad(-g.el.rotation);
      const dx = p.x - g.el.x;
      const dy = p.y - g.el.y;
      const lx = Math.abs(dx * Math.cos(a) - dy * Math.sin(a));
      const ly = Math.abs(dx * Math.sin(a) + dy * Math.cos(a));
      props.onCommit([{ ...g.el, w: Math.max(0.2, snap(lx * 2, snapOn ? 0.1 : 0.01)), h: Math.max(0.1, snap(ly * 2, snapOn ? 0.1 : 0.01)) }]);
    } else if (g.type === "marquee") {
      setMarquee(null);
      const x0 = Math.min(g.start.x, g.now.x);
      const x1 = Math.max(g.start.x, g.now.x);
      const y0 = Math.min(g.start.y, g.now.y);
      const y1 = Math.max(g.start.y, g.now.y);
      // Un toucher sur le vide (sans tracer de cadre) vide la sélection ; un cadre s'ajoute à la sélection.
      if (Math.hypot(x1 - x0, y1 - y0) * view.scale < 4) return props.onSelect([]);
      const inside = visible.filter((el) => el.x >= x0 && el.x <= x1 && el.y >= y0 && el.y <= y1 && !lockedEl(el)).map((el) => el.id);
      props.onSelect([...new Set([...selection, ...inside])]);
    } else if (g.type === "waypoint") {
      props.onMovePathPoint?.(g.index, { x: round(snap(p.x, step)), y: round(snap(p.y, step)) }, true);
    } else if (g.type === "bg") {
      props.onBackground?.({ ...g.bg, x: g.bg.x + (p.x - g.start.x), y: g.bg.y + (p.y - g.start.y) }, true);
    }
  }

  const poses = new Map<string, Pose>();
  const poseOf = (el: SceneElement) => {
    let pose = poses.get(el.id);
    if (!pose) {
      pose = poseAt(el, time, find);
      poses.set(el.id, pose);
    }
    return pose;
  };
  const statics = visible.filter((el) => ["zone", "wall", "object", "rows"].includes(el.kind));
  const order = (kinds: string[]) => visible.filter((el) => kinds.includes(el.kind));
  const bg = plan.background;
  const bgHeight = bg ? plan.height * (bg.w / plan.width) : 0;
  // Quadrillage : un mètre, et un trait plus marqué tous les cinq mètres.
  const grid = useMemo(() => {
    let minor = "";
    let major = "";
    for (let x = 0; x <= plan.width; x++) {
      if (x % 5) minor += `M${x} 0V${plan.height}`;
      else major += `M${x} 0V${plan.height}`;
    }
    for (let y = 0; y <= plan.height; y++) {
      if (y % 5) minor += `M0 ${y}H${plan.width}`;
      else major += `M0 ${y}H${plan.width}`;
    }
    return { minor, major };
  }, [plan.width, plan.height]);

  return (
    <div
      ref={box}
      className={"sd-canvas-box tool-" + tool + (props.display?.labels === false ? " clean-labels" : "") + (props.display?.cones === false ? " clean-cones" : "")}
      onDragOver={(e) => {
        if (editable && e.dataTransfer.types.includes("application/x-visionnary-asset")) e.preventDefault();
      }}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("application/x-visionnary-asset");
        if (!id || !editable) return;
        e.preventDefault();
        props.onDropAsset?.(id, toWorld(e.clientX, e.clientY));
      }}
    >
      <svg
        ref={svg}
        className="sd-svg"
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        width={size.w}
        height={size.h}
        role="application"
        aria-label={`Plan de scène ${plan.name}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onDoubleClick={(e) => {
          const id = (e.target as Element).closest("[data-id]")?.getAttribute("data-id");
          const hit = id ? byId.get(id) : undefined;
          if (hit) props.onOpen?.(hit);
          else fit();
        }}
        onWheel={(e) => {
          fitted.current = true;
          const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
          const w = toWorld(e.clientX, e.clientY);
          const r = svg.current!.getBoundingClientRect();
          setView((v) => {
            const scale = clamp(v.scale * factor, 4, 400);
            return { scale, cx: w.x - (e.clientX - r.left - size.w / 2) / scale, cy: w.y - (e.clientY - r.top - size.h / 2) / scale };
          });
        }}
      >
        <defs>
          <clipPath id="sd-plan-background-clip"><rect x={0} y={0} width={plan.width} height={plan.height} /></clipPath>
          <marker id="sd-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
          <pattern id="sd-checker" width="1" height="1" patternUnits="userSpaceOnUse">
            <rect width="0.5" height="0.5" fill="#ffffff" fillOpacity="0.18" />
            <rect x="0.5" y="0.5" width="0.5" height="0.5" fill="#ffffff" fillOpacity="0.18" />
          </pattern>
        </defs>
        <rect x={vx} y={vy} width={vw} height={vh} fill="#0d0e0e" />
        <rect x={0} y={0} width={plan.width} height={plan.height} fill="#141716" />
        {bg && bgUrl && <g clipPath="url(#sd-plan-background-clip)"><image href={bgUrl} x={bg.x} y={bg.y} width={bg.w} height={bgHeight} opacity={bg.opacity} preserveAspectRatio={bg.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"} className="sd-bg" /></g>}
        {props.display?.grid !== false && <path d={grid.minor} stroke="#ffffff" strokeOpacity={0.06} strokeWidth={1} vectorEffect="non-scaling-stroke" fill="none" pointerEvents="none" />}
        {props.display?.grid !== false && <path d={grid.major} stroke="#ffffff" strokeOpacity={0.13} strokeWidth={1} vectorEffect="non-scaling-stroke" fill="none" pointerEvents="none" />}

        {statics.map((el) => (
          <g key={el.id} data-id={el.id} className={(el.kind === "person" && ["mariee","marie","couple"].includes(el.asset || "") ? "sd-subject " : "") + (selection.includes(el.id) ? "is-selected" : "")}>
            <StaticNode el={el} />
          </g>
        ))}
        {order(["crowd"]).map((el) => (
          <g key={el.id} data-id={el.id} transform={el.motion ? `translate(${poseOf(el).x - el.x} ${poseOf(el).y - el.y})` : undefined}>
            <CrowdNode el={el} />
          </g>
        ))}
        {/* Trajectoires et cônes sous les pions, pour que les pions restent cliquables. */}
        {visible
          .filter((el) => el.motion && MOVERS.has(el.kind))
          .map((el) => (
            <Trail key={"t" + el.id} el={el} points={trail(el, find)} color={el.kind === "drone" ? "#5fd0e6" : el.kind === "person" ? "#e79bb3" : el.kind === "light" ? "#f6db77" : "#e6c27f"} />
          ))}
        {order(["light"]).map((el) => (
          <g key={el.id} data-id={el.id}>
            <LightNode el={el} pose={poseOf(el)} selected={selection.includes(el.id)} />
          </g>
        ))}
        {order(["camera", "drone"]).map((el) => {
          const target = el.targetId ? byId.get(el.targetId) : undefined;
          return <FovCone key={"c" + el.id} el={el} pose={poseOf(el)} target={target ? poseOf(target) : undefined} color={el.kind === "drone" ? "#5fd0e6" : props.operatorColor(el.operatorId) ?? "#e6c27f"} faint={el.kind === "drone"} />;
        })}
        {order(["person"]).map((el) => (
          <g key={el.id} data-id={el.id} className={(el.kind === "person" && ["mariee","marie","couple"].includes(el.asset || "") ? "sd-subject " : "") + (selection.includes(el.id) ? "is-selected" : "")}>
            <PersonNode el={el} pose={poseOf(el)} operatorColor={props.operatorColor(el.memberId)} />
          </g>
        ))}
        {order(["audio"]).map((el) => (
          <g key={el.id} data-id={el.id}>
            <AudioNode el={el} pose={poseOf(el)} />
          </g>
        ))}
        {order(["camera"]).map((el) => (
          <g key={el.id} data-id={el.id} className={"sd-cam" + (selection.includes(el.id) ? " is-selected" : "")}>
            <CameraNode el={el} pose={poseOf(el)} operatorColor={props.operatorColor(el.operatorId)} />
          </g>
        ))}
        {order(["drone"]).map((el) => (
          <g key={el.id} data-id={el.id} className={(el.kind === "person" && ["mariee","marie","couple"].includes(el.asset || "") ? "sd-subject " : "") + (selection.includes(el.id) ? "is-selected" : "")}>
            <DroneNode el={el} pose={poseOf(el)} operatorColor={props.operatorColor(el.operatorId)} />
          </g>
        ))}
        {order(["note"]).map((el) => (
          <g key={el.id} data-id={el.id}>
            <NoteNode el={el} />
          </g>
        ))}

        {/* Sélection */}
        {selection.map((sid) => {
          const el = byId.get(sid);
          if (!el || el.hidden) return null;
          const pose = poseOf(el);
          const { w, h } = sizeOf(el);
          const pad = 0.12;
          return (
            <g key={"s" + sid} transform={`translate(${pose.x} ${pose.y}) rotate(${SIZED.has(el.kind) ? el.rotation : 0})`} pointerEvents="none">
              {SIZED.has(el.kind) ? (
                <rect x={-w / 2 - pad} y={-h / 2 - pad} width={w + pad * 2} height={h + pad * 2} fill="none" stroke="#e6c27f" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="5 4" />
              ) : (
                <circle r={0.55} fill="none" stroke="#e6c27f" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="5 4" />
              )}
            </g>
          );
        })}
        {editable && selected && !lockedEl(selected) && (() => {
          const pose = poseOf(selected);
          const { w, h } = sizeOf(selected);
          const reach = SIZED.has(selected.kind) ? Math.max(w, h) / 2 + 0.7 : 1.1;
          const f = direction(selected.rotation);
          const hx = pose.x + f.x * reach;
          const hy = pose.y + f.y * reach;
          const a = rad(selected.rotation);
          const cx = pose.x + (w / 2) * Math.cos(a) - (h / 2) * Math.sin(a);
          const cy = pose.y + (w / 2) * Math.sin(a) + (h / 2) * Math.cos(a);
          // Poignées agrandies au premier contact (14/26 px au lieu de 10/22) : la mécanique était
          // déjà là, seule sa visibilité posait problème.
          const handle = 14 / view.scale;
          return (
            <g>
              <line x1={pose.x} y1={pose.y} x2={hx} y2={hy} stroke="#e6c27f" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />
              <circle data-role="rotate" cx={hx} cy={hy} r={26 / view.scale} fill="transparent" className="sd-handle rotate" />
              <circle data-role="rotate" cx={hx} cy={hy} r={handle} fill="#e6c27f" stroke="#2b2111" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="sd-handle rotate">
                <title>Tourner</title>
              </circle>
              {SIZED.has(selected.kind) && (
                <rect data-role="resize" x={cx - handle} y={cy - handle} width={handle * 2} height={handle * 2} fill="#fff" stroke="#2b2111" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="sd-handle resize">
                  <title>Redimensionner</title>
                </rect>
              )}
            </g>
          );
        })()}
        {editable && selected?.motion?.path && (tool === "path" || selection.length === 1) &&
          selected.motion.path.map((q, n) => (
            <circle key={"w" + n} data-role="waypoint" data-index={n} cx={q.x} cy={q.y} r={8 / view.scale} fill="#1b1a17" stroke="#e6c27f" strokeWidth={2} vectorEffect="non-scaling-stroke" className="sd-handle">
              <title>Point {n + 1} : glisser pour déplacer</title>
            </circle>
          ))}
        {marquee && (
          <rect
            x={Math.min(marquee.a.x, marquee.b.x)}
            y={Math.min(marquee.a.y, marquee.b.y)}
            width={Math.abs(marquee.a.x - marquee.b.x)}
            height={Math.abs(marquee.a.y - marquee.b.y)}
            fill="#e6c27f"
            fillOpacity={0.08}
            stroke="#e6c27f"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="4 3"
            pointerEvents="none"
          />
        )}
      </svg>
      <div className="sd-scale" aria-hidden="true">
        <span style={{ width: view.scale }} />1 m
      </div>
    </div>
  );
});
export default SceneCanvas;

/** Élément sous un point (le plus haut dans l'ordre de dessin). */
export function hitTest(elements: SceneElement[], p: Point): SceneElement | undefined {
  return [...elements].reverse().find((el) => contains(el, p, 0.1) || dist(el, p) < 0.4);
}
