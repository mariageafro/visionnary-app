// Bibliothèque du Scene Designer : tout ce qu'on peut poser sur un plan, à sa taille réelle.
import type { ElementKind, LayerId, SceneElement } from "./types";

export interface AssetDef {
  id: string;
  kind: ElementKind;
  label: string;
  group: string;
  layer: LayerId;
  w?: number;
  h?: number;
  shape?: "rect" | "ellipse";
  color: string;
  /** Valeurs initiales propres à l'élément (nombre de rangées, foule, lumière…). */
  defaults?: Partial<SceneElement>;
}

const wall = (id: string, label: string, w: number, h: number, color: string, shape: "rect" | "ellipse" = "rect"): AssetDef => ({
  id,
  kind: "wall",
  label,
  group: "Architecture",
  layer: "architecture",
  w,
  h,
  shape,
  color,
});
const zone = (id: string, label: string, w: number, h: number, color: string): AssetDef => ({ id, kind: "zone", label, group: "Zones", layer: "architecture", w, h, color });
const object = (id: string, label: string, w: number, h: number, group: string, color: string, shape: "rect" | "ellipse" = "rect"): AssetDef => ({
  id,
  kind: "object",
  label,
  group,
  layer: "decor",
  w,
  h,
  shape,
  color,
});

export const assets: AssetDef[] = [
  wall("mur", "Mur", 4, 0.2, "#8d8578"),
  wall("porte", "Porte", 0.9, 0.14, "#b8a27a"),
  wall("fenetre", "Fenêtre", 1.2, 0.14, "#7fb2ea"),
  wall("escalier", "Escalier", 2, 1.4, "#8d8578"),
  wall("colonne", "Colonne", 0.5, 0.5, "#9d9588", "ellipse"),
  wall("arche", "Arche", 2.4, 0.4, "#c9b48a"),

  zone("allee", "Allée centrale", 1.8, 12, "#c9a86a"),
  zone("tapis", "Tapis", 1.4, 6, "#b44a4a"),
  zone("piste", "Piste de danse", 6, 6, "#8b62e0"),
  zone("estrade", "Estrade / podium", 4, 2, "#9a7b4f"),
  zone("scene", "Scène", 6, 3, "#7a6a55"),
  zone("jardin", "Jardin / pelouse", 10, 8, "#4f8f55"),
  zone("cocktail", "Espace cocktail", 8, 6, "#5aa13a"),
  zone("zone", "Zone libre", 4, 3, "#6f7f8f"),

  object("chaise", "Chaise", 0.5, 0.5, "Mobilier", "#a8998a"),
  object("fauteuil", "Fauteuil", 0.9, 0.85, "Mobilier", "#a8998a"),
  object("canape", "Canapé", 2, 0.9, "Mobilier", "#a8998a"),
  object("table-ronde", "Table ronde", 1.8, 1.8, "Mobilier", "#bfae93", "ellipse"),
  object("table-rect", "Table rectangle", 2, 0.9, "Mobilier", "#bfae93"),
  object("table-honneur", "Table d’honneur", 5, 1, "Mobilier", "#d6c29c"),
  object("lit", "Lit", 2, 1.6, "Mobilier", "#bfae93"),
  object("bureau", "Bureau / coiffeuse", 1.4, 0.6, "Mobilier", "#bfae93"),
  object("pupitre", "Pupitre", 0.6, 0.5, "Mobilier", "#bfae93"),
  object("autel", "Autel", 2, 1, "Mobilier", "#e0cfa6"),
  object("buffet", "Buffet", 3, 0.8, "Mobilier", "#bfae93"),
  object("dj", "Cabine DJ", 2, 0.8, "Décor", "#6b5ca5"),
  object("bar", "Bar", 2.8, 0.9, "Décor", "#997553"),
  object("photobooth", "Photobooth", 1.8, 1.4, "Décor", "#92779f"),
  object("rideau", "Rideau", 3, 0.18, "Décor", "#ad8b76"),
  object("enceinte", "Enceinte", 0.45, 0.45, "Décor", "#4a4a4a"),
  object("ecran", "Écran LED", 3, 0.2, "Décor", "#2f8fe8"),
  object("projecteur-video", "Vidéoprojecteur", 0.4, 0.35, "Décor", "#4a4a4a"),
  object("miroir", "Miroir", 1, 0.08, "Décor", "#b9d7ee"),
  object("voiture", "Voiture", 4.6, 1.9, "Décor", "#3b3f46"),
  object("arche-florale", "Arche florale", 2.4, 0.5, "Décor", "#d8568a"),
  object("fleurs", "Fleurs", 0.8, 0.8, "Décor", "#e07a9f", "ellipse"),
  object("vase", "Vase", 0.45, 0.45, "Décor", "#c9a86a", "ellipse"),
  object("bougies", "Bougies", 0.35, 0.35, "Décor", "#f2c14e", "ellipse"),
  object("deco", "Décoration", 1, 1, "Décor", "#c9a86a"),
  object("objet", "Objet personnalisé", 1, 1, "Décor", "#8a8f99"),

  { id: "rangees", kind: "rows", label: "Rangées de chaises", group: "Assises", layer: "decor", w: 2.75, h: 5.4, color: "#a8998a", defaults: { rows: 6, cols: 5 } },
  { id: "invites-10", kind: "crowd", label: "10 invités", group: "Foules", layer: "people", w: 3, h: 2, color: "#9aa1ab", defaults: { count: 10 } },
  { id: "invites-50", kind: "crowd", label: "50 invités", group: "Foules", layer: "people", w: 7, h: 5, color: "#9aa1ab", defaults: { count: 50 } },
  { id: "invites-200", kind: "crowd", label: "200 invités", group: "Foules", layer: "people", w: 14, h: 10, color: "#9aa1ab", defaults: { count: 200 } },

  { id: "camera", kind: "camera", label: "Caméra", group: "Caméras", layer: "cameras", color: "#e6c27f", defaults: { sensor: "ff", focal: 35, height: 1.5, support: "trepied", operatorPresent: true } },
  { id: "camera-trepied-operateur", kind: "camera", label: "Caméra + cadreur · trépied", group: "Caméras", layer: "cameras", color: "#e6c27f", defaults: { sensor: "ff", focal: 50, height: 1.5, support: "trepied", operatorPresent: true } },
  { id: "camera-stab-operateur", kind: "camera", label: "Caméra + cadreur · stabilisateur", group: "Caméras", layer: "cameras", color: "#e6c27f", defaults: { sensor: "ff", focal: 35, height: 1.5, support: "gimbal", operatorPresent: true } },
  { id: "camera-epaule", kind: "camera", label: "Caméra épaule", group: "Caméras", layer: "cameras", color: "#e6c27f", defaults: { sensor: "ff", focal: 35, height: 1.6, support: "epaule", operatorPresent: true } },
  { id: "camera-fixe", kind: "camera", label: "Caméra fixe", group: "Caméras", layer: "cameras", color: "#e6c27f", defaults: { sensor: "ff", focal: 24, height: 1.5, support: "fixe", operatorPresent: false } },
  { id: "camera-public", kind: "camera", label: "Caméra réactions public", group: "Caméras", layer: "cameras", color: "#e6c27f", defaults: { sensor: "ff", focal: 85, height: 1.5, support: "trepied", operatorPresent: true, mission: "Réactions des invités et des proches" } },
  { id: "camera-securite", kind: "camera", label: "Caméra large sécurité", group: "Caméras", layer: "cameras", color: "#e6c27f", defaults: { sensor: "ff", focal: 24, height: 1.5, support: "fixe", operatorPresent: false, mission: "Plan large de sécurité en continu" } },
  { id: "camera-live", kind: "camera", label: "Caméra live / régie", group: "Caméras", layer: "cameras", color: "#e6c27f", defaults: { sensor: "ff", focal: 35, height: 1.5, support: "trepied", operatorPresent: true, mission: "Flux live vers la régie" } },
  { id: "drone", kind: "drone", label: "Drone", group: "Drone & son", layer: "cameras", color: "#5fd0e6", defaults: { altitude: 25, sensor: "1in", focal: 24 } },
  { id: "micro", kind: "audio", label: "Micro-cravate", group: "Drone & son", layer: "audio", color: "#a698ef" },
  { id: "enregistreur", kind: "audio", label: "Enregistreur", group: "Drone & son", layer: "audio", color: "#a698ef" },
  { id: "perche", kind: "audio", label: "Perche / shotgun", group: "Drone & son", layer: "audio", color: "#a698ef" },
  { id: "note", kind: "note", label: "Annotation", group: "Annotations", layer: "annotations", color: "#f6db77", defaults: { text: "Note" } },
];

