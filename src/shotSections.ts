import { orderByDay } from "./dayOrder";
import type { ShotSection } from "./types";

/** Place chaque sous-section juste après son parent, même avec les ordres des anciens projets. */
export function orderedSectionTitles(configured: ShotSection[], fallbackTitles: string[]): string[] {
  const ids = new Set(configured.map((section) => section.id));
  const indexed = configured.map((section, index) => ({ section, index }));
  const children = (parentId?: string) => indexed
    .filter(({ section }) => parentId ? section.parentId === parentId : !section.parentId || !ids.has(section.parentId))
    .sort((a, b) => a.section.order - b.section.order || a.index - b.index);
  const seen = new Set<string>();
  const titles: string[] = [];
  const visit = (section: ShotSection) => {
    if (seen.has(section.id)) return;
    seen.add(section.id);
    titles.push(section.title);
    children(section.id).forEach(({ section: child }) => visit(child));
  };
  children().forEach(({ section }) => visit(section));
  // Un cycle parentId erroné dans une ancienne sauvegarde ne doit masquer aucune section.
  indexed.forEach(({ section }) => visit(section));
  fallbackTitles.forEach((title) => { if (!titles.includes(title)) titles.push(title); });
  return titles;
}

/** Les chapitres racines et les sous-sections ont chacun leur propre ordre. */
export function siblingSectionTitles(configured: ShotSection[], fallbackTitles: string[], title: string): string[] {
  const section = configured.find((entry) => entry.title === title);
  if (section?.parentId && configured.some((entry) => entry.id === section.parentId)) {
    return configured.filter((entry) => entry.parentId === section.parentId).sort((a, b) => a.order - b.order).map((entry) => entry.title);
  }
  const ids = new Set(configured.map((entry) => entry.id));
  const roots = configured.filter((entry) => !entry.parentId || !ids.has(entry.parentId)).sort((a, b) => a.order - b.order).map((entry) => entry.title);
  return [...roots, ...fallbackTitles.filter((entry) => !configured.some((section) => section.title === entry))];
}

export function reorderShotSection(configured: ShotSection[], fallbackTitles: string[], source: string, destination: string): ShotSection[] | null {
  if (source === destination) return configured;
  const siblings = siblingSectionTitles(configured, fallbackTitles, source);
  const from = siblings.indexOf(source);
  const to = siblings.indexOf(destination);
  if (from < 0 || to < 0) return null;
  siblings.splice(from, 1);
  siblings.splice(to, 0, source);
  const sourceSection = configured.find((entry) => entry.title === source);
  const parentId = sourceSection?.parentId && configured.some((entry) => entry.id === sourceSection.parentId) ? sourceSection.parentId : undefined;
  return [
    ...configured.filter((entry) => !siblings.includes(entry.title)),
    ...siblings.map((title, order) => ({ ...(configured.find((entry) => entry.title === title) ?? { id: crypto.randomUUID(), title }), order, ...(parentId ? { parentId } : {}) })),
  ];
}

/** Nouvel ordre des chapitres racines d'après la journée ; leurs sous-sections gardent leur ordre et les suivent. */
export function orderShotSectionsByDay(configured: ShotSection[], fallbackTitles: string[], itemsIn: (titles: string[]) => import("./types").Item[], stages: import("./types").Item[]): ShotSection[] {
  const ids = new Set(configured.map((s) => s.id));
  const isRoot = (title: string) => { const s = configured.find((e) => e.title === title); return !s || !s.parentId || !ids.has(s.parentId); };
  const all = orderedSectionTitles(configured, fallbackTitles);
  const roots = all.filter(isRoot);
  const childrenOf = (title: string) => {
    const s = configured.find((e) => e.title === title);
    return s ? configured.filter((e) => e.parentId === s.id).map((e) => e.title) : [];
  };
  const ordered = orderByDay(roots.map((t) => ({ title: t, items: itemsIn([t, ...childrenOf(t)]) })), stages);
  const rest = configured.filter((e) => !ordered.includes(e.title));
  return [...rest, ...ordered.map((title, order) => ({ ...(configured.find((e) => e.title === title) ?? { id: crypto.randomUUID(), title }), order }))];
}
