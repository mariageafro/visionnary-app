import type { Item, ModuleId, Project, Preset } from "./types";
import { clonePlan } from "./scene/ops";
import { interviewTypes } from "./interviews";

export const uid = () => crypto.randomUUID();
export const done = (i: Item) => ["tourné", "excellent", "terminé", "vérifié", "livré"].includes(i.status);
export const statuses = [
  "prévu",
  "prêt",
  "en cours",
  "tourné",
  "excellent",
  "à refaire",
  "sauté",
  "impossible",
  "bonus",
  "terminé",
];
export const priorities = ["MUST HAVE", "IMPORTANT", "BONUS"];

export type Field = {
  key: string;
  label: string;
  type?: string;
  link?: ModuleId;
  /** Liste fermée : [valeur, libellé]. */
  choices?: [string, string][];
  /** Suggestions (datalist) : la saisie reste libre. */
  suggest?: string[];
  /** Champ affiché seulement si la condition est vraie (ex. réglages pour une caméra). */
  when?: (item: Item) => boolean;
  long?: boolean;
};
export type Module = {
  id: ModuleId;
  label: string;
  subtitle: string;
  icon: string;
  fields: Field[];
  /** Option du tournage qui rend ce module pertinent (voir features). */
  feature?: string;
};

const f = (key: string, label: string, type = "text", extra: Partial<Field> = {}): Field => ({
  key,
  label,
  type,
  ...extra,
});
const link = (key: string, label: string, target: ModuleId): Field => ({ key, label, link: target });
const suggest = (key: string, label: string, values: string[]): Field => ({ key, label, suggest: values });
const choice = (key: string, label: string, values: [string, string][]): Field => ({ key, label, choices: values });
const long = (key: string, label: string): Field => ({ key, label, long: true });

export const framings = [
  "Très grand ensemble",
  "Plan d’ensemble",
  "Plan large",
  "Plein pied",
  "Plan américain",
  "Plan taille",
  "Plan poitrine",
  "Plan rapproché",
  "Gros plan",
  "Très gros plan",
  "Détail / insert",
  "Réaction",
  "Plan de coupe",
  "Master / sécurité",
  "Par-dessus l’épaule",
  "POV (vue subjective)",
  "Two shot (deux personnes)",
  "Plan de groupe",
  "Establishing",
  "Drone establishing",
];
/** Valeur de plan en code court, lisible d'un coup d'œil sur une carte (CU, MCU, WS…). */
const framingCodes: Record<string, string> = {
  "Très grand ensemble": "EWS",
  "Plan d’ensemble": "WS",
  "Plan large": "WS",
  "Plein pied": "FS",
  "Plan américain": "MFS",
  "Plan taille": "MS",
  "Plan poitrine": "MCU",
  "Plan rapproché": "MCU",
  "Gros plan": "CU",
  "Très gros plan": "ECU",
  "Détail / insert": "INS",
  "Réaction": "RCT",
  "Plan de coupe": "CUT",
  "Master / sécurité": "MST",
  "Par-dessus l’épaule": "OTS",
  "POV (vue subjective)": "POV",
  "Two shot (deux personnes)": "2S",
  "Plan de groupe": "GRP",
  "Establishing": "EST",
  "Drone establishing": "DEST",
};
export const framingCode = (framing: unknown) => framingCodes[String(framing ?? "").trim()] ?? "";
/** Transitions prévues au tournage ou au montage : visibles sur les plans et dans chaque étape. */
export const transitionTypes = [
  "Cut franc",
  "Match cut",
  "Whip pan",
  "Foreground wipe (avant-plan)",
  "Camera cover",
  "Body wipe",
  "Passage de porte",
  "Transition objet",
  "Raccord mouvement",
  "Speed ramp",
  "Transition de point (rack focus)",
  "Transition lumière (flash, flare)",
  "Fondu",
  "J-cut",
  "L-cut",
];
/** Catégories du Pose Board (moodboard photo) : chacune peut contenir de 5 à 50 références. */
export const poseCategories = [
  "Mariée seule",
  "Marié seul",
  "Portraits individuels",
  "Mariée et demoiselles d’honneur",
  "Marié et garçons d’honneur",
  "Couple seul",
  "Couple et cortège",
  "Famille côté mariée",
  "Famille côté marié",
  "Familles réunies",
  "Groupe — tous les invités",
  "Groupe par table",
  "Témoins",
  "Invités et proches",
  "Salle vide",
  "Décor du lieu",
  "Détails",
  "Photos fun",
  "Photos éditoriales",
  "Photos traditionnelles",
];
export const orientations: [string, string][] = [
  ["", "—"],
  ["portrait", "Portrait (vertical)"],
  ["paysage", "Paysage (horizontal)"],
  ["carré", "Carré"],
];
/** Qui est dans le plan : sert au photographe comme au cadreur. */
export const people = [
  "Mariée",
  "Marié",
  "Couple",
  "Mère de la mariée",
  "Père de la mariée",
  "Mère du marié",
  "Père du marié",
  "Parents",
  "Témoins",
  "Demoiselles d’honneur",
  "Garçons d’honneur",
  "Famille",
  "Enfants",
  "Invités",
  "Officiant",
];
export const angles = [
  "Face",
  "3/4",
  "Profil",
  "Dos",
  "Plongée",
  "Contre-plongée",
  "Top shot",
  "Par-dessus l’épaule",
  "POV",
  "Règle des tiers",
  "Centré / symétrie",
  "Espace négatif",
  "Lignes directrices",
  "Avant-plan",
];
export const focals = [
  "14 mm",
  "24 mm · environnement",
  "35 mm · storytelling",
  "50 mm · naturel",
  "85 mm · portrait",
  "135 mm · compression",
  "70-200 mm",
  "100 mm macro · détail",
];
export const movements = [
  "Fixe",
  "Micro-mouvement",
  "Push in",
  "Push out",
  "Travelling",
  "Travelling latéral",
  "Orbit",
  "Arc",
  "Pan",
  "Tilt",
  "Grue / jib",
  "Épaule",
  "Gimbal",
  "Slider",
  "Reveal",
  "Whip",
  "Drone",
];
export const directions = ["Gauche → droite", "Droite → gauche", "Vers la caméra", "S’éloigne", "Statique"];
/** Chapitres du film, dans l'ordre narratif — regroupe la shot list pour qu'on s'y retrouve d'un coup d'œil. */
export const shotSections = [
  "Lieu & décor",
  "Mariée · Détails & accessoires",
  "Mariée · Maquillage & coiffure",
  "Mariée · Seule",
  "Mariée · Avec ses proches",
  "Mariée · Habillage",
  "Marié · Détails & accessoires",
  "Marié · Seul",
  "Marié · Avec ses proches",
  "Marié · Habillage",
  "Portraits mariée",
  "Portraits marié",
  "Portraits couple",
  "First look",
  "Cortège",
  "Famille",
  "Cérémonie",
  "Cocktail",
  "Interviews",
  "Réception",
  "Ouverture de bal",
  "Transitions / B-roll",
];
/** Plans sans chapitre : regroupés à part, jamais perdus. */
export const otherSection = "Autres plans";
/**
 * Chapitres d'avant le découpage des préparatifs en moments : les plans déjà chargés gardent
 * leur chapitre, rangé juste avant les moments qui l'ont remplacé.
 */
