import type { ScenePlan } from "./scene/types";

export type ModuleId =
  | "stages"
  | "shots"
  | "inspirations"
  | "venues"
  | "team"
  | "equipment"
  | "checklists"
  | "reminders"
  | "audio"
  | "lighting"
  | "poses"
  | "interviews"
  | "notes"
  | "documents"
  | "prewedding"
  | "postproduction"
  | "sde"
  | "live"
  | "dance"
  | "drone"
  | "backups"
  | "transitions"
  | "briefings";
export interface Item {
  id: string;
  module: ModuleId;
  title: string;
  status: string;
  priority: string;
  notes: string;
  order: number;
  [key: string]: string | number | boolean | undefined;
}
export interface Placement {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  endX: number;
  endY: number;
  angle: number;
  color: string;
  operator: string;
  focal: string;
  duration: number;
  /** Scène multicam à laquelle appartient l'élément (absent = première scène). */
  sceneId?: string;
  /** Membre de l'équipe (élément du module « team »). */
  operatorId?: string;
  framing?: string;
  role?: string;
  height?: string;
}
export interface Scene {
  id: string;
  name: string;
}
/** Organisation facultative des chapitres de plans, propre à un mariage. */
export interface ShotSection {
  id: string;
  title: string;
  order: number;
  parentId?: string;
  collapsed?: boolean;
  hidden?: boolean;
}
export interface EstimateSettings {
  averageCutSeconds?: number;
  marginPercent?: number;
  style?: "calme" | "équilibré" | "dynamique" | "fast cut" | "personnalisé";
  bRollPercent?: number;
  multicam?: boolean;
  operators?: number;
}
export interface Project {
  alerts?: { enabled:boolean; sound:boolean; vibration:boolean; notifications:boolean; thresholds:number[] };
  id: string;
  name: string;
  date: string;
  venue: string;
  couple: string;
  style: string;
  status: string;
  guests: number;
  mustHave: string;
  avoid: string;
  priorities: string;
  items: Item[];
  placements: Placement[];
  createdAt: string;
  updatedAt: string;
  coverId?: string;
  ceremony?: string;
  reception?: string;
  planner?: string;
  services?: string;
  budget?: string;
  /** Options cochées à la création : cérémonie civile, drone, live, SDE… */
  features?: string[];
  scenes?: Scene[];
  /** Horaires de moments saisis à la main : clé « idÉtape|chapitre », valeur « HH:MM ». */
  moments?: Record<string, string>;
  /** Plans de scène (Scene Designer) : lieu, personnes, caméras, lumières et mouvements animés. */
  scenePlans?: ScenePlan[];
  filmMinutes?: number;
  teaserSeconds?: number;
  /** Absent sur les anciens projets : les chapitres historiques restent alors utilisés. */
  shotSections?: ShotSection[];
  /** Sections de la galerie photographe, distinctes des chapitres de plans vidéo. */
  poseSections?: ShotSection[];
  estimateSettings?: EstimateSettings;
  /** Projet spécial « Bibliothèque de poses » : masqué de la liste des tournages. */
  library?: boolean;
  /** Aides opérateur personnalisées pour ce mariage, par contexte. */
  operatorGuide?: Record<string, string>;
}
export interface Preset {
  id: string;
  name: string;
  description: string;
  items: Item[];
  custom?: boolean;
  /** Ce que le template contient : un tournage entier (défaut) ou une seule étape. */
  kind?: "tournage" | "étape";
}
export interface Workspace {
  schemaVersion: 1;
  projects: Project[];
  presets: Preset[];
  activeProjectId: string;
  revision: number;
  updatedAt: string;
  ownerName?: string;
}
export interface MediaEntry {
  id: string;
  projectId: string;
  itemId: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  thumbnail?: Blob;
  /** Largeur/hauteur ou durée lues à l'import ; absentes si le navigateur ne sait pas décoder. */
  width?: number;
  height?: number;
  duration?: number;
  unsupported?: boolean;
  /** Zoom et cadrage choisis : z ≥ 1, x/y = centre affiché en % de l'image. */
  view?: { z: number; x: number; y: number };
}
export interface ModuleProps {
  project: Project;
  updateProject: (p: Project) => void;
}
