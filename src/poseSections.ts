import type { Item, Project, ShotSection } from "./types";
import { poseCategories } from "./model";

const titleOf = (item: Item) => String(item.category || "Sans catégorie");

/** Les anciennes catégories restent visibles ; les sections créées peuvent rester vides. */
export function poseSectionTitles(project: Project): string[] {
  const configured = [...(project.poseSections ?? [])].sort((a, b) => a.order - b.order).map((section) => section.title);
  const present = project.items.filter((item) => item.module === "poses" && item.status !== "archivé").map(titleOf);
  const remaining = [...new Set(present)].filter((title) => !configured.includes(title));
  return [...configured, ...remaining.filter((title) => poseCategories.includes(title)).sort((a, b) => poseCategories.indexOf(a) - poseCategories.indexOf(b)), ...remaining.filter((title) => !poseCategories.includes(title))];
}

export function addPoseSection(project: Project, title: string): Project {
  const name = title.trim();
  if (!name || poseSectionTitles(project).includes(name) || name === "À faire absolument") return project;
  const sections = project.poseSections ?? [];
  return { ...project, poseSections: [...sections, { id: crypto.randomUUID(), title: name, order: sections.length }] };
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
    poseSections: (project.poseSections ?? []).filter((entry) => entry.title !== title),
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
  const titles = poseSectionTitles(project);
  const index = titles.indexOf(title);
  if (index < 0 || index + step < 0 || index + step >= titles.length) return project;
  [titles[index], titles[index + step]] = [titles[index + step], titles[index]];
  const existing = new Map((project.poseSections ?? []).map((section) => [section.title, section]));
  const poseSections: ShotSection[] = titles.map((name, order) => ({ ...(existing.get(name) ?? { id: crypto.randomUUID(), title: name }), order }));
  return { ...project, poseSections };
}

/** Place une section à l'emplacement d'une autre : vers le haut elle passe avant, vers le bas après. `destination: "start" | "end"` : tout en haut / tout en bas. */
export function movePoseSectionTo(project: Project, title: string, destination: string): Project {
  const titles = poseSectionTitles(project);
  const from = titles.indexOf(title);
  if (from < 0 || title === destination) return project;
  titles.splice(from, 1);
  const to = destination === "start" ? 0 : destination === "end" ? titles.length : titles.indexOf(destination) + (from < poseSectionTitles(project).indexOf(destination) ? 1 : 0);
  if (to < 0) return project;
  titles.splice(to, 0, title);
  const existing = new Map((project.poseSections ?? []).map((section) => [section.title, section]));
  const poseSections: ShotSection[] = titles.map((name, order) => ({ ...(existing.get(name) ?? { id: crypto.randomUUID(), title: name }), order }));
  return { ...project, poseSections };
}
