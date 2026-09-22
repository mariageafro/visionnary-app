// Assistant de création : chaque option cochée ajoute seulement ce qui sert à CE mariage.
import type { Item, Project, Workspace } from "./types";
import { makeItem, newProject, presetLibrary, standardChecklists } from "./model";
import { makeChain } from "./reminders";

type Stage = [title: string, time: string, minutes: number];
export interface Feature {
  id: string;
  label: string;
  group: "Cérémonies" | "Moments" | "Prestations";
  stages?: Stage[];
  shots?: [title: string, framing: string, priority?: string][];
  checklist?: [phase: string, category: string, titles: string[]];
  /** Chaînes de rappels : [sujet, modèle, index de l'étape de la feature]. */
  chains?: [subject: string, template: "full" | "pair" | "record" | "backup"][];
  extra?: (stageIds: string[]) => Item[];
}

export const features: Feature[] = [
  {
    id: "civil",
    label: "Cérémonie civile (mairie)",
    group: "Cérémonies",
    stages: [["Mairie", "11:00", 45]],
    shots: [
      ["Arrivée à la mairie", "Plan d’ensemble"],
      ["Signature du registre", "Gros plan", "MUST HAVE"],
      ["Sortie sous les pétales", "Plan large", "MUST HAVE"],
    ],
  },
  {
    id: "religious",
    label: "Cérémonie religieuse",
    group: "Cérémonies",
    stages: [["Cérémonie religieuse", "14:00", 75]],
    shots: [
      ["Entrée de la mariée", "Plan large", "MUST HAVE"],
      ["Réaction du marié", "Gros plan", "MUST HAVE"],
      ["Échange des alliances", "Gros plan", "MUST HAVE"],
      ["Premier baiser", "Plan taille", "MUST HAVE"],
      ["Sortie des mariés", "Plan large"],
    ],
    chains: [["micro officiant", "pair"]],
  },
  {
    id: "traditional",
    label: "Cérémonie traditionnelle / dot",
    group: "Cérémonies",
    stages: [["Cérémonie traditionnelle", "12:00", 120]],
    shots: [
      ["Arrivée des familles", "Plan d’ensemble"],
      ["Tenues et parures", "Détail / insert"],
      ["Remise de la dot", "Plan taille", "MUST HAVE"],
      ["Bénédiction des aînés", "Gros plan", "MUST HAVE"],
      ["Danse des familles", "Plan large"],
    ],
  },
  {
    id: "secular",
    label: "Cérémonie laïque",
    group: "Cérémonies",
    stages: [["Cérémonie laïque", "15:30", 60]],
    shots: [
      ["Entrée des mariés", "Plan large", "MUST HAVE"],
      ["Discours de l’officiant", "Plan taille"],
      ["Échange des vœux", "Gros plan", "MUST HAVE"],
    ],
    chains: [["micro officiant", "record"]],
  },
  {
    id: "firstlook",
    label: "First look",
    group: "Moments",
    stages: [["First look", "12:00", 30]],
    shots: [
      ["Attente du marié de dos", "Plan large"],
      ["Réaction du marié", "Gros plan", "MUST HAVE"],
    ],
  },
  {
    id: "bridal",
    label: "Filles / garçons d’honneur",
    group: "Moments",
    shots: [
      ["Filles d’honneur ensemble", "Plan large"],
      ["Garçons d’honneur ensemble", "Plan large"],
      ["Groupe complet", "Plan d’ensemble", "MUST HAVE"],
    ],
  },
  {
    id: "reception",
    label: "Réception / soirée",
    group: "Moments",
    stages: [
      ["Cocktail / vin d’honneur", "17:30", 90],
      ["Entrée des mariés", "20:00", 20],
      ["Dîner", "20:30", 120],
    ],
    shots: [
      ["Salle vide et décor", "Plan d’ensemble", "MUST HAVE"],
      ["Entrée des mariés", "Plan large", "MUST HAVE"],
    ],
    chains: [["enregistreur DJ", "record"]],
  },
  {
    id: "speeches",
    label: "Discours",
    group: "Moments",
    shots: [
      ["Discours des témoins", "Plan taille"],
      ["Réactions du couple aux discours", "Gros plan"],
    ],
    chains: [["micro discours", "pair"]],
  },
  {
    id: "dance",
    label: "Ouverture de bal / flashmob",
    group: "Moments",
    stages: [["Ouverture de bal", "22:30", 20]],
    shots: [
      ["Master de sécurité", "Plan large", "MUST HAVE"],
      ["Suivi du couple (gimbal)", "Plan taille", "MUST HAVE"],
      ["Réactions invités", "Réaction"],
      ["Pieds et mains", "Détail / insert"],
    ],
    extra: () => [makeItem("dance", "Ouverture de bal", { duration: 180, camera: "Cam A master · Cam B suivi · Cam C réactions · Cam D détails" })],
  },
  {
    id: "interviews",
    label: "Interviews / témoignages",
    group: "Moments",
    extra: () =>
      ["Mariée", "Marié", "Parents", "Témoins"].map((person, n) =>
        makeItem("interviews", "Interview " + person.toLowerCase(), {
          person,
          order: n,
          duration: 10,
          questions:
            person === "Mariée" || person === "Marié"
              ? "Comment vous êtes-vous rencontrés ? Qu’est-ce qui vous a fait dire oui ? Un mot pour l’autre aujourd’hui ?"
              : "Un souvenir avec les mariés ? Ce que vous leur souhaitez ?",
        }),
      ),
  },
  {
    id: "drone",
    label: "Drone",
    group: "Prestations",
    checklist: ["avant", "Drone", ["Batteries drone chargées", "Vérifier la zone et l’autorisation", "Hélices et carte SD"]],
    extra: () => [
      makeItem("drone", "Establishing du lieu", { move: "Establishing", wind: 30, groundPlan: "Plan large depuis un point haut (escalier, balcon)" }),
      makeItem("drone", "Sortie des mariés vue du ciel", { move: "Top down", wind: 30, groundPlan: "Caméra en hauteur sur perche ou balcon" }),
    ],
  },
  {
    id: "prewedding",
    label: "Pré-wedding",
    group: "Prestations",
    extra: () => [makeItem("prewedding", "Séance pré-wedding", { outfit: "Tenue 1 · Tenue 2", scenario: "Balade, rires, golden hour" })],
  },
  {
    id: "sde",
    label: "Same-Day Edit",
    group: "Prestations",
    stages: [["Projection Same-Day Edit", "23:00", 10]],
    checklist: ["jourj", "Same-Day Edit", ["Poste de montage installé", "Transfert des cartes prioritaires", "Test projection image et son"]],
    extra: () => [makeItem("sde", "Same-Day Edit", { duration: 180 })],
  },
  {
    id: "live",
    label: "Live / transmission",
    group: "Prestations",
    checklist: ["jourj", "Live", ["Connexion testée", "Batterie de secours", "Audio du live", "Enregistrement local en parallèle", "Réseau de secours"]],
    extra: () => [makeItem("live", "Direct de la cérémonie", { platform: "YouTube (non répertorié)" })],
  },
  {
    id: "photo",
    label: "Photo",
    group: "Prestations",
    extra: () =>
      [
        ["Portrait mariée fenêtre", "Mariée seule", "Épaules vers la fenêtre, menton légèrement baissé, regard vers la lumière."],
        ["Marche du couple", "Couple", "Marchez lentement l’un vers l’autre, parlez-vous, ne regardez pas l’objectif."],
        ["Front contre front", "Couple", "Fermez les yeux, respirez ensemble."],
        ["Famille proche", "Famille", "Du plus grand au plus petit, épaules tournées vers le centre."],
      ].map(([title, category, instruction], n) => makeItem("poses", title, { category, instruction, order: n })),
  },
];

