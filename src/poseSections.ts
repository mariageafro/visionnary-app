import type { Item, Project } from "./types";
import { orderByDay } from "./dayOrder";
import { poseCategories } from "./model";

const titleOf = (item: Item) => String(item.category || "Sans catégorie");

/** Les anciennes catégories restent visibles ; les sections créées peuvent rester vides. */
export function poseSectionTitles(project: Project): string[] {
  const configured = [...(project.poseSections ?? [])].sort((a, b) => a.order - b.order).map((section) => section.title);
  const present = project.items.filter((item) => item.module === "poses" && item.status !== "archivé").map(titleOf);
  const remaining = [...new Set(present)].filter((title) => !configured.includes(title));
  const flat = [...configured, ...remaining.filter((title) => poseCategories.includes(title)).sort((a, b) => poseCategories.indexOf(a) - poseCategories.indexOf(b)), ...remaining.filter((title) => !poseCategories.includes(title))];
  return regroup(project, flat);
}

/** Titre de la section parente d'une sous-section (undefined pour une section de premier niveau). */
export function parentTitleOf(project: Project, title: string): string | undefined {
  const sections = project.poseSections ?? [];
  const parentId = sections.find((s) => s.title === title)?.parentId;
  return parentId ? sections.find((s) => s.id === parentId)?.title : undefined;
}

/** Chaque sous-section suit directement sa section parente. */
function regroup(project: Project, flat: string[]): string[] {
  const kidsOf = new Map<string, string[]>();
  const tops: string[] = [];
  for (const title of flat) {
    const parent = parentTitleOf(project, title);
    if (parent && flat.includes(parent)) kidsOf.set(parent, [...(kidsOf.get(parent) ?? []), title]);
    else tops.push(title);
  }
  return tops.flatMap((top) => [top, ...(kidsOf.get(top) ?? [])]);
}

const blocks = (project: Project, titles: string[]) => {
  const tops = titles.filter((t) => !parentTitleOf(project, t));
  return { tops, kids: (top: string) => titles.filter((t) => parentTitleOf(project, t) === top) };
};
/** Nouvel ordre à plat après déplacement : une section de premier niveau emporte ses sous-sections, une sous-section reste chez son parent. */
function relocate(project: Project, title: string, destination: string | "start" | "end"): string[] | null {
  const titles = poseSectionTitles(project);
  const { tops, kids } = blocks(project, titles);
  const parent = parentTitleOf(project, title);
  if (parent) {
    const sibs = kids(parent);
    const to = destination === "start" ? 0 : destination === "end" ? sibs.length - 1 : sibs.indexOf(destination);
    if (to < 0 || sibs.indexOf(title) < 0) return null;
    sibs.splice(sibs.indexOf(title), 1);
    sibs.splice(to, 0, title);
    return tops.flatMap((t) => (t === parent ? [t, ...sibs] : [t, ...kids(t)]));
  }
  const dest = destination === "start" || destination === "end" ? destination : parentTitleOf(project, destination) ?? destination;
  const from = tops.indexOf(title);
  const rest = tops.filter((t) => t !== title);
  const to = dest === "start" ? 0 : dest === "end" ? rest.length : rest.indexOf(dest) + (from < tops.indexOf(dest) ? 1 : 0);
  if (from < 0 || to < 0 || dest === title) return null;
  rest.splice(to, 0, title);
  return rest.flatMap((t) => [t, ...kids(t)]);
}
const writeOrder = (project: Project, titles: string[]): Project => {
  const existing = new Map((project.poseSections ?? []).map((section) => [section.title, section]));
  return { ...project, poseSections: titles.map((name, order) => ({ ...(existing.get(name) ?? { id: crypto.randomUUID(), title: name }), order })) };
};

export function addPoseSection(project: Project, title: string, parentTitle?: string): Project {
  const name = title.trim();
  if (!name || poseSectionTitles(project).includes(name) || name === "À faire absolument") return project;
  let base = project;
  let parentId: string | undefined;
  if (parentTitle && !parentTitleOf(project, parentTitle) && parentTitle !== "À faire absolument") {
    const known = (project.poseSections ?? []).find((s) => s.title === parentTitle);
    parentId = known?.id ?? crypto.randomUUID();
    if (!known) base = { ...project, poseSections: [...(project.poseSections ?? []), { id: parentId, title: parentTitle, order: (project.poseSections ?? []).length }] };
  }
  const sections = base.poseSections ?? [];
  const next = { ...base, poseSections: [...sections, { id: crypto.randomUUID(), title: name, order: sections.length, ...(parentId ? { parentId } : {}) }] };
  return writeOrder(next, poseSectionTitles(next));
}

