import type { Item, Project } from "./types";
import { makeItem } from "./model";
import { addPoseSection, poseSectionTitles } from "./poseSections";
import { poseCategories } from "./model";

/** Pack de poses : un manifest.json + un dossier d'images, préparé hors de l'app. */
export interface PackPose {
  id: string;
  title: string;
  category: string;
  /** Section équivalente dans le tournage cible (ex. « Préparatifs mariée ») ; utilisée si elle existe. */
  section?: string;
  /** Dossier thématique du pack (ex. « 07 Préparatifs marié · Seul »), utilisé comme catégorie de bibliothèque. */
  moment_folder?: string;
  subject: string;
  person?: string;
  stage: string;
  framing?: string;
  notes?: string;
  favorite?: boolean;
  essential?: boolean;
  cover: string;
  images: string[];
}
export interface Pack {
  version: number;
  projet: string;
  stages: Record<string, string>;
  sections: string[];
  poses: PackPose[];
}
export interface PlannedPose {
  pose: PackPose;
  item: Item;
  files: string[];
}
export interface PackPlan {
  poses: PlannedPose[];
  sections: string[];
  alreadyThere: number;
  missingFiles: number;
  withoutStage: number;
}

export function isPack(value: unknown): value is Pack {
  const pack = value as Pack;
  return !!pack && typeof pack === "object" && Array.isArray(pack.poses) && pack.poses.every((pose) => pose && typeof pose.id === "string" && Array.isArray(pose.images));
}

const FALLBACK: Record<string, string> = { maq: "prep", robe: "prep" };
const stageIdFor = (project: Project, pack: Pack, key: string): string | undefined => {
  const source = pack.stages?.[key];
  if (!source) return undefined;
  let re: RegExp;
  try {
    re = new RegExp(source, "i");
  } catch {
    return undefined;
  }
  const found = project.items.filter((item) => item.module === "stages" && item.status !== "archivé").sort((a, b) => a.order - b.order).find((item) => re.test(item.title))?.id;
  return found ?? (FALLBACK[key] ? stageIdFor(project, pack, FALLBACK[key]) : undefined);
};

/**
 * Prépare l'ajout du pack sans rien modifier : une pose par entrée (les images d'une même pose sont
 * ses angles), rattachée à l'étape du jour correspondante quand elle existe. Une pose déjà importée
 * (même clé) est ignorée : relancer l'import ne crée jamais de doublon.
 */
export function planPackImport(project: Project, pack: Pack, available: Set<string>): PackPlan {
  const titles = new Set(poseSectionTitles(project));
  const known = new Set(project.items.map((item) => String(item.packKey ?? "")).filter(Boolean));
  const base = project.items.filter((item) => item.module === "poses").length;
  const planned: PlannedPose[] = [];
  let alreadyThere = 0;
  let missingFiles = 0;
  let withoutStage = 0;
  for (const pose of pack.poses) {
    const packKey = `${pack.projet}:${pose.id}`;
    if (known.has(packKey)) {
      alreadyThere++;
      continue;
    }
    const files = pose.images.filter((name) => available.has(name));
    missingFiles += pose.images.length - files.length;
    if (!files.length) continue;
    const stageId = stageIdFor(project, pack, pose.stage);
    if (!stageId) withoutStage++;
    const category = pose.section && titles.has(pose.section) ? pose.section : pose.category;
    const item = makeItem("poses", pose.title, {
      category,
      subjectGroup: pose.subject,
      packKey,
      order: base + planned.length,
      priority: pose.essential ? "MUST HAVE" : "IMPORTANT",
      ...(pose.person ? { person: pose.person } : {}),
      ...(pose.framing ? { framing: pose.framing } : {}),
      ...(pose.notes ? { notes: pose.notes } : {}),
      ...(pose.favorite ? { favorite: true } : {}),
      ...(stageId ? { stageId } : {}),
    });
    planned.push({ pose, item, files });
  }
  const sections = [...new Set(planned.map(({ item }) => String(item.category)))].filter((title) => !titles.has(title) && !poseCategories.includes(title));
  return { poses: planned, sections, alreadyThere, missingFiles, withoutStage };
}

/**
 * Ajoute les poses (avec leur image de couverture) et les sections manquantes, en une seule étape
 * annulable. Les sections sont créées avant les poses, « Choix de Maeva ★ » en tête.
 */
export function applyPackImport(project: Project, plan: PackPlan, coverIds: Map<string, string>): Project {
  let next: Project = project;
  const first = "Choix de Maeva ★";
  for (const title of [...plan.sections].sort((a, b) => (a === first ? -1 : b === first ? 1 : 0))) next = addPoseSection(next, title);
  return { ...next, items: [...next.items, ...plan.poses.map(({ item }) => (coverIds.has(item.id) ? { ...item, coverId: coverIds.get(item.id)! } : item))] };
}