/** Éléments propres aux options choisies (étapes, plans, checklists, chaînes de rappels). */
export function featureItems(selected: string[]): Item[] {
  const stages: Item[] = [];
  const items: Item[] = [];
  for (const feature of features.filter((x) => selected.includes(x.id))) {
    const own = (feature.stages ?? []).map(([title, time, duration]) => makeItem("stages", title, { time, duration }));
    stages.push(...own);
    feature.shots?.forEach(([title, framing, priority]) =>
      items.push(makeItem("shots", title, { framing, priority: priority ?? "IMPORTANT", stageId: own[0]?.id })),
    );
    if (feature.checklist) {
      const [phase, category, titles] = feature.checklist;
      titles.forEach((title) => items.push(makeItem("checklists", title, { phase, category })));
    }
    feature.chains?.forEach(([subject, template]) => {
      if (own[0]) items.push(...makeChain(subject, own[0].id, template, 0));
    });
    items.push(...(feature.extra?.(own.map((s) => s.id)) ?? []));
  }
  return [...stages, ...items];
}

/** Numérote chaque module à la suite de l'existant ; les étapes sont rangées par heure. */
export function withOrder(items: Item[], existing: Item[] = []): Item[] {
  const counters = new Map<string, number>();
  for (const i of existing) counters.set(i.module, Math.max(counters.get(i.module) ?? 0, i.order + 1));
  const stages = items.filter((i) => i.module === "stages").sort((a, b) => String(a.time).localeCompare(String(b.time)));
  for (const item of [...stages, ...items.filter((i) => i.module !== "stages")]) {
    const n = counters.get(item.module) ?? 0;
    item.order = n;
    counters.set(item.module, n + 1);
  }
  return items;
}