export const assetById = (id?: string) => assets.find((a) => a.id === id);

/** Rôles des personnes : couleur et initiale lisibles d'un coup d'œil sur le plan. */
export interface RoleDef {
  id: string;
  label: string;
  color: string;
  /** Lettre(s) dans le pion. */
  mark: string;
}
export const roles: RoleDef[] = [
  { id: "mariee", label: "Mariée", color: "#f4efe6", mark: "Me" },
  { id: "marie", label: "Marié", color: "#35507a", mark: "Mé" },
  { id: "couple", label: "Couple", color: "#e6c27f", mark: "♥" },
  { id: "officiant", label: "Officiant", color: "#8b62e0", mark: "Of" },
  { id: "pretre", label: "Prêtre", color: "#5b3fa8", mark: "Pr" },
  { id: "planner", label: "Wedding planner", color: "#22a3a8", mark: "WP" },
  { id: "photographe", label: "Photographe", color: "#e08a3c", mark: "Ph" },
  { id: "videaste", label: "Vidéaste", color: "#e0513a", mark: "Vi" },
  { id: "dj", label: "DJ", color: "#6b5ca5", mark: "DJ" },
  { id: "temoin", label: "Témoin", color: "#2f9e62", mark: "Té" },
  { id: "mere", label: "Mère", color: "#c46bd1", mark: "Mè" },
  { id: "pere", label: "Père", color: "#4d8fe0", mark: "Pè" },
  { id: "parent", label: "Parent", color: "#9a7b4f", mark: "Pa" },
  { id: "demoiselle", label: "Demoiselle d’honneur", color: "#e79bb3", mark: "DH" },
  { id: "garcon", label: "Garçon d’honneur", color: "#7fb2ea", mark: "GH" },
  { id: "invite", label: "Invité", color: "#9aa1ab", mark: "In" },
  { id: "enfant", label: "Enfant", color: "#c9ced6", mark: "En" },
  { id: "danseur", label: "Danseur", color: "#d8568a", mark: "Da" },
  { id: "maquilleuse", label: "Maquilleuse / coiffeuse", color: "#b77ea8", mark: "MU" },
];
export const roleById = (id?: string) => roles.find((r) => r.id === id) ?? roles.find((r) => r.id === "invite")!;