export const legacySections: Record<string, (typeof shotSections)[number]> = {
  "Préparatifs mariée": "Mariée · Détails & accessoires",
  "Préparatifs marié": "Marié · Détails & accessoires",
};
const filmOrder: string[] = shotSections.flatMap((s) => [
  ...Object.keys(legacySections).filter((old) => legacySections[old] === s),
  s,
]);
const tidy = (s: unknown) => String(s ?? "").trim().replace(/\s+/g, " ");
const sectionKey = (s: string) => tidy(s).toLocaleLowerCase("fr");
const canonical = new Map([...filmOrder, otherSection].map((s) => [sectionKey(s), s]));

/** Chapitre d'un plan : chapitre connu (casse et espaces tolérés), sinon le chapitre personnalisé tel quel. */
export function sectionOf(item: Item): string {
  const raw = tidy(item.section);
  return raw ? (canonical.get(sectionKey(raw)) ?? raw) : otherSection;
}
/**
 * Chapitres présents dans l'ordre du film ; les chapitres personnalisés suivent dans l'ordre
 * où on les rencontre, et « Autres plans » ferme la marche.
 */
export function orderSections(sections: Iterable<string>): string[] {
  const present = new Set(sections);
  const custom = [...present].filter((s) => !canonical.has(sectionKey(s)));
  return [...filmOrder.filter((s) => present.has(s)), ...custom, ...(present.has(otherSection) ? [otherSection] : [])];
}
export type Side = "mariée" | "marié";
const sidePrefix = /^(mariée|marié)\s*[·:–—-]\s*/i;
/** Côté d'un moment : « Mariée · … », « Marié · … » et les anciens préparatifs ; sinon moment commun. */
export function sideOf(section: string): Side | undefined {
  const s = sectionKey(section);
  if (s === "préparatifs mariée") return "mariée";
  if (s === "préparatifs marié") return "marié";
  const hit = sidePrefix.exec(s);
  return hit ? (hit[1] as Side) : undefined;
}
/** Nom du moment dans sa piste : « Mariée · Seule » devient « Seule ». */
export const momentLabel = (section: string) => (sideOf(section) && section.replace(sidePrefix, "")) || section;
const isCamera = (i: Item) => /cam|boîtier|boitier|drone/i.test(String(i.category ?? "") + " " + i.title);