/** Les étapes de base existent toujours ; les options ajoutent le reste. */
export function buildSkeleton(selected: string[]): Item[] {
  const base = [
    makeItem("stages", "Arrivée équipe · installation", { time: "08:00", duration: 45 }),
    makeItem("stages", "Préparatifs", { time: "09:00", duration: 120 }),
    makeItem("stages", "Couple shoot", { time: "16:30", duration: 45 }),
  ];
  const extra = featureItems(selected);
  const stages = [...base, ...extra.filter((i) => i.module === "stages")].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  // Micros posés aux préparatifs puis retirés ; rushs sauvegardés après la dernière étape.
  const chains = [...makeChain("micro marié", base[1].id, "pair", 0), ...makeChain("rushs", stages.at(-1)!.id, "backup", 0)];
  return withOrder([...base, ...extra, ...chains, ...standardChecklists()]);
}

export function demoWorkspace(): Workspace {
  const p: Project = newProject("Sabrina & Daniel");
  Object.assign(p, {
    date: "2027-03-27",
    venue: "La Verrière (91)",
    couple: "Sabrina & Daniel",
    style: "Éditorial · Cinématique",
    guests: 150,
    ceremony: "14h00 · église Saint-Martin",
    reception: "La Verrière (91)",
    planner: "À renseigner",
    services: "Vidéo + Photo + Pré-wedding",
    mustHave: "Le premier regard, les alliances et les réactions des parents.",
    avoid: "Les plans de la mariée de dos pendant la cérémonie.",
    priorities: "Grand-mère de Sabrina · témoin de Daniel",
    features: ["démo", "religious", "firstlook", "reception", "speeches", "dance", "drone", "photo", "prewedding"],
    filmMinutes: 8,
    teaserSeconds: 60,
  });
  const items = buildSkeleton(p.features!);
  const director = makeItem("team", "Maurice", { role: "Réalisation / direction", order: 0 });
  const camA = makeItem("team", "Christopher", { role: "Cadreur", camera: "Cam A", order: 1 });
  const photo = makeItem("team", "Yves", { role: "Photographe", order: 2 });
  const venue = makeItem("venues", "La Verrière", {
    address: "Données de démonstration",
    gps: "48.6315, 2.3490",
    zones: "Jardin, allée, salle de réception, escalier",
  });
  const cams = [
    ["Sony A7 IV", "Cam A"],
    ["Sony FX6", "Cam B"],
  ].map(([model, title], n) =>
    makeItem("equipment", title, {
      category: "Caméra",
      model,
      order: n,
      format: "4K (UHD)",
      fps: "25 fps",
      profile: n ? "S-Cinetone" : "S-Log3",
      wb: "5600K",
      aperture: "f/2.8",
      iso: "Auto (100-3200)",
      shutter: "1/50",
      nd: "Selon lumière",
    }),
  );
  for (const stage of items.filter((i) => i.module === "stages")) {
    stage.venueId = venue.id;
    stage.operatorId = director.id;
  }
  items.filter((i) => i.module === "shots").forEach((s, n) => (s.operatorId = n % 2 ? camA.id : director.id));
  p.items = [...items, director, camA, photo, venue, ...cams];
  return {
    schemaVersion: 1,
    projects: [p],
    presets: presetLibrary(),
    activeProjectId: p.id,
    revision: 0,
    updatedAt: new Date().toISOString(),
  };
}
