import type { Item, Project, Workspace } from "./types";
import { makeItem, newProject, uid } from "./model";
import type { Pack } from "./packImport";

/**
 * Bibliothèque de poses : un projet spécial, masqué de « Mes tournages », qui garde photos et vidéos
 * de référence classées par catégorie. Un tournage y pioche pour créer ses poses. Comme c'est un
 * projet ordinaire, la sauvegarde, la restauration et la synchro la prennent en charge sans rien de plus.
 */
export const LIBRARY_NAME = "Bibliothèque de poses";
export const isLibrary = (p: Project) => p.library === true;
export const realProjects = (w: Workspace) => w.projects.filter((p) => !isLibrary(p));
export const libraryOf = (w: Workspace) => w.projects.find(isLibrary);
export function newLibrary(): Project {
  return { ...newProject(LIBRARY_NAME), library: true, status: "bibliothèque" };
}

export interface LibraryEntry {
  item: Item;
  /** Nom du fichier à importer (dans le pack ou le dossier choisi). */
  file: string;
}

/** Un élément de bibliothèque par image : chacune se choisit seule, ou avec d'autres pour former une pose. */
export function planLibraryFromPack(library: Project, pack: Pack, available: Set<string>): { entries: LibraryEntry[]; alreadyThere: number } {
  const known = new Set(library.items.map((i) => String(i.packKey ?? "")).filter(Boolean));
  const base = library.items.length;
  const entries: LibraryEntry[] = [];
  let alreadyThere = 0;
  for (const pose of pack.poses) {
    pose.images.forEach((file, angle) => {
      const packKey = `${pack.projet}:${pose.id}:${angle + 1}`;
      if (known.has(packKey)) return void alreadyThere++;
      if (!available.has(file)) return;
      entries.push({
        file,
        item: makeItem("poses", pose.title, {
          category: libraryCategory(pose),
          subjectGroup: pose.subject,
          packKey,
          order: base + entries.length,
          poseGroup: `${pack.projet}:${pose.id}`,
          ...(pose.section ? { sectionHint: pose.section } : {}),
          ...(pose.stage ? { stageKey: pose.stage } : {}),
          ...(pose.person ? { person: pose.person } : {}),
          ...(pose.framing ? { framing: pose.framing } : {}),
          ...(pose.favorite ? { favorite: true } : {}),
        }),
      });
    });
  }
  return { entries, alreadyThere };
}

/** Catégorie de bibliothèque d'une pose du pack : le dossier thématique sans son numéro d'ordre. */
const libraryCategory = (pose: { category: string; moment_folder?: string }) => (pose.moment_folder ?? pose.category).replace(/^\d+\s+/, "");

export interface PickedFile {
  name: string;
  /** Chemin relatif au dossier choisi (webkitRelativePath), ex. « 24 Septembre/Cérémonie/photo.jpg ». */
  path: string;
  size: number;
}
/** Un dossier importé : le premier sous-dossier donne la catégorie, chaque fichier devient un élément. */
export function planLibraryFromFolder(library: Project, files: PickedFile[]): { entries: (LibraryEntry & { path: string })[]; alreadyThere: number } {
  const known = new Set(library.items.map((i) => String(i.folderKey ?? "")).filter(Boolean));
  const base = library.items.length;
  const entries: (LibraryEntry & { path: string })[] = [];
  let alreadyThere = 0;
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    const category = (parts.length >= 3 ? parts[1] : parts.length === 2 ? parts[0] : "Sans catégorie").replace(/^\d+\s+/, "");
    const folderKey = `${parts.join("/")}:${file.size}`;
    if (known.has(folderKey)) {
      alreadyThere++;
      continue;
    }
    entries.push({ file: file.name, path: file.path, item: makeItem("poses", file.name.replace(/\.[^.]+$/, ""), { category, folderKey, order: base + entries.length }) });
  }
  return { entries, alreadyThere };
}

/**
 * Crée les poses du tournage à partir d'éléments de bibliothèque choisis. « group » : une seule pose dont
 * les images sont les angles ; sinon une pose par élément. Renvoie aussi, pour chaque nouvelle pose,
 * les éléments dont il faut copier le fichier (à faire par l'appelant, la copie est asynchrone).
 */
export function planUseFromLibrary(project: Project, picked: Item[], options: { group: boolean; section: string; stageId?: string; title?: string }): { items: Item[]; sources: Map<string, string[]> } {
  const base = project.items.filter((i) => i.module === "poses").length;
  const first = picked[0];
  const common = (source: Item) => ({
    category: options.section,
    ...(options.stageId ? { stageId: options.stageId } : {}),
    ...(source.subjectGroup ? { subjectGroup: source.subjectGroup } : {}),
    ...(source.person ? { person: source.person } : {}),
    ...(source.framing ? { framing: source.framing } : {}),
    ...(source.favorite ? { favorite: true } : {}),
    notes: `Bibliothèque · ${String(source.category ?? "")}`,
  });
  const sources = new Map<string, string[]>();
  const items: Item[] = [];
  if (options.group && first) {
    const item = makeItem("poses", options.title?.trim() || first.title, { id: uid(), order: base, ...common(first) });
    items.push(item);
    sources.set(item.id, picked.map((p) => p.id));
  } else {
    picked.forEach((source, n) => {
      const item = makeItem("poses", source.title, { order: base + n, ...common(source) });
      items.push(item);
      sources.set(item.id, [source.id]);
    });
  }
  return { items, sources };
}
