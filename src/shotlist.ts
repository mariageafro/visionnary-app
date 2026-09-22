// Shot-list complète, façon réalisateur de mariage haut de gamme : chaque plan est déjà pensé
// (cadrage, angle, mouvement, sujet, parfois lumière) et rangé par chapitre du film — pour que
// n'importe quel membre de l'équipe sache exactement quoi faire, sans avoir à improviser.
import type { Item } from "./types";
import { makeItem, sectionOf, shotSections } from "./model";

// Un chapitre du film peut correspondre à une étape du déroulé (le mot-clé la reconnaît) :
// une fois liés, ouvrir l'étape « Préparatifs » dans le Déroulé montre directement ses plans.
const stageKeywords: Partial<Record<(typeof shotSections)[number], RegExp>> = {
  "Lieu & décor": /arriv|installation/i,
  "Mariée · Détails & accessoires": /préparatif/i,
  "Mariée · Maquillage & coiffure": /préparatif/i,
  "Mariée · Seule": /préparatif/i,
  "Mariée · Avec ses proches": /préparatif/i,
  "Mariée · Habillage": /préparatif/i,
  "Marié · Détails & accessoires": /préparatif/i,
  "Marié · Seul": /préparatif/i,
  "Marié · Avec ses proches": /préparatif/i,
  "Marié · Habillage": /préparatif/i,
  "First look": /first look/i,
  "Portraits couple": /couple shoot|portrait/i,
  Cérémonie: /cérémonie|mairie/i,
  Cocktail: /cocktail|vin d.honneur/i,
  Réception: /dîner|réception|entrée des mariés/i,
  "Ouverture de bal": /ouverture de bal/i,
};

/**
 * Relie chaque plan généré à l'étape du déroulé qui lui correspond, quand elle existe déjà
 * (par mot-clé dans le titre). Un plan sans étape correspondante reste simplement sans étape :
 * il apparaît toujours dans Plans & scènes, juste pas dans le détail d'une étape précise.
 */
export function linkShotsToStages(items: Item[], stages: Item[]): Item[] {
  return items.map((item) => {
    const pattern = stageKeywords[item.section as (typeof shotSections)[number]];
    const stage = pattern && stages.find((s) => pattern.test(s.title));
    return stage ? { ...item, stageId: stage.id } : item;
  });
}

interface ShotSpec {
  title: string;
  framing: string;
  movement: string;
  priority?: "MUST HAVE" | "IMPORTANT" | "BONUS";
  angle?: string;
  subject?: string;
  light?: string;
}
const IMPORTANT = "IMPORTANT" as const;
const MUST = "MUST HAVE" as const;
const BONUS = "BONUS" as const;

