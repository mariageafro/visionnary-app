// Opérations pures sur un plan de scène : créer, modifier, dupliquer, grouper, aligner, supprimer.
// Chaque opération renvoie un nouveau plan (rien n'est modifié en place) : annulation fiable.
import type { LayerId, Point, SceneElement, ScenePlan } from "./types";
import { assetById, lightById, movementById, roleById, type AssetDef } from "./catalog";
import { bounds, round } from "./geometry";
import { sceneLength } from "./motion";

export const uid = () => crypto.randomUUID();

export function newPlan(name: string, extra: Partial<ScenePlan> = {}): ScenePlan {
  const now = new Date().toISOString();
  return { id: uid(), name, width: 24, height: 16, elements: [], cues: [], duration: 12, createdAt: now, updatedAt: now, ...extra };
}

/** Prochain nom libre : CAM A, CAM B… puis CAM AA si besoin. */
export function nextCameraTag(plan: ScenePlan): string {
  const used = new Set(plan.elements.filter((e) => e.kind === "camera").map((e) => e.tag));
  for (let n = 0; n < 52; n++) {
    const tag = "CAM " + (n < 26 ? String.fromCharCode(65 + n) : "A" + String.fromCharCode(65 + n - 26));
    if (!used.has(tag)) return tag;
  }
  return "CAM";
}

/** Nouvel élément depuis la bibliothèque, centré sur `at`. */
export function makeElement(plan: ScenePlan, def: AssetDef, at: Point, extra: Partial<SceneElement> = {}): SceneElement {
  const base: SceneElement = {
    id: uid(),
    kind: def.kind,
    name: def.label,
    asset: def.id,
    x: at.x,
    y: at.y,
    rotation: 0,
    layer: def.layer,
    ...(def.w ? { w: def.w, h: def.h } : {}),
    ...(def.shape ? { shape: def.shape } : {}),
    ...def.defaults,
  };
  if (def.kind === "camera") {
    base.tag = nextCameraTag(plan);
    base.name = base.tag;
    base.rotation = -90;
  }
  return { ...base, ...extra };
}
export function makePerson(role: string, at: Point, extra: Partial<SceneElement> = {}): SceneElement {
  const r = roleById(role);
  return { id: uid(), kind: "person", name: r.label, role: r.id, x: at.x, y: at.y, rotation: -90, layer: "people", ...extra };
}
export function makeLight(type: string, at: Point, extra: Partial<SceneElement> = {}): SceneElement {
  const l = lightById(type);
  return { id: uid(), kind: "light", name: l.label, asset: l.id, x: at.x, y: at.y, rotation: 0, layer: "lights", beam: l.beam, reach: l.reach, power: 80, temperature: 5600, ...extra };
}
export const assetElement = (plan: ScenePlan, id: string, at: Point, extra: Partial<SceneElement> = {}) => makeElement(plan, assetById(id)!, at, extra);

const touch = (plan: ScenePlan): ScenePlan => ({ ...plan, duration: sceneLength(plan.elements), updatedAt: new Date().toISOString() });

export function addElements(plan: ScenePlan, elements: SceneElement[]): ScenePlan {
  return touch({ ...plan, elements: [...plan.elements, ...elements] });
}
export function updateElements(plan: ScenePlan, ids: string[], change: Partial<SceneElement> | ((el: SceneElement) => SceneElement)): ScenePlan {
  const set = new Set(ids);
  return touch({ ...plan, elements: plan.elements.map((el) => (set.has(el.id) ? (typeof change === "function" ? change(el) : { ...el, ...change }) : el)) });
}
/** Supprime des éléments et nettoie ce qui les visait (sujet suivi, cible de caméra). */
export function removeElements(plan: ScenePlan, ids: string[]): ScenePlan {
  const set = new Set(ids);
  const elements = plan.elements
    .filter((el) => !set.has(el.id))
    .map((el) => {
      let next = el;
      if (el.targetId && set.has(el.targetId)) next = { ...next, targetId: undefined };
      if (el.motion?.targetId && set.has(el.motion.targetId)) next = { ...next, motion: { ...el.motion, targetId: undefined } };
      return next;
    });
  return touch({ ...plan, elements });
}

/** Déplace un élément et sa trajectoire ; positions arrondies au centimètre. */
export function shiftElement(el: SceneElement, dx: number, dy: number): SceneElement {
  return {
    ...el,
    x: round(el.x + dx),
    y: round(el.y + dy),
    ...(el.motion?.path ? { motion: { ...el.motion, path: el.motion.path.map((q) => ({ x: round(q.x + dx), y: round(q.y + dy) })) } } : {}),
  };
}

/** Copies décalées ; les liens internes (groupe, sujet visé) suivent la copie. */
export function duplicateElements(plan: ScenePlan, ids: string[], offset = 0.8): { plan: ScenePlan; ids: string[] } {
  const originals = plan.elements.filter((el) => ids.includes(el.id));
  const map = new Map(originals.map((el) => [el.id, uid()]));
  const groups = new Map<string, string>();
  const copies = originals.map((el) => {
    const copy: SceneElement = { ...shiftElement(el, offset, offset), id: map.get(el.id)! };
    if (el.groupId) {
      if (!groups.has(el.groupId)) groups.set(el.groupId, uid());
      copy.groupId = groups.get(el.groupId);
    }
    if (el.targetId && map.has(el.targetId)) copy.targetId = map.get(el.targetId);
    if (copy.motion?.targetId && map.has(copy.motion.targetId)) copy.motion = { ...copy.motion, targetId: map.get(copy.motion.targetId) };
    return copy;
  });
  // Une caméra copiée prend le prochain nom libre (CAM E…), pas un doublon.
  let next = { ...plan, elements: [...plan.elements] };
  for (const copy of copies) {
    if (copy.kind === "camera") {
      copy.tag = nextCameraTag(next);
      copy.name = copy.tag;
    }
    next = { ...next, elements: [...next.elements, copy] };
  }
  return { plan: touch(next), ids: copies.map((c) => c.id) };
}