export interface SensorDef {
  id: string;
  label: string;
  /** Largeur utile du capteur, en millimètres. */
  width: number;
}
export const sensors: SensorDef[] = [
  { id: "ff", label: "Plein format 24×36", width: 36 },
  { id: "s35", label: "Super 35", width: 24.9 },
  { id: "apsc", label: "APS-C", width: 23.5 },
  { id: "mft", label: "Micro 4/3", width: 17.3 },
  { id: "1in", label: "1 pouce (drone, compact)", width: 13.2 },
  { id: "phone", label: "Smartphone (focale équivalente)", width: 36 },
];
export const sensorById = (id?: string) => sensors.find((s) => s.id === id) ?? sensors[0];
export const focalPresets = [16, 24, 35, 50, 85, 135, 200];

export const supports: [string, string][] = [
  ["trepied", "Trépied"],
  ["monopode", "Monopode"],
  ["gimbal", "Gimbal"],
  ["epaule", "Épaule"],
  ["main", "Main levée"],
  ["slider", "Slider"],
  ["jib", "Grue / jib"],
  ["steadicam", "Steadicam"],
  ["fixe", "Fixe sans opérateur"],
];

export interface LightDef {
  id: string;
  label: string;
  beam: number;
  reach: number;
  /** Lumière qui retire de la lumière (negative fill) : cône sombre. */
  subtractive?: boolean;
}
export const lightTypes: LightDef[] = [
  { id: "led", label: "Panneau LED", beam: 60, reach: 4 },
  { id: "cob", label: "COB (projecteur)", beam: 55, reach: 6 },
  { id: "softbox", label: "Softbox sur pied", beam: 90, reach: 3 },
  { id: "tube", label: "Tube LED", beam: 120, reach: 2.5 },
  { id: "panneau", label: "Panneau diffusant", beam: 100, reach: 3 },
  { id: "spot", label: "Spot", beam: 20, reach: 8 },
  { id: "fresnel", label: "Fresnel", beam: 35, reach: 7 },
  { id: "bounce", label: "Bounce (réflexion)", beam: 100, reach: 3 },
  { id: "reflecteur", label: "Réflecteur", beam: 70, reach: 3 },
  { id: "negative", label: "Negative fill", beam: 80, reach: 2, subtractive: true },
  { id: "diffusion", label: "Diffusion", beam: 110, reach: 2.5 },
  { id: "practical", label: "Practical (lampe)", beam: 300, reach: 2 },
  { id: "fenetre", label: "Fenêtre (lumière du jour)", beam: 120, reach: 5 },
  { id: "naturelle", label: "Lumière naturelle", beam: 150, reach: 10 },
];
export const lightById = (id?: string) => lightTypes.find((l) => l.id === id) ?? lightTypes[0];