const bySection: [(typeof shotSections)[number], ShotSpec[]][] = [
  [
    "Lieu & décor",
    [
      {
        title: "Plan drone establishing, vue d’ensemble à l’arrivée",
        framing: "Plan d’ensemble",
        movement: "Drone",
        priority: IMPORTANT,
      },
      {
        title: "Façade et entrée du lieu",
        framing: "Plan large",
        movement: "Pan",
        priority: BONUS,
      },
      {
        title: "Allée ou jardin, plan large",
        framing: "Plan large",
        movement: "Travelling",
        priority: BONUS,
      },
      {
        title: "Salle vide décorée, plan d’ensemble",
        framing: "Plan d’ensemble",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Détail centre de table",
        framing: "Détail / insert",
        movement: "Fixe",
        priority: BONUS,
      },
      {
        title: "Architecture ou colonnades, plan de coupe",
        framing: "Plan large",
        movement: "Tilt",
        priority: BONUS,
      },
      {
        title: "Panneau de bienvenue ou plan de table",
        framing: "Détail / insert",
        movement: "Fixe",
        priority: BONUS,
      },
      {
        title: "Coucher de soleil sur le lieu",
        framing: "Plan d’ensemble",
        movement: "Fixe",
        priority: BONUS,
        light: "Golden hour",
      },
      {
        title: "Plan drone golden hour, reveal du domaine",
        framing: "Plan d’ensemble",
        movement: "Drone",
        priority: BONUS,
        light: "Golden hour",
      },
      {
        title: "Le lieu illuminé, nuit tombée",
        framing: "Plan d’ensemble",
        movement: "Fixe",
        priority: BONUS,
        light: "Nuit, éclairage artificiel",
      },
    ],
  ],
  // Préparatifs découpés moment par moment, dans l'ordre réel de la matinée :
  // on ouvre l'étape et on suit la frise, sans chercher.
  [
    "Mariée · Détails & accessoires",
    [
      { title: "Robe sur cintre, détail dentelle", framing: "Détail / insert", movement: "Fixe", priority: IMPORTANT },
      { title: "Chaussures et accessoires posés", framing: "Détail / insert", movement: "Micro-mouvement", priority: BONUS },
      { title: "Bouquet, alliance, invitation en flat lay", framing: "Détail / insert", movement: "Fixe", priority: IMPORTANT },
    ],
  ],
  [
    "Mariée · Maquillage & coiffure",
    [
      { title: "Mains de la maquilleuse au travail", framing: "Gros plan", movement: "Micro-mouvement", priority: IMPORTANT, angle: "3/4" },
      { title: "Coiffure — dernier geste", framing: "Plan rapproché", movement: "Fixe", priority: IMPORTANT },
    ],
  ],
  [
    "Mariée · Seule",
    [
      { title: "Mariée en peignoir, moment calme", framing: "Plan rapproché", movement: "Fixe", priority: BONUS, light: "Fenêtre, lumière douce" },
      { title: "Dernier regard dans le miroir", framing: "Plan rapproché", movement: "Push in", priority: MUST, angle: "3/4" },
      { title: "Mariée seule, plein pied avant de sortir", framing: "Plein pied", movement: "Fixe", priority: IMPORTANT },
    ],
  ],
  [
    "Mariée · Avec ses proches",
    [
      { title: "Rires avec les demoiselles d’honneur", framing: "Plan taille", movement: "Épaule", priority: IMPORTANT, subject: "Mariée + demoiselles d’honneur" },
      { title: "Sa mère, regard complice", framing: "Plan rapproché", movement: "Fixe", priority: MUST, subject: "Mariée + mère" },
      { title: "Détails regardés ensemble sur la table", framing: "Plan taille", movement: "Micro-mouvement", priority: BONUS, subject: "Mariée + proches" },
    ],
  ],
  [
    "Mariée · Habillage",
    [
      { title: "Enfilage de la robe, de dos", framing: "Plan américain", movement: "Fixe", priority: IMPORTANT, angle: "Dos" },
      { title: "Boutons ou zip fermés par la mère ou un témoin", framing: "Gros plan", movement: "Push in", priority: MUST },
      { title: "Pose des chaussures", framing: "Détail / insert", movement: "Fixe", priority: BONUS },
      { title: "Parfum vaporisé", framing: "Détail / insert", movement: "Micro-mouvement", priority: BONUS },
    ],
  ],
  [
    "Marié · Détails & accessoires",
    [
      { title: "Costume sur cintre, détail tissu", framing: "Détail / insert", movement: "Fixe", priority: IMPORTANT },
      { title: "Chaussures et montre posées", framing: "Détail / insert", movement: "Fixe", priority: BONUS },
      { title: "Boutons de manchette et alliance", framing: "Détail / insert", movement: "Fixe", priority: IMPORTANT },
    ],
  ],
  [
    "Marié · Seul",
    [
      { title: "Marié seul, regard caméra", framing: "Plan poitrine", movement: "Fixe", priority: MUST, angle: "Face" },
      { title: "Marié plein pied, prêt à partir", framing: "Plein pied", movement: "Fixe", priority: IMPORTANT },
    ],
  ],
  [
    "Marié · Avec ses proches",
    [
      { title: "Rires complices avec les garçons d’honneur", framing: "Plan taille", movement: "Épaule", priority: IMPORTANT, subject: "Marié + garçons d’honneur" },
      { title: "Son père, moment calme", framing: "Plan rapproché", movement: "Fixe", priority: MUST, subject: "Marié + père" },
    ],
  ],
  [
    "Marié · Habillage",
    [
      { title: "Chemise enfilée", framing: "Plan taille", movement: "Fixe", priority: IMPORTANT },
      { title: "Nœud papillon ajusté par un témoin ou le père", framing: "Plan rapproché", movement: "Push in", priority: MUST },
      { title: "Veste enfilée, dernier ajustement", framing: "Plan américain", movement: "Fixe", priority: IMPORTANT },
    ],
  ],
  [
    "Portraits mariée",
    [
      {
        title: "Plein pied jardin ou architecture",
        framing: "Plein pied",
        movement: "Travelling latéral",
        priority: IMPORTANT,
      },
      {
        title: "Portrait fenêtre, lumière douce",
        framing: "Plan rapproché",
        movement: "Fixe",
        priority: MUST,
        light: "Fenêtre, lumière douce",
      },
      {
        title: "Marche vers la caméra, robe en mouvement",
        framing: "Plan américain",
        movement: "Travelling",
        priority: IMPORTANT,
      },
      {
        title: "Détail robe qui tourne",
        framing: "Plan taille",
        movement: "Orbit",
        priority: BONUS,
      },
      {
        title: "Regard caméra, sourire",
        framing: "Plan rapproché",
        movement: "Push in",
        priority: IMPORTANT,
      },
      {
        title: "Profil contemplatif",
        framing: "Plan poitrine",
        movement: "Fixe",
        priority: BONUS,
        angle: "Profil",
      },
      {
        title: "Voile soulevé par le vent",
        framing: "Plan taille",
        movement: "Micro-mouvement",
        priority: BONUS,
      },
    ],
  ],
  [
    "Portraits marié",
    [
      {
        title: "Plein pied architecture",
        framing: "Plein pied",
        movement: "Travelling latéral",
        priority: IMPORTANT,
      },
      {
        title: "Portrait rapproché, regard caméra",
        framing: "Plan rapproché",
        movement: "Fixe",
        priority: MUST,
        angle: "Face",
      },
      {
        title: "Marche assurée vers la caméra",
        framing: "Plan américain",
        movement: "Travelling",
        priority: IMPORTANT,
      },
      {
        title: "Ajustement de la veste, regard confiant",
        framing: "Plan taille",
        movement: "Push in",
        priority: BONUS,
      },
    ],
  ],
  [
    "Portraits couple",
    [
      {
        title: "Front contre front, yeux fermés",
        framing: "Plan rapproché",
        movement: "Fixe",
        priority: MUST,
      },
      {
        title: "Marche main dans la main",
        framing: "Plan large",
        movement: "Travelling latéral",
        priority: IMPORTANT,
      },
      {
        title: "Rires spontanés, couple qui tourne",
        framing: "Plan taille",
        movement: "Orbit",
        priority: IMPORTANT,
      },
      {
        title: "Baiser en contre-jour",
        framing: "Plan taille",
        movement: "Fixe",
        priority: MUST,
        light: "Contre-jour, golden hour",
      },
      {
        title: "Dos à la caméra, regard vers l’horizon",
        framing: "Plan large",
        movement: "Fixe",
        priority: BONUS,
        angle: "Dos",
      },
      {
        title: "Détail mains et alliances",
        framing: "Détail / insert",
        movement: "Fixe",
        priority: MUST,
      },
      {
        title: "Danse improvisée entre eux",
        framing: "Plan taille",
        movement: "Épaule",
        priority: BONUS,
      },
    ],
  ],
  [
    "First look",
    [
      {
        title: "Marié de dos, en attente",
        framing: "Plan large",
        movement: "Fixe",
        priority: IMPORTANT,
        angle: "Dos",
      },
      {
        title: "Approche de la mariée, pas mesurés",
        framing: "Plan américain",
        movement: "Travelling",
        priority: IMPORTANT,
      },
      {
        title: "Réaction du marié à la vue de la mariée",
        framing: "Gros plan",
        movement: "Push in",
        priority: MUST,
      },
      {
        title: "Réaction de la mariée",
        framing: "Gros plan",
        movement: "Push in",
        priority: MUST,
      },
      {
        title: "Premier regard ensemble, sourires",
        framing: "Plan taille",
        movement: "Fixe",
        priority: MUST,
      },
      {
        title: "Premier câlin ou baiser",
        framing: "Plan rapproché",
        movement: "Fixe",
        priority: MUST,
      },
    ],
  ],
  [
    "Cortège",
    [
      {
        title: "Demoiselles d’honneur, groupe et rires",
        framing: "Plan large",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Garçons d’honneur, groupe et posture",
        framing: "Plan large",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Demoiselles d’honneur avec la mariée",
        framing: "Plan taille",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Garçons d’honneur avec le marié",
        framing: "Plan taille",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Cortège complet en marche",
        framing: "Plan large",
        movement: "Travelling latéral",
        priority: IMPORTANT,
      },
    ],
  ],
  [
    "Famille",
    [
      {
        title: "Mariée avec ses parents",
        framing: "Plan taille",
        movement: "Fixe",
        priority: MUST,
        subject: "Mariée + parents",
      },
      {
        title: "Marié avec ses parents",
        framing: "Plan taille",
        movement: "Fixe",
        priority: MUST,
        subject: "Marié + parents",
      },
      {
        title: "Couple avec les deux familles réunies",
        framing: "Plan large",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Grands-parents, regard tendre",
        framing: "Plan rapproché",
        movement: "Fixe",
        priority: IMPORTANT,
      },
    ],
  ],
  [
    "Cérémonie",
    [
      {
        title: "Lieu vide avant l’arrivée des invités",
        framing: "Plan d’ensemble",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Invités qui s’installent",
        framing: "Plan large",
        movement: "Pan",
        priority: BONUS,
      },
      {
        title: "Entrée du marié, mise en place",
        framing: "Plan taille",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Entrée du cortège",
        framing: "Plan large",
        movement: "Travelling latéral",
        priority: IMPORTANT,
      },
      {
        title: "Entrée de la mariée au bras de son père",
        framing: "Plan large",
        movement: "Travelling",
        priority: MUST,
      },
      {
        title: "Réaction du marié à l’entrée",
        framing: "Gros plan",
        movement: "Push in",
        priority: MUST,
      },
      {
        title: "Réaction des parents",
        framing: "Réaction",
        movement: "Fixe",
        priority: MUST,
      },
      {
        title: "Vœux échangés, mains jointes",
        framing: "Plan rapproché",
        movement: "Fixe",
        priority: MUST,
      },
      {
        title: "Lecture des textes par les témoins",
        framing: "Plan taille",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Échange des alliances, gros plan mains",
        framing: "Gros plan",
        movement: "Push in",
        priority: MUST,
      },
      {
        title: "Premier baiser",
        framing: "Plan taille",
        movement: "Fixe",
        priority: MUST,
      },
      {
        title: "Signature du registre",
        framing: "Plan rapproché",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Sortie du couple, applaudissements ou pétales",
        framing: "Plan large",
        movement: "Travelling",
        priority: MUST,
      },
      {
        title: "Réactions des invités, rires et larmes",
        framing: "Réaction",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Plan drone extérieur du lieu",
        framing: "Plan d’ensemble",
        movement: "Drone",
        priority: BONUS,
      },
    ],
  ],
  [
    "Cocktail",
    [
      {
        title: "Décor et buffet avant l’arrivée",
        framing: "Détail / insert",
        movement: "Fixe",
        priority: BONUS,
      },
      {
        title: "Invités qui arrivent et échangent",
        framing: "Plan large",
        movement: "Pan",
        priority: BONUS,
      },
      {
        title: "Toast ou jeu d’ambiance",
        framing: "Plan taille",
        movement: "Épaule",
        priority: IMPORTANT,
      },
      {
        title: "Détails boissons et mignardises",
        framing: "Détail / insert",
        movement: "Micro-mouvement",
        priority: BONUS,
      },
      {
        title: "Rires entre amis",
        framing: "Réaction",
        movement: "Fixe",
        priority: BONUS,
      },
    ],
  ],
  [
    "Interviews",
    [
      {
        title: "Mariée face caméra, question ouverte",
        framing: "Plan poitrine",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Marié face caméra, question ouverte",
        framing: "Plan poitrine",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Témoin ou parent, souhaits au couple",
        framing: "Plan poitrine",
        movement: "Fixe",
        priority: IMPORTANT,
      },
    ],
  ],
  [
    "Réception",
    [
      {
        title: "Salle vide décorée, avant l’arrivée",
        framing: "Plan d’ensemble",
        movement: "Travelling",
        priority: MUST,
      },
      {
        title: "Entrée des mariés dans la salle",
        framing: "Plan large",
        movement: "Travelling latéral",
        priority: MUST,
      },
      {
        title: "Premier repas ensemble, complicité",
        framing: "Plan rapproché",
        movement: "Fixe",
        priority: BONUS,
      },
      {
        title: "Discours — réactions du couple à l’écoute",
        framing: "Réaction",
        movement: "Fixe",
        priority: MUST,
      },
      {
        title: "Discours — l’orateur",
        framing: "Plan taille",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Découpe du gâteau",
        framing: "Plan rapproché",
        movement: "Push in",
        priority: MUST,
      },
      {
        title: "Dégustation, rires",
        framing: "Réaction",
        movement: "Fixe",
        priority: BONUS,
      },
    ],
  ],
  [
    "Ouverture de bal",
    [
      {
        title: "Master de sécurité, plan large fixe",
        framing: "Master / sécurité",
        movement: "Fixe",
        priority: MUST,
      },
      {
        title: "Suivi rapproché du couple",
        framing: "Plan taille",
        movement: "Gimbal",
        priority: MUST,
      },
      {
        title: "Détail pieds et mains",
        framing: "Détail / insert",
        movement: "Micro-mouvement",
        priority: IMPORTANT,
      },
      {
        title: "Réactions des invités",
        framing: "Réaction",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Vue en hauteur",
        framing: "Plan large",
        movement: "Plongée",
        priority: BONUS,
      },
    ],
  ],
  [
    "Transitions / B-roll",
    [
      {
        title: "Détail floral sur les tables",
        framing: "Détail / insert",
        movement: "Fixe",
        priority: BONUS,
      },
      {
        title: "Mains qui se serrent, regards complices",
        framing: "Détail / insert",
        movement: "Micro-mouvement",
        priority: BONUS,
      },
      {
        title: "Architecture ou détail du lieu",
        framing: "Plan large",
        movement: "Pan",
        priority: BONUS,
      },
      {
        title: "Ciel, golden hour",
        framing: "Plan d’ensemble",
        movement: "Fixe",
        priority: BONUS,
        light: "Golden hour",
      },
      {
        title: "Alliance posée sur un support",
        framing: "Détail / insert",
        movement: "Fixe",
        priority: IMPORTANT,
      },
      {
        title: "Bouquet posé, lumière douce",
        framing: "Détail / insert",
        movement: "Fixe",
        priority: BONUS,
      },
      {
        title: "Flamme de bougie",
        framing: "Détail / insert",
        movement: "Micro-mouvement",
        priority: BONUS,
      },
    ],
  ],
];

