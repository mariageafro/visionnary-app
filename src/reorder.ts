import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Nouvel ordre quand `draggedId` est déposé sur `targetId` dans `list` (l'ordre affiché de la section).
 * Vers la droite/le bas la pose passe APRÈS la cible, vers la gauche/le haut AVANT : deux voisines
 * glissées l'une sur l'autre s'échangent. Une pose venue d'ailleurs (`outside`) s'insère avant la cible.
 * Les valeurs `order` sont redistribuées entre ces seuls éléments : les autres ne bougent pas.
 */
export function reorderOnDrop<T extends { id: string; order: number }>(list: T[], draggedId: string, targetId: string, outside?: T, place?: "before" | "after"): { orders: Map<string, number>; crossed: boolean } | null {
  if (draggedId === targetId) return null;
  const from = list.findIndex((item) => item.id === draggedId);
  const dragged = from >= 0 ? list[from] : outside;
  const targetIndex = list.findIndex((item) => item.id === targetId);
  if (!dragged || targetIndex < 0) return null;
  const rest = list.filter((item) => item.id !== draggedId);
  const at = rest.findIndex((item) => item.id === targetId) + (place ? (place === "after" ? 1 : 0) : from >= 0 && from < targetIndex ? 1 : 0);
  const ordered = [...rest.slice(0, at), dragged, ...rest.slice(at)];
  const slots = ordered.map((item) => item.order).sort((a, b) => a - b);
  return { orders: new Map(ordered.map((item, n) => [item.id, slots[n]])), crossed: from < 0 };
}

/**
 * Déplace plusieurs éléments d'un bloc : ils s'insèrent, dans leur ordre d'affichage, avant ou après `targetId`.
 * Les valeurs `order` sont redistribuées entre ces seuls éléments (ceux de la liste + ceux qui arrivent d'ailleurs).
 */
export function reorderBlock<T extends { id: string; order: number }>(list: T[], moved: T[], targetId: string, place: "before" | "after"): { orders: Map<string, number>; crossed: Set<string> } | null {
  const ids = new Set(moved.map((m) => m.id));
  if (!moved.length || ids.has(targetId)) return null;
  const rest = list.filter((item) => !ids.has(item.id));
  const at = rest.findIndex((item) => item.id === targetId);
  if (at < 0) return null;
  const ordered = [...rest.slice(0, at + (place === "after" ? 1 : 0)), ...moved, ...rest.slice(at + (place === "after" ? 1 : 0))];
  const slots = ordered.map((item) => item.order).sort((a, b) => a - b);
  for (let n = 1; n < slots.length; n++) if (slots[n] <= slots[n - 1]) slots[n] = slots[n - 1] + 1;
  const orders = new Map(ordered.map((item, n) => [item.id, slots[n]]));
  const inList = new Set(list.map((i) => i.id));
  return { orders, crossed: new Set(moved.filter((m) => !inList.has(m.id)).map((m) => m.id)) };
}

export type DropZone = "before" | "after" | "merge";
interface Handlers {
  /**
   * Dépôt sur une autre vignette (attribut data-reorder="id"). `zone` : bord gauche/haut « before », bord
   * droit/bas « after », centre « merge » (seulement si la vignette porte data-merge : ajout comme angle).
   * `ids` : tout ce qui est glissé (la sélection quand on attrape une vignette sélectionnée).
   */
  onDropTile: (draggedId: string, targetId: string, zone: DropZone, ids: string[]) => void;
  /** Éléments emportés avec celui qu'on attrape (sélection multiple). */
  groupOf?: (draggedId: string) => string[];
  /** Dépôt sur une section (attribut data-reorder-section="titre"). */
  onDropSection?: (draggedId: string, section: string) => void;
}

/**
 * Glisser-déposer aux événements « pointeur » : souris, doigt et stylet, sur tous les navigateurs
 * (le glisser-déposer HTML natif ne fonctionne pas au toucher et varie selon Safari/Chrome).
 * À brancher sur la poignée : onPointerDown={(e) => begin(e, id)}, avec touch-action:none.
 */
export function usePointerReorder(handlers: Handlers) {
  const latest = useRef(handlers);
  latest.current = handlers;
  return useCallback((event: ReactPointerEvent, id: string) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const source = document.querySelector<HTMLElement>(`[data-reorder="${CSS.escape(id)}"]`) ?? (event.currentTarget as HTMLElement | null)?.closest<HTMLElement>(".section-title") ?? null;
    const start = { x: event.clientX, y: event.clientY };
    const ids = latest.current.groupOf?.(id) ?? [id];
    let ghost: HTMLElement | null = null;
    let hover: HTMLElement | null = null;
    let zone: DropZone = "before";
    let active = false;
    const paint = () => {
      hover?.classList.remove("zone-before", "zone-after", "zone-merge");
      if (hover?.dataset.reorder !== undefined) hover.classList.add("zone-" + zone);
    };
    const setHover = (next: HTMLElement | null) => {
      if (next === hover) return;
      hover?.classList.remove("is-over", "zone-before", "zone-after", "zone-merge");
      hover = next;
      hover?.classList.add("is-over");
    };
    const move = (e: PointerEvent) => {
      if (!active) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
        active = true;
        if (source) {
          const box = source.getBoundingClientRect();
          ghost = source.cloneNode(true) as HTMLElement;
          Object.assign(ghost.style, { position: "fixed", width: box.width + "px", height: box.height + "px", margin: "0", zIndex: "9999", pointerEvents: "none", opacity: "0.88", transform: "scale(0.9)", boxShadow: "0 12px 34px #000b" });
          if (ids.length > 1) ghost.dataset.count = String(ids.length);
          ghost.classList.add("drag-ghost");
          document.body.appendChild(ghost);
          source.classList.add("is-dragging");
        }
      }
      if (ghost) {
        ghost.style.left = e.clientX - ghost.offsetWidth / 2 + "px";
        ghost.style.top = e.clientY - ghost.offsetHeight / 2 + "px";
      }
      if (e.clientY < 70) window.scrollBy(0, -14);
      else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
      const under = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((el): el is HTMLElement => el instanceof HTMLElement && ((el.dataset.reorder !== undefined && !ids.includes(el.dataset.reorder)) || el.dataset.reorderSection !== undefined));
      setHover(under ?? null);
      if (hover?.dataset.reorder !== undefined) {
        const box = hover.getBoundingClientRect();
        const x = (e.clientX - box.left) / box.width;
        const y = (e.clientY - box.top) / box.height;
        const centred = hover.dataset.merge !== undefined && x > 0.28 && x < 0.72 && y > 0.18 && y < 0.82;
        zone = centred ? "merge" : x < 0.5 ? "before" : "after";
        paint();
        hover.classList.add("zone-" + zone);
      }
    };
    const end = (cancelled: boolean) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      ghost?.remove();
      source?.classList.remove("is-dragging");
      const target = hover;
      setHover(null);
      if (!active || cancelled || !target) return;
      if (target.dataset.reorder !== undefined) latest.current.onDropTile(id, target.dataset.reorder, zone, ids);
      else if (target.dataset.reorderSection !== undefined) latest.current.onDropSection?.(id, target.dataset.reorderSection);
    };
    const up = () => end(false);
    const cancel = () => end(true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  }, []);
}