export type MoverKind = "camera" | "person" | "drone";
export interface MovementDef {
  id: string;
  label: string;
  for: MoverKind[];
  /** Ce qui se règle : sujet, trajectoire dessinée, distance, amplitude, altitude. */
  target?: boolean;
  path?: boolean;
  distance?: number;
  sweep?: number;
  rise?: number;
  duration: number;
  hint: string;
  /** Implique un déplacement physique de la caméra : irréaliste sur un trépied/support fixe posé au sol. */
  translates?: boolean;
}
export const movements: MovementDef[] = [
  { id: "static", label: "Statique", for: ["camera", "person", "drone"], duration: 4, hint: "Ne bouge pas." },
  { id: "pan-left", label: "Pan gauche", for: ["camera"], sweep: -45, duration: 3, hint: "Le pied reste fixe, l’axe tourne vers la gauche." },
  { id: "pan-right", label: "Pan droite", for: ["camera"], sweep: 45, duration: 3, hint: "Le pied reste fixe, l’axe tourne vers la droite." },
  { id: "pan-follow", label: "Pan de suivi", for: ["camera"], target: true, duration: 8, hint: "Le pied reste fixe, l’axe suit le sujet qui se déplace." },
  { id: "tilt-up", label: "Tilt haut", for: ["camera"], duration: 3, hint: "L’axe bascule vers le haut (vu du dessus : indiqué par la flèche)." },
  { id: "tilt-down", label: "Tilt bas", for: ["camera"], duration: 3, hint: "L’axe bascule vers le bas." },
  { id: "push-in", label: "Push-in", for: ["camera"], distance: 1.5, duration: 4, hint: "La caméra avance vers le sujet.", translates: true },
  { id: "pull-out", label: "Pull-out", for: ["camera"], distance: 1.5, duration: 4, hint: "La caméra recule et révèle le décor.", translates: true },
  { id: "truck-left", label: "Travelling gauche", for: ["camera"], distance: 2, duration: 4, hint: "Déplacement latéral vers la gauche, même axe.", translates: true },
  { id: "truck-right", label: "Travelling droite", for: ["camera"], distance: 2, duration: 4, hint: "Déplacement latéral vers la droite, même axe.", translates: true },
  { id: "dolly", label: "Dolly (sur rail)", for: ["camera"], path: true, duration: 5, hint: "Suit un rail dessiné, l’axe reste le même.", translates: true },
  { id: "tracking", label: "Tracking", for: ["camera"], target: true, path: true, duration: 6, hint: "Suit la trajectoire dessinée en gardant le sujet dans l’axe.", translates: true },
  { id: "follow", label: "Follow (suivi)", for: ["camera"], target: true, duration: 6, hint: "Suit le sujet derrière lui, à distance constante.", translates: true },
  { id: "leading", label: "Leading (devant)", for: ["camera"], target: true, duration: 6, hint: "Recule devant le sujet qui avance, face à lui.", translates: true },
  { id: "orbit", label: "Orbit", for: ["camera"], target: true, sweep: 90, duration: 5, hint: "Tourne autour du sujet en le gardant au centre.", translates: true },
  { id: "arc", label: "Arc", for: ["camera"], target: true, sweep: 60, duration: 4, hint: "Portion d’orbite autour du sujet.", translates: true },
  { id: "arc180", label: "Arc 180°", for: ["camera"], target: true, sweep: 180, duration: 6, hint: "Demi-tour autour du sujet.", translates: true },
  { id: "orbit360", label: "360°", for: ["camera"], target: true, sweep: 360, duration: 10, hint: "Tour complet autour du sujet.", translates: true },
  { id: "reveal", label: "Reveal", for: ["camera"], target: true, distance: 2, duration: 4, hint: "Glisse latéralement et découvre le sujet.", translates: true },
  { id: "crane-up", label: "Grue montante", for: ["camera"], rise: 1.5, duration: 5, hint: "La caméra s’élève.", translates: true },
  { id: "crane-down", label: "Grue descendante", for: ["camera"], rise: -1.5, duration: 5, hint: "La caméra descend.", translates: true },
  { id: "handheld", label: "Caméra épaule", for: ["camera"], duration: 5, hint: "Léger flottement vivant autour de la position." },
  { id: "parallax", label: "Parallaxe", for: ["camera"], target: true, distance: 2, duration: 5, hint: "Travelling latéral en gardant le sujet dans l’axe.", translates: true },
  { id: "whip-pan", label: "Whip pan", for: ["camera"], sweep: 90, duration: 1, hint: "Pan très rapide qui file vers le plan suivant." },
  { id: "custom", label: "Trajectoire libre", for: ["camera", "drone"], path: true, duration: 6, hint: "Dessinez le chemin point par point.", translates: true },
  { id: "walk", label: "Marche", for: ["person"], path: true, duration: 8, hint: "La personne suit le chemin dessiné." },
  { id: "turn", label: "Se retourne", for: ["person"], sweep: 180, duration: 1.5, hint: "Pivote sur place (ex. le marié se retourne)." },
  { id: "top-shot", label: "Top shot", for: ["drone"], rise: 15, duration: 6, hint: "Monte à la verticale au-dessus du sujet." },
  { id: "drone-orbit", label: "Orbite drone", for: ["drone"], target: true, sweep: 360, duration: 14, hint: "Tourne autour du sujet en altitude." },
  { id: "pull-away", label: "Pull away", for: ["drone"], distance: 25, rise: 20, duration: 10, hint: "Recule en montant : le lieu se révèle." },
  { id: "push-forward", label: "Push forward", for: ["drone"], distance: 25, rise: -10, duration: 10, hint: "Avance en descendant vers le sujet." },
  { id: "drone-reveal", label: "Reveal drone", for: ["drone"], distance: 12, rise: 15, duration: 8, hint: "Passe l’obstacle et découvre le lieu." },
  { id: "rise", label: "Montée", for: ["drone"], rise: 20, duration: 6, hint: "S’élève sur place." },
  { id: "descend", label: "Descente", for: ["drone"], rise: -20, duration: 6, hint: "Descend sur place." },
  { id: "drone-tracking", label: "Tracking drone", for: ["drone"], target: true, duration: 10, hint: "Suit le sujet (voiture, couple)." },
  { id: "fly-over", label: "Survol", for: ["drone"], path: true, duration: 10, hint: "Survole le lieu selon le chemin dessiné." },
];
export const movementById = (id?: string) => movements.find((m) => m.id === id);
/** Support de caméra posé au sol : ne peut pas se déplacer physiquement, seulement tourner (pan/tilt). */
export const groundedSupports = new Set(["trepied", "fixe"]);
/**
 * Mouvements proposés pour un élément donné. Pour une caméra trépied/fixe, les mouvements qui
 * impliquent un déplacement physique (travelling, orbite, grue…) sont masqués par défaut — irréaliste
 * pour un support posé au sol — sauf `allowTranslate` (l'utilisateur les demande explicitement).
 */
export const movementsFor = (kind: ElementKind, support?: string, allowTranslate = false): MovementDef[] => {
  const list = movements.filter((m) => m.for.includes(kind === "person" || kind === "crowd" ? "person" : kind === "drone" ? "drone" : "camera"));
  if (kind !== "camera" || allowTranslate || !groundedSupports.has(support ?? "")) return list;
  return list.filter((m) => !m.translates);
};

/** Couleurs des calques et libellés. */
export const layers: [LayerId, string][] = [
  ["architecture", "Architecture"],
  ["decor", "Décor"],
  ["people", "Personnes"],
  ["cameras", "Caméras"],
  ["lights", "Lumières"],
  ["audio", "Audio"],
  ["annotations", "Annotations"],
];