export const modules: Module[] = [
  {
    id: "stages",
    label: "Déroulé du jour J",
    subtitle: "Chaque moment, à sa juste place.",
    icon: "Clock3",
    fields: [
      suggest("category", "Type de moment", ["Étape", "Événement imprévu", "B-roll", "Interview", "Vœux audio"]),
      f("time", "Heure prévue", "time"),
      f("duration", "Durée (minutes)", "number"),
      link("venueId", "Lieu", "venues"),
      link("operatorId", "Responsable", "team"),
      choice("priority", "Priorité", [["", "Non définie"], ["MUST HAVE", "Essentiel"], ["IMPORTANT", "Important"], ["BONUS", "Optionnel"]]),
      suggest("person", "Personnes concernées", people),
      f("camera", "Caméras / équipe concernées"),
      choice("liveRelevant", "À couvrir en live", [["", "À décider"], ["oui", "Oui"], ["non", "Non"]]),
      f("scene", "Scène / sous-lieu"),
      long("planB", "Plan B (pluie, retard, lumière)"),
    ],
  },
  {
    id: "shots",
    label: "Plans & scènes",
    subtitle: "Préparez le film avant de le tourner.",
    icon: "Clapperboard",
    fields: [
      choice("subjectGroup", "Côté / sujet", [["Mariée", "Mariée"], ["Marié", "Marié"], ["Ensemble", "Ensemble"]]),
      choice("media", "Type", [
        ["", "Vidéo et photo"],
        ["video", "Vidéo"],
        ["photo", "Photo"],
        ["drone", "Drone"],
      ]),
      suggest("section", "Section du film", shotSections),
      link("stageId", "Étape", "stages"),
      suggest("person", "Personne(s)", people),
      f("scene", "Scène"),
      link("operatorId", "Opérateur", "team"),
      link("venueId", "Lieu", "venues"),
      link("referenceId", "Inspiration", "inspirations"),
      suggest("framing", "Valeur de plan", framings),
      suggest("angle", "Angle / composition", angles),
      suggest("focal", "Focale", focals),
      choice("orientation", "Orientation (photo)", orientations),
      suggest("movement", "Mouvement", movements),
      choice("direction", "Direction du mouvement / regard", [["", "—"], ...directions.map((d): [string, string] => [d, d])]),
      f("camera", "Caméra"),
      suggest("fps", "Cadence", ["24 fps", "25 fps", "50 fps", "60 fps", "100 fps", "120 fps"]),
      f("settings", "Shutter · ISO · WB · ND"),
      f("subject", "Sujet / pose / regard"),
      f("light", "Lumière"),
      f("sound", "Son"),
      f("duration", "Durée au montage (secondes)", "number"),
      f("shootMinutes", "Temps de tournage (minutes)", "number"),
      f("usableSeconds", "Durée exploitable minimale (secondes)", "number"),
      choice("bRoll", "Plan B-roll", [["", "Non défini"], ["oui", "Oui"], ["non", "Non"]]),
      choice("teaser", "À inclure au teaser", [["", "Non défini"], ["oui", "Oui"], ["non", "Non"]]),
      choice("sde", "À inclure au Same-Day Edit", [["", "Non défini"], ["indispensable", "Indispensable"], ["utile", "Utile"], ["non", "Non"]]),
      choice("liveRelevant", "Pertinent pour le live", [["", "Non défini"], ["oui", "Oui"], ["non", "Non"]]),
      long("planB", "Plan B"),
      f("continuity", "Raccord / continuité"),
      f("clipIn", "Référence IN (secondes)", "number"),
      f("clipOut", "Référence OUT (secondes)", "number"),
      f("segmentType", "Type de plan (segment)"),
    ],
  },
  {
    id: "inspirations",
    label: "Plans & inspirations",
    subtitle: "Une intention. Une référence. Un plan.",
    icon: "Images",
    fields: [
      link("stageId", "Étape", "stages"),
      suggest("category", "Catégorie", [
        "Couple",
        "Mariée",
        "Marié",
        "Garçons d’honneur",
        "Filles d’honneur",
        "Famille",
        "Cérémonie",
        "Mairie",
        "Traditionnel",
        "Cocktail",
        "Soirée",
        "Décor",
        "B-roll",
        "Transitions",
        "Lumière",
        "Drone",
        "Poses",
        "Ouverture de bal",
        "Éditorial / Vogue",
      ]),
      suggest("framing", "Valeur de plan", framings),
      f("tags", "Tags"),
      f("url", "Lien de référence", "url"),
      f("clipIn", "IN (secondes)", "number"),
      f("clipOut", "OUT (secondes)", "number"),
      f("intention", "Intention visuelle"),
      f("source", "Source de l’inspiration"),
      f("duration", "Durée de la référence (secondes)", "number"),
      f("music", "Musique"),
      f("style", "Style visuel"),
    ],
  },
  {
    id: "venues",
    label: "Lieux & repérage",
    subtitle: "Trouvez la lumière avant le jour J.",
    icon: "MapPin",
    fields: [
      f("address", "Adresse"),
      f("gps", "Coordonnées GPS (lat, lng)"),
      f("contact", "Contact / téléphone"),
      f("arrival", "Arrivée prestataires", "time"),
      f("access", "Accès / parking / entrée"),
      long("zones", "Zones (façade, allée, piste, spot drone…)"),
      long("restrictions", "Règles : photo, drone, lumière, son"),
      f("power", "Électricité"),
      f("noise", "Bruit / circulation"),
      long("planB", "Plan pluie"),
    ],
  },
  {
    id: "team",
    label: "Équipe",
    subtitle: "La bonne personne au bon endroit.",
    icon: "Users",
    fields: [
      suggest("role", "Rôle", [
        "Réalisation / direction",
        "Cadreur",
        "Photographe",
        "Assistant",
        "Coordination",
        "Monteur",
        "Pilote drone",
        "Ingénieur son",
        "Superviseur",
      ]),
      f("phone", "Téléphone", "tel"),
      f("email", "E-mail", "email"),
      f("camera", "Caméra attribuée"),
      f("lenses", "Objectifs attribués"),
      f("audioKit", "Son attribué"),
      f("batteries", "Batteries"),
      f("cards", "Cartes mémoire"),
      f("accessories", "Accessoires"),
      f("intercom", "Radio / intercom"),
      f("skills", "Compétences"),
      f("availability", "Disponibilité"),
      f("time", "Début de mission", "time"),
      long("mission", "Mission"),
    ],
  },
  {
    id: "equipment",
    label: "Matériel",
    subtitle: "Préparer. Vérifier. Récupérer.",
    icon: "Camera",
    fields: [
      suggest("category", "Catégorie", [
        "Caméra",
        "Objectif",
        "Batteries",
        "Cartes",
        "Gimbal",
        "Trépied",
        "Lumière",
        "Drone",
        "Audio",
        "Intercom",
        "Filtres",
        "Câbles",
        "SSD",
        "Accessoires",
      ]),
      f("model", "Modèle"),
      link("operatorId", "Responsable", "team"),
      link("stageId", "Étape", "stages"),
      f("quantity", "Quantité", "number"),
      choice("state", "État", [
        ["", "—"],
        ["préparé", "Préparé"],
        ["remis", "Remis"],
        ["en utilisation", "En utilisation"],
        ["à charger", "À charger"],
        ["problème", "Problème"],
        ["récupéré", "Récupéré"],
        ["chargé", "Chargé"],
        ["présent", "Présent"],
        ["rendu", "Retour fait"],
        ["panne", "En panne"],
      ]),
      f("format", "Format", "text", { when: isCamera }),
      f("fps", "Fréquence", "text", { when: isCamera }),
      f("profile", "Profil d’image", "text", { when: isCamera }),
      f("wb", "Balance des blancs", "text", { when: isCamera }),
      f("aperture", "Ouverture", "text", { when: isCamera }),
      f("iso", "ISO", "text", { when: isCamera }),
      f("shutter", "Obturateur", "text", { when: isCamera }),
      f("nd", "ND", "text", { when: isCamera }),
      f("connection", "Branchement / connectique"),
      f("configuration", "Configuration"),
      long("quickProcedure", "Procédure rapide"),
      long("commonProblem", "Problème fréquent"),
      long("solution", "Solution / dépannage"),
    ],
  },
  {
    id: "checklists",
    label: "Checklist",
    subtitle: "On n’oublie rien. On fait les choses bien.",
    icon: "ListChecks",
    fields: [
      choice("phase", "Moment", [
        ["avant", "Avant"],
        ["jourj", "Jour J"],
        ["apres", "Après"],
      ]),
      suggest("category", "Section", ["Matériel vidéo", "Audio", "Photo", "Drone", "Tournage", "Fin de journée", "Sauvegarde"]),
      link("stageId", "Étape", "stages"),
      link("operatorId", "Responsable", "team"),
    ],
  },
  {
    id: "reminders",
    label: "Rappels intelligents",
    subtitle: "Les détails qui sauvent un tournage.",
    icon: "Bell",
    fields: [
      choice("trigger", "Déclencheur", [
        ["fixed", "Heure fixe"],
        ["before-start", "X min avant le début de l’étape"],
        ["at-start", "Au début de l’étape"],
        ["at-end", "À la fin de l’étape"],
        ["after-end", "X min après la fin de l’étape"],
        ["before-sunset", "X min avant le coucher du soleil"],
        ["critical-missed", "Plan essentiel non tourné en fin d’étape"],
        ["task-done", "X min après une tâche cochée"],
      ]),
      f("due", "Heure fixe", "datetime-local", { when: (i) => !i.trigger || i.trigger === "fixed" }),
      f("offset", "Décalage (minutes)", "number", {
        when: (i) => ["before-start", "after-end", "before-sunset", "task-done"].includes(String(i.trigger)),
      }),
      { ...link("stageId", "Étape liée", "stages"), when: (i) => String(i.trigger ?? "").includes("-") && !["before-sunset", "task-done"].includes(String(i.trigger)) },
      { ...link("taskId", "Tâche", "checklists"), when: (i) => i.trigger === "task-done" },
      link("operatorId", "Responsable", "team"),
      choice("priority", "Priorité", [["INFORMATION", "Information"], ["IMPORTANT", "Important"], ["CRITIQUE", "Critique"]]),
    ],
  },
  {
    id: "audio",
    label: "Audio & synchro",
    subtitle: "Les mots qui feront votre histoire.",
    icon: "Mic",
    fields: [
      suggest("source", "Source / micro", ["Micro marié", "Micro mariée", "Officiant", "Témoin", "Console DJ", "Ambiance", "Caméra", "Secours"]),
      f("recorder", "Enregistreur"),
      link("operatorId", "Responsable", "team"),
      link("stageId", "Étape", "stages"),
      f("level", "Niveaux"),
      f("timecode", "Timecode / clap"),
      f("backup", "Secours"),
      f("retrieval", "Récupération"),
    ],
  },
  {
    id: "lighting",
    label: "Lumière",
    subtitle: "Dessinez l’émotion avec la lumière.",
    icon: "Sun",
    fields: [
      suggest("role", "Rôle", ["Key", "Fill", "Rim / contre-jour", "Practical", "Soleil", "Fenêtre", "Réflecteur", "LED", "Bougies", "Lumière DJ"]),
      link("stageId", "Étape", "stages"),
      f("direction", "Orientation"),
      f("power", "Intensité indicative"),
      f("temperature", "Température (K)"),
      f("reference", "Rendu attendu"),
      f("retrieval", "Récupération"),
    ],
  },
  {
    id: "poses",
    label: "Poses",
    subtitle: "Diriger avec douceur, composer avec intention.",
    icon: "Focus",
    fields: [
      choice("subjectGroup", "Côté / sujet", [["Mariée", "Mariée"], ["Marié", "Marié"], ["Ensemble", "Ensemble"]]),
      link("stageId", "Étape", "stages"),
      link("operatorId", "Photographe", "team"),
      suggest("category", "Catégorie", [...poseCategories, "Mouvement", "Escaliers", "Fenêtre", "Voile", "Voiture", "Nuit"]),
      choice("orientation", "Orientation", orientations),
      f("hands", "Mains / regard"),
      suggest("framing", "Cadrage", framings),
      suggest("focal", "Focale", focals),
      f("light", "Lumière"),
      f("duration", "Durée (minutes)", "number"),
      long("instruction", "Consigne photo / phrase à dire"),
    ],
  },
  {
    id: "interviews",
    label: "Interviews",
    subtitle: "Recueillez les mots qui comptent.",
    icon: "MessageCircle",
    fields: [
      f("person", "Personne / relation"),
      choice("interviewType", "Type d’interview", [["", "À choisir"], ...interviewTypes.map((value): [string, string] => [value, value])]),
      f("time", "Heure", "time"),
      f("duration", "Durée (minutes)", "number"),
      link("venueId", "Lieu", "venues"),
      link("operatorId", "Opérateur", "team"),
      f("sound", "Micro / son"),
      f("ambientNoise", "Bruit ambiant / environnement"),
      suggest("story", "Tag narration", ["Welcome", "Power statement", "Mariée", "Marié", "First look", "Vœux", "Premier baiser", "Vœux des proches", "Discours", "Réactions", "Ambiance"]),
      long("questions", "Questions"),
      long("answers", "Réponses / notes"),
      f("best", "Meilleur passage"),
      choice("takeValidated", "Prise validée", [["", "À vérifier"], ["oui", "Oui"], ["non", "Non, refaire"]]),
    ],
  },
  {
    id: "notes",
    label: "Notes & idées",
    subtitle: "Gardez une trace de chaque intuition.",
    icon: "NotebookPen",
    fields: [
      choice("category", "Type", [
        ["Note", "Note"],
        ["Idée", "Idée"],
        ["Inspiration", "Inspiration"],
      ]),
      f("tags", "Tags"),
      link("stageId", "Étape", "stages"),
    ],
  },
  {
    id: "documents",
    label: "Documents",
    subtitle: "Le dossier de production, toujours à portée de main.",
    icon: "Files",
    fields: [suggest("category", "Type", ["Contrat", "Planning", "Plan du lieu", "Autorisation", "Questionnaire"]), f("contact", "Contact"), f("expiry", "Échéance", "date")],
  },
  {
    id: "prewedding",
    label: "Pré-wedding",
    subtitle: "Le premier chapitre de leur histoire.",
    icon: "Heart",
    feature: "prewedding",
    fields: [
      link("venueId", "Lieu", "venues"),
      f("date", "Date", "date"),
      f("time", "Heure", "time"),
      f("outfit", "Tenues"),
      long("scenario", "Scénario"),
      f("poses", "Poses"),
      f("music", "Musique"),
      long("planB", "Plan pluie"),
    ],
  },
  {
    id: "postproduction",
    label: "Montage & livraison",
    subtitle: "De la première copie à la dernière émotion.",
    icon: "Film",
    fields: [
      suggest("phase", "Étape", [
        "Rushs reçus",
        "Sauvegarde faite",
        "Synchronisation",
        "Dérush / selects",
        "Montage principal",
        "Sound design",
        "Étalonnage",
        "Mixage",
        "Sous-titres",
        "Teaser",
        "Reel",
        "Export / contrôle qualité",
        "Livraison",
        "Corrections client",
      ]),
      link("operatorId", "Responsable", "team"),
      f("due", "Échéance", "date"),
      f("version", "Version"),
      f("music", "Musique / validation"),
      long("changes", "Corrections"),
      f("delivery", "Livraison / lien", "url"),
    ],
  },
  {
    id: "sde",
    label: "Same-Day Edit",
    subtitle: "Leur journée, déjà sur grand écran.",
    icon: "Zap",
    feature: "sde",
    fields: [
      f("due", "Projection", "datetime-local"),
      f("duration", "Durée cible (secondes)", "number"),
      link("operatorId", "Monteur", "team"),
      f("music", "Musique"),
      f("transfer", "Transferts / rushs reçus"),
      f("missing", "Séquences manquantes"),
      f("projection", "Test image / son / projection"),
    ],
  },
  {
    id: "live",
    label: "Live",
    subtitle: "Préparez le direct et son plan de secours.",
    icon: "Radio",
    feature: "live",
    fields: [
      f("platform", "Plateforme"),
      f("url", "Lien public", "url"),
      f("time", "LIVE ON", "time"),
      f("end", "LIVE OFF", "time"),
      f("network", "Réseau principal"),
      f("backup", "Réseau de secours"),
      f("encoder", "Encodeur"),
      f("audio", "Audio"),
      link("operatorId", "Responsable", "team"),
      f("recording", "Enregistrement local"),
    ],
  },
  {
    id: "dance",
    label: "Danse & flashmob",
    subtitle: "Le mouvement, préparé ensemble.",
    icon: "Music2",
    feature: "dance",
    fields: [
      f("music", "Musique"),
      f("duration", "Durée (secondes)", "number"),
      long("beats", "Temps forts (ex. 0:42 portée)"),
      f("dancers", "Danseurs"),
      f("positions", "Entrées / sorties"),
      long("camera", "Rôles multicam"),
      f("light", "Lumière / effets"),
    ],
  },
  {
    id: "drone",
    label: "Drone",
    subtitle: "Vu d’en haut, en sécurité.",
    icon: "Plane",
    feature: "drone",
    fields: [
      suggest("move", "Mouvement", ["Establishing", "Top down", "Reveal", "Push in", "Pull out", "Orbit", "Tracking", "Flyover", "Montée", "Descente", "Suivi voiture"]),
      link("venueId", "Lieu", "venues"),
      link("stageId", "Étape", "stages"),
      f("time", "Heure", "time"),
      link("operatorId", "Pilote", "team"),
      f("wind", "Vent max accepté (km/h)", "number"),
      f("batteries", "Batteries"),
      choice("authorization", "Autorisation", [
        ["", "À vérifier"],
        ["ok", "Obtenue / zone autorisée"],
        ["refus", "Refusée / zone interdite"],
      ]),
      long("groundPlan", "Plan alternatif au sol"),
    ],
  },
  {
    id: "backups",
    label: "Sauvegardes",
    subtitle: "Les souvenirs méritent deux copies.",
    icon: "HardDrive",
    fields: [
      f("source", "Carte / source"),
      f("primary", "Disque principal"),
      f("secondary", "Disque de secours"),
      f("copies", "Copies confirmées", "number"),
      f("verified", "Vérification / checksum"),
      link("operatorId", "Responsable", "team"),
    ],
  },
  {
    id: "transitions",
    label: "Transitions",
    subtitle: "Reliez les plans avec intention.",
    icon: "MoveRight",
    fields: [
      link("stageId", "Étape", "stages"),
      link("fromId", "Plan source", "shots"),
      link("toId", "Plan cible", "shots"),
      choice("category", "Famille", [
        ["tournage", "Transition de tournage"],
        ["montage", "Transition de montage"],
      ]),
      suggest("movement", "Type de transition", [...transitionTypes, "Silhouette", "Reflet", "Ombre", "Reveal"]),
      f("duration", "Durée (secondes)", "number"),
    ],
  },
  {
    id: "briefings",
    label: "Briefings",
    subtitle: "Une vision commune pour toute l’équipe.",
    icon: "ClipboardList",
    fields: [
      link("operatorId", "Destinataire", "team"),
      link("stageId", "Étape", "stages"),
      f("time", "Heure", "time"),
      f("objective", "Objectif"),
      long("constraints", "Points d’attention"),
    ],
  },
];
export const moduleById = (id: string) => modules.find((m) => m.id === id);