export const shotListCount = bySection.reduce((n, [, shots]) => n + shots.length, 0);

/**
 * Génère la shot-list complète, chapitre par chapitre dans l'ordre du film. Chaque plan est
 * pré-rempli (cadrage, mouvement, priorité, parfois angle/sujet/lumière) : rien à improviser
 * le jour J, et n'importe qui de l'équipe s'y retrouve en lisant simplement le titre.
 */
export function professionalShotList(): Item[] {
  const items: Item[] = [];
  let order = 0;
  for (const [section, shots] of bySection) {
    for (const spec of shots) {
      items.push(
        makeItem("shots", spec.title, {
          section,
          framing: spec.framing,
          movement: spec.movement,
          priority: spec.priority ?? "IMPORTANT",
          angle: spec.angle,
          subject: spec.subject,
          light: spec.light,
          order: order++,
        }),
      );
    }
  }
  return items;
}

// Anciens préparatifs (« Préparatifs mariée / marié », un seul bloc par côté) : on propose de
// ranger chaque plan dans son moment. Titre identique à la shot-list actuelle d'abord, puis mots-clés.
const momentRules: [moment: string, pattern: RegExp][] = [
  ["Habillage", /enfil|zip|n(œ|oe)ud|veste|pose des chaussures|parfum|habill|cravate/i],
  ["Maquillage & coiffure", /maquill|coiff|make-?up|cheveux|ongles/i],
  ["Avec ses proches", /m(è|e)re|p(è|e)re|parents?|t(é|e)moin|demoiselle|gar(ç|c)ons? d|proches|\bamis?\b|famille|s(œ|oe)ur|fr(è|e)re|\brit\b|rires?|complic/i],
  ["Seul", /seule?\b|miroir|peignoir|regard cam|plein pied|fenêtre/i],
  ["Détails & accessoires", /d(é|e)tail|cintre|chaussure|bouquet|alliance|bijou|montre|manchette|accessoire|invitation|flat lay/i],
];
const plain = (s: string) => s.toLocaleLowerCase("fr").replace(/[’']/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Moment proposé pour chaque plan des anciens préparatifs. Les plans non reconnus ne sont pas
 * proposés : ils restent dans leur ancien chapitre, toujours visible. Rien n'est appliqué ici.
 */
export function proposeMoments(items: Item[]): { item: Item; section: string }[] {
  const known = new Map(professionalShotList().map((s) => [plain(s.title), String(s.section)]));
  return items.flatMap((item) => {
    const legacy = sectionOf(item);
    const side = legacy === "Préparatifs mariée" ? "Mariée" : legacy === "Préparatifs marié" ? "Marié" : null;
    if (item.module !== "shots" || !side) return [];
    const exact = known.get(plain(item.title));
    if (exact?.startsWith(side + " ·")) return [{ item, section: exact }];
    const rule = momentRules.find(([, pattern]) => pattern.test(item.title));
    if (!rule) return [];
    let moment = rule[0];
    if (moment === "Seul" && side === "Mariée") moment = "Seule";
    if (moment === "Maquillage & coiffure" && side === "Marié") moment = "Habillage";
    return [{ item, section: `${side} · ${moment}` }];
  });
}