export function renamePoseSection(project: Project, oldTitle: string, newTitle: string): Project {
  const name = newTitle.trim();
  if (!name || oldTitle === name || (poseSectionTitles(project).includes(name) && name !== oldTitle) || name === "À faire absolument") return project;
  const existing = project.poseSections ?? [];
  const section = existing.find((entry) => entry.title === oldTitle);
  return {
    ...project,
    poseSections: section ? existing.map((entry) => entry.id === section.id ? { ...entry, title: name } : entry) : [...existing, { id: crypto.randomUUID(), title: name, order: existing.length }],
    items: project.items.map((item) => item.module === "poses" && titleOf(item) === oldTitle ? { ...item, category: name } : item),
  };
}

export function removePoseSection(project: Project, title: string): Project {
  if (title === "Sans catégorie" || title === "À faire absolument") return project;
  return {
    ...project,
    poseSections: (project.poseSections ?? []).filter((entry) => entry.title !== title).map((entry) => (entry.parentId && (project.poseSections ?? []).find((x) => x.id === entry.parentId)?.title === title ? { ...entry, parentId: undefined } : entry)),
    items: project.items.map((item) => item.module === "poses" && titleOf(item) === title ? { ...item, category: undefined } : item),
  };
}

export function setPoseSectionCollapsed(project: Project, title: string, collapsed: boolean): Project {
  const sections = project.poseSections ?? [];
  const existing = sections.find((section) => section.title === title);
  return { ...project, poseSections: existing
    ? sections.map((section) => section.id === existing.id ? { ...section, collapsed } : section)
    : [...sections, { id: crypto.randomUUID(), title, order: poseSectionTitles(project).indexOf(title), collapsed }] };
}

export function movePoseSection(project: Project, title: string, step: -1 | 1): Project {
  const parent = parentTitleOf(project, title);
  const { tops, kids } = blocks(project, poseSectionTitles(project));
  const peers = parent ? kids(parent) : tops;
  const index = peers.indexOf(title);
  const neighbour = peers[index + step];
  if (index < 0 || !neighbour) return project;
  const titles = relocate(project, title, neighbour);
  return titles ? writeOrder(project, titles) : project;
}

/** Place une section à l'emplacement d'une autre : vers le haut elle passe avant, vers le bas après. `destination: "start" | "end"` : tout en haut / tout en bas. */
export function movePoseSectionTo(project: Project, title: string, destination: string): Project {
  if (title === destination) return project;
  const titles = relocate(project, title, destination);
  return titles ? writeOrder(project, titles) : project;
}

/** Masque ou réaffiche une section : ses poses restent intactes, seule la section disparaît de la liste. */
export function setPoseSectionHidden(project: Project, title: string, hidden: boolean): Project {
  const sections = project.poseSections ?? [];
  const existing = sections.find((section) => section.title === title);
  return { ...project, poseSections: existing
    ? sections.map((section) => section.id === existing.id ? { ...section, hidden } : section)
    : [...sections, { id: crypto.randomUUID(), title, order: poseSectionTitles(project).indexOf(title), hidden }] };
}
export const isPoseSectionHidden = (project: Project, title: string): boolean => {
  const own = (project.poseSections ?? []).find((section) => section.title === title);
  const parent = parentTitleOf(project, title);
  return own?.hidden === true || (parent ? isPoseSectionHidden(project, parent) : false);
};

/** Réorganise les sections de premier niveau dans l'ordre de la journée ; chaque sous-section suit son parent. */
export function orderPoseSectionsByDay(project: Project): Project {
  const titles = poseSectionTitles(project);
  const { tops, kids } = blocks(project, titles);
  const stages = project.items.filter((i) => i.module === "stages");
  const itemsOf = (t: string) => project.items.filter((i) => i.module === "poses" && [t, ...kids(t)].includes(titleOf(i)));
  const ordered = orderByDay(tops.map((t) => ({ title: t, items: itemsOf(t) })), stages);
  return writeOrder(project, ordered.flatMap((t) => [t, ...kids(t)]));
}

/** Place des sections (et leurs sous-sections) juste après `anchor`, sans toucher au reste de l'ordre. */
export function placeSectionsAfter(project: Project, moved: string[], anchor: string): Project {
  const flat = poseSectionTitles(project).filter((t) => !moved.includes(t));
  const at = flat.indexOf(anchor);
  if (at < 0) return project;
  flat.splice(at + 1, 0, ...moved);
  return writeOrder(project, flat);
}