export function groupElements(plan: ScenePlan, ids: string[]): ScenePlan {
  const groupId = uid();
  return updateElements(plan, ids, { groupId });
}
export function ungroupElements(plan: ScenePlan, ids: string[]): ScenePlan {
  return updateElements(plan, ids, (el) => ({ ...el, groupId: undefined }));
}
/** Tous les éléments du même groupe que la sélection. */
export function expandGroups(plan: ScenePlan, ids: string[]): string[] {
  const groups = new Set(plan.elements.filter((el) => ids.includes(el.id) && el.groupId).map((el) => el.groupId));
  return plan.elements.filter((el) => ids.includes(el.id) || (el.groupId && groups.has(el.groupId))).map((el) => el.id);
}

export type Align = "left" | "center" | "right" | "top" | "middle" | "bottom";
export function alignElements(plan: ScenePlan, ids: string[], mode: Align): ScenePlan {
  const chosen = plan.elements.filter((el) => ids.includes(el.id));
  const box = bounds(chosen);
  if (!box || chosen.length < 2) return plan;
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  return updateElements(plan, ids, (el) => {
    const half = { w: (el.w ?? 0.6) / 2, h: (el.h ?? 0.6) / 2 };
    if (mode === "left") return { ...el, x: box.minX + half.w };
    if (mode === "right") return { ...el, x: box.maxX - half.w };
    if (mode === "center") return { ...el, x: cx };
    if (mode === "top") return { ...el, y: box.minY + half.h };
    if (mode === "bottom") return { ...el, y: box.maxY - half.h };
    return { ...el, y: cy };
  });
}
/** Premier plan / arrière-plan dans l'ordre de dessin. */
export function reorder(plan: ScenePlan, ids: string[], where: "front" | "back"): ScenePlan {
  const chosen = plan.elements.filter((el) => ids.includes(el.id));
  const rest = plan.elements.filter((el) => !ids.includes(el.id));
  return touch({ ...plan, elements: where === "front" ? [...rest, ...chosen] : [...chosen, ...rest] });
}

/** Donne un mouvement de la bibliothèque à un élément, avec ses réglages par défaut. */
export function withMovement(el: SceneElement, type: string, start = 0): SceneElement {
  if (type === "none") return { ...el, motion: undefined };
  const def = movementById(type);
  if (!def) return el;
  return {
    ...el,
    motion: {
      type,
      start: el.motion?.start ?? start,
      duration: def.duration,
      ...(def.distance !== undefined ? { distance: def.distance } : {}),
      ...(def.sweep !== undefined ? { sweep: def.sweep } : {}),
      ...(def.rise !== undefined ? { rise: def.rise } : {}),
      ...(def.path ? { path: el.motion?.path ?? [] } : {}),
      ...(def.target ? { targetId: el.motion?.targetId ?? el.targetId } : {}),
      easing: "smooth",
    },
  };
}

export function setLayer(plan: ScenePlan, layer: LayerId, change: { hidden?: boolean; locked?: boolean }): ScenePlan {
  return touch({ ...plan, layers: { ...plan.layers, [layer]: { ...plan.layers?.[layer], ...change } } });
}

/**
 * Copie d'un plan avec de nouveaux identifiants (template appliqué, duplication). `ids` remappe
 * les liens vers le tournage (étape, lieu, équipe, plans) ; un lien sans correspondance est retiré.
 */
export function clonePlan(plan: ScenePlan, ids: Map<string, string> = new Map(), keepExternal = false): ScenePlan {
  const map = new Map(plan.elements.map((el) => [el.id, uid()]));
  const groups = new Map<string, string>();
  const ext = (id?: string) => (!id ? undefined : ids.get(id) ?? (keepExternal ? id : undefined));
  const now = new Date().toISOString();
  return {
    ...plan,
    id: uid(),
    stageId: ext(plan.stageId),
    venueId: ext(plan.venueId),
    background: keepExternal ? plan.background : undefined,
    createdAt: now,
    updatedAt: now,
    cues: plan.cues.map((c) => ({ ...c, id: uid() })),
    elements: plan.elements.map((el) => {
      const copy: SceneElement = { ...el, id: map.get(el.id)! };
      if (el.groupId) {
        if (!groups.has(el.groupId)) groups.set(el.groupId, uid());
        copy.groupId = groups.get(el.groupId);
      }
      if (el.targetId) copy.targetId = map.get(el.targetId);
      if (el.motion) copy.motion = { ...el.motion, targetId: el.motion.targetId ? map.get(el.motion.targetId) : undefined };
      copy.operatorId = ext(el.operatorId);
      copy.memberId = ext(el.memberId);
      copy.shotIds = el.shotIds?.map((s) => ext(s)).filter((s): s is string => !!s);
      if (!keepExternal) delete copy.referenceId;
      for (const key of ["operatorId", "memberId", "targetId", "shotIds", "referenceId"] as const) if (copy[key] === undefined) delete copy[key];
      return copy;
    }),
  };
}