export function makeItem(module: ModuleId, title: string, extra: Partial<Item> = {}): Item {
  return { id: uid(), module, title, status: "prévu", priority: "IMPORTANT", notes: "", order: 0, ...extra };
}
export function newProject(name = "Nouveau tournage"): Project {
  return {
    id: uid(),
    name,
    date: "",
    venue: "",
    couple: "",
    style: "Cinématique",
    status: "en préparation",
    guests: 0,
    mustHave: "",
    avoid: "",
    priorities: "",
    items: [],
    placements: [],
    features: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
// Seuls les champs de relation sont remappés : un titre identique à un ID reste du texte.
export const itemRelations: Record<string, ModuleId | undefined> = {
  stageId: "stages",
  operatorId: "team",
  venueId: "venues",
  referenceId: "inspirations",
  fromId: "shots",
  toId: "shots",
  taskId: "checklists",
  sourceItemId: undefined,
};
export const mediaReferenceKeys = ["mediaId", "imageId", "coverId", "sourceMediaId"];
/**
 * Copie un ensemble d'éléments avec de nouveaux identifiants ; les liens internes suivent la copie.
 * `sameProject` : la copie reste dans le même tournage, donc les liens vers l'extérieur (équipe,
 * lieu, inspiration) et les références médias restent valides et sont conservés.
 */
export function cloneItems(items: Item[], sameProject = false): Item[] {
  const ids = new Map(items.map((i) => [i.id, uid()]));
  // Les chaînes de rappels sont regroupées par chainId : chaque copie reçoit ses propres chaînes.
  const chains = new Map<string, string>();
  return items.map((item) => {
    const copy: Item = { ...item, id: ids.get(item.id)! };
    for (const key of Object.keys(itemRelations)) {
      if (copy[key]) {
        const mapped = ids.get(String(copy[key]));
        if (mapped) copy[key] = mapped;
        else if (!sameProject) delete copy[key];
      }
    }
    if (copy.chainId) {
      const key = String(copy.chainId);
      if (!chains.has(key)) chains.set(key, ids.get(key) ?? uid());
      copy.chainId = chains.get(key);
    }
    if (!sameProject) for (const key of mediaReferenceKeys) delete copy[key];
    return copy;
  });
}

/** Une étape et tout ce qui lui est rattaché (plans, poses, transitions, checklist, rappels…). */
export function stageBundle(p: Project, stageId: string): Item[] {
  const stage = p.items.find((i) => i.id === stageId && i.module === "stages");
  if (!stage) return [];
  const linked = p.items.filter((i) => i.stageId === stageId && i.module !== "stages" && i.status !== "archivé");
  const shotIds = new Set(linked.filter((i) => i.module === "shots").map((i) => i.id));
  // Transitions entre deux plans de l'étape, même sans rattachement explicite à l'étape.
  const between = p.items.filter((i) => i.module === "transitions" && !i.stageId && shotIds.has(String(i.fromId)) && shotIds.has(String(i.toId)));
  return [stage, ...linked, ...between];
}

/**
 * Duplique une étape dans le même tournage, avec ses éléments. Les plans copiés montrent la même
 * référence que l'original (sans dupliquer le fichier) tant qu'on ne leur en donne pas une autre.
 */
export function duplicateStage(p: Project, stageId: string, visualMedia: Map<string, string>): Item[] {
  const bundle = stageBundle(p, stageId);
  const copies = cloneItems(bundle, true);
  return copies.map((copy, n) => {
    const original = bundle[n];
    // Une étape copiée est une étape à tourner : tout repart de zéro (prises, horaires réels…).
    const next: Item = { ...copy, status: copy.status === "archivé" ? "archivé" : "prévu", order: copy.order + (copy.module === "stages" ? 0.5 : 0) };
    for (const key of freshKeys) delete next[key];
    if (copy.module === "stages") next.title = original.title + " (copie)";
    if (!next.sourceMediaId && visualMedia.has(original.id)) next.sourceMediaId = visualMedia.get(original.id);
    return next;
  });
}
/** Traces du tournage réel, à effacer quand on repart d'une copie. */
const freshKeys = ["startedAt", "endedAt", "doneAt", "takesLog", "bestTake", "originalTime"];

/** Template d'étape réutilisable dans un autre mariage : liens externes retirés, tout à refaire. */
export function stageTemplate(p: Project, stageId: string): Preset | undefined {
  const bundle = stageBundle(p, stageId);
  if (!bundle.length) return undefined;
  const items = cloneItems(bundle).map((i) => {
    const copy: Item = { ...i, status: "prévu" };
    for (const key of freshKeys) delete copy[key];
    return copy;
  });
  const shots = items.filter((i) => i.module === "shots").length;
  return {
    id: uid(),
    name: bundle[0].title,
    description: `Étape · ${shots} plan${shots > 1 ? "s" : ""}${items.length - shots > 1 ? ` · ${items.length - shots - 1} autre(s) élément(s)` : ""}`,
    items,
    custom: true,
    kind: "étape",
  };
}
/**
 * Duplique un tournage entier pour servir de modèle à un autre mariage : toute la progression
 * (statuts, prises, horaires réels) repart de zéro, comme duplicateStage pour une seule étape.
 * Les références médias (mediaId/imageId/coverId/sourceMediaId, fonds et caméras du Scene Designer)
 * sont conservées ici (contrairement à une copie de plan isolé) : l'appelant (Shoot.tsx) duplique
 * ensuite les fichiers eux-mêmes dans IndexedDB pour ce nouveau tournage, en s'appuyant sur le même
 * repérage d'identifiants (items dans le même ordre que `p.items`, un par un).
 */
export function duplicateProject(p: Project): Project {
  const items = cloneItems(p.items, true).map((copy) => {
    const next: Item = { ...copy, status: copy.status === "archivé" ? "archivé" : "prévu" };
    for (const key of freshKeys) delete next[key];
    return next;
  });
  const itemIds = new Map(p.items.map((item, n) => [item.id, items[n].id]));
  const scenes = p.scenes?.map(scene => ({ ...scene, id: uid() }));
  const sceneIds = new Map(p.scenes?.map((scene, n) => [scene.id, scenes![n].id]));
  // Les horaires de moments suivent leur étape copiée ; ceux d'une étape disparue sont abandonnés.
  const moments = p.moments && Object.fromEntries(
    Object.entries(p.moments).flatMap(([key, time]) => {
      const cut = key.indexOf("|");
      const stageId = itemIds.get(key.slice(0, cut));
      return cut > 0 && stageId ? [[stageId + key.slice(cut), time]] : [];
    }),
  );
  // Plans de scène : liens vers les étapes, lieux, membres et plans suivis ; fonds et références
  // épinglées conservés (comme le reste des médias, voir plus haut), à remapper par l'appelant.
  const scenePlans = p.scenePlans?.map((plan) => clonePlan(plan, itemIds, true));
  return {
    ...p, id: uid(), name: p.name + " — copie", items, scenes, moments, scenePlans, coverId: undefined,
    status: p.status === "archivé" ? "archivé" : "en préparation",
    placements: p.placements.map(x => ({ ...x, id: uid(),
      operatorId: x.operatorId ? itemIds.get(x.operatorId) : undefined,
      sceneId: x.sceneId ? sceneIds.get(x.sceneId) : undefined,
    })),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

const checklist = (phase: string, category: string, titles: string[], start = 0) =>
  titles.map((title, n) => makeItem("checklists", title, { phase, category, order: start + n }));

export const standardChecklists = () => [
  ...checklist("avant", "Matériel vidéo", [
    "Caméras",
    "Objectifs",
    "Batteries chargées",
    "Cartes vides et formatées",
    "Trépieds / stabilisateur",
    "Filtres ND",
    "Lumières",
    "Ordinateur + SSD de travail et de secours",
  ]),
  ...checklist("avant", "Audio", ["Micros HF marié / mariée + piles", "Enregistreur table DJ", "Casque audio", "Intercom"], 8),
  ...checklist("jourj", "Tournage", [
    "Vérifier l’éclairage",
    "Tester le son (tous les micros)",
    "Régler le cadrage",
    "Lancer l’enregistrement",
    "Surveiller les niveaux sonores",
    "Plans de salle vide",
    "Noter les plans manquants",
  ], 12),
  ...checklist("apres", "Fin de journée", [
    "Enregistrements arrêtés",
    "Micros récupérés",
    "Enregistreurs récupérés",
    "Batteries et cartes récupérées",
    "Copie 1 des rushs",
    "Copie 2 vérifiée",
    "Matériel rangé",
    "Notes pour le montage",
  ], 19),
];

export const presetLibrary = (): Preset[] => [
  {
    id: "cinema",
    name: "Cinématique essentiel",
    description: "Une trame complète, du premier regard aux derniers instants.",
    items: [
      ...["Préparatifs", "Cérémonie", "Couple", "Réception"].map((s, n) =>
        makeItem("stages", s, { time: ["09:00", "14:00", "17:00", "19:00"][n], duration: 60, order: n }),
      ),
      ...[
        "Décor & détails",
        "Habillage",
        "Premier regard",
        "Entrée du couple",
        "Échange des alliances",
        "Réactions des proches",
        "Portrait au soleil",
        "Ouverture de bal",
      ].map((s, n) =>
        makeItem("shots", s, {
          order: n,
          framing: n % 2 ? "Gros plan" : "Plan large",
          movement: n % 2 ? "Fixe" : "Travelling",
          focal: n % 2 ? "85 mm · portrait" : "35 mm · storytelling",
          duration: 5,
          priority: n === 4 ? "MUST HAVE" : "IMPORTANT",
        }),
      ),
      ...standardChecklists(),
    ],
  },
  {
    id: "vogue",
    name: "Éditorial · Vogue",
    description: "Lignes, matière et gestes. Un regard affirmé.",
    items: ["Portrait fenêtre", "Silhouette architecturale", "Mains & bijoux", "Marche du couple", "Voile en mouvement", "Portrait frontal"].map(
      (s, n) =>
        makeItem("shots", s, {
          order: n,
          framing: n % 2 ? "Plein pied" : "Plan rapproché",
          focal: "50 mm · naturel",
          light: "Lumière latérale douce",
          duration: 4,
          movement: "Micro-mouvement",
        }),
    ),
  },
  {
    id: "dance",
    name: "Ouverture de bal · Multicam",
    description: "Master de sécurité, suivi, réactions et détails.",
    items: ["Master de sécurité", "Suivi du couple", "Réactions invités", "Détails mains & pieds"].map((s, n) =>
      makeItem("shots", s, {
        order: n,
        camera: "Cam " + String.fromCharCode(65 + n),
        framing: n === 0 ? "Plan large" : n === 3 ? "Détail / insert" : "Plan taille",
        duration: 8,
        priority: n === 0 ? "MUST HAVE" : "IMPORTANT",
      }),
    ),
  },
  {
    id: "audio",
    name: "Audio sans oubli",
    description: "Installer, contrôler, enregistrer, récupérer.",
    items: checklist("jourj", "Audio", [
      "Poser micro marié",
      "Poser micro mariée",
      "Tester micro officiant",
      "Brancher enregistreur DJ",
      "Écouter au casque",
      "Récupérer micros et enregistreurs",
    ]),
  },
  {
    id: "post",
    name: "Post-production complète",
    description: "Un parcours clair jusqu’à la livraison.",
    items: [
      "Rushs reçus",
      "Sauvegarde faite",
      "Synchronisation",
      "Dérush / selects",
      "Montage principal",
      "Sound design",
      "Étalonnage",
      "Mixage",
      "Sous-titres",
      "Export / contrôle qualité",
      "Livraison",
      "Corrections client",
    ].map((s, n) => makeItem("postproduction", s, { order: n, phase: s })),
  },
  {
    id: "fast",
    name: "Fast cuts",
    description: "Détails, inserts et changements d’angles.",
    items: ["Bijoux", "Chaussures", "Boutonnière", "Texture robe", "Regard", "Mains", "Champagne", "Rires"].map((s, n) =>
      makeItem("shots", s, {
        order: n,
        duration: 2,
        framing: "Détail / insert",
        movement: "Micro-mouvement",
        focal: "85 mm · portrait",
      }),
    ),
  },
];

export function coverage(p: Project) {
  const shots = p.items.filter((i) => i.module === "shots" && i.status !== "archivé");
  return {
    total: shots.length,
    completed: shots.filter(done).length,
    critical: shots.filter((i) => i.priority === "MUST HAVE" && !done(i)).length,
    percent: shots.length ? Math.round((shots.filter(done).length / shots.length) * 100) : 0,
  };
}
