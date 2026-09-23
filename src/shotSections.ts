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
