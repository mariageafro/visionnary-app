// Plan de scène (Scene Designer) : un lieu vu du dessus, en mètres réels, avec son décor, ses
// personnes, ses caméras, ses lumières et leurs mouvements animés sur une même horloge.
//
// Conventions : x vers la droite, y vers le bas (comme l'écran) ; rotation en degrés, 0 = regard
// vers la droite, sens horaire positif. Les tailles (w, h) sont en mètres.

export type LayerId = "architecture" | "decor" | "people" | "cameras" | "lights" | "audio" | "annotations";

export type ElementKind =
  | "wall" // mur, porte, fenêtre, escalier, colonne, arche… (objet d'architecture)
  | "zone" // surface : allée, piste de danse, jardin, estrade, tapis…
  | "object" // mobilier et décor : chaise, table, DJ, voiture, fleurs…
  | "rows" // bloc de rangées de chaises (une rangée de cérémonie en un élément)
  | "person" // une personne (mariée, officiant, cadreur…)
  | "crowd" // un groupe de N personnes dessiné en une fois (10, 50, 200 invités)
  | "camera"
  | "light"
  | "drone"
  | "audio"
  | "note"; // annotation texte

export interface Point {
  x: number;
  y: number;
}

/** Mouvement animé d'un élément, placé sur la timeline de la scène. */
export interface Motion {
  /** Identifiant du mouvement dans la bibliothèque (push-in, orbit, arc180, walk…). */
  type: string;
  /** Début et durée, en secondes. */
  start: number;
  duration: number;
  /** Points de passage (trajectoire dessinée), en mètres ; l'élément part de sa position. */
  path?: Point[];
  /** Sujet suivi ou centre d'une orbite. */
  targetId?: string;
  /** Distance parcourue (push, pull, travelling, grue), en mètres. */
  distance?: number;
  /** Amplitude d'un pan, d'un arc ou d'une orbite, en degrés (signe = sens). */
  sweep?: number;
  /** Variation d'altitude (grue, drone), en mètres. */
  rise?: number;
  easing?: "linear" | "smooth";
}

export interface SceneElement {
  id: string;
  kind: ElementKind;
  name: string;
  /** Centre de l'élément, en mètres. */
  x: number;
  y: number;
  rotation: number;
  layer: LayerId;
  /** Type dans la bibliothèque : « chaise », « table-ronde », « mariee », « softbox »… */
  asset?: string;
  w?: number;
  h?: number;
  shape?: "rect" | "ellipse";
  color?: string;
  /** Teint de la personne ; la couleur principale représente ses vêtements. */
  skinColor?: string;
  outfit?: "robe" | "costume" | "tenue";
  locked?: boolean;
  hidden?: boolean;
  groupId?: string;
  notes?: string;
  motion?: Motion;

  // Rangées de chaises
  rows?: number;
  cols?: number;
  // Foule
  count?: number;
  // Personne
  role?: string;
  /** Membre de l'équipe représenté (photographe, vidéaste). */
  memberId?: string;

  // Caméra
  /** Nom court affiché sur le plan : « CAM A ». */
  tag?: string;
  model?: string;
  sensor?: string;
  focal?: number;
  /** Hauteur de l'objectif, en mètres. */
  height?: number;
  operatorId?: string;
  /** Un cadreur est dessiné à côté de la caméra, même avant son affectation nominative. */
  operatorPresent?: boolean;
  support?: string;
  mission?: string;
  framing?: string;
  /** Sujet visé : sert à la longueur du cône et à l'estimation de la valeur de plan. */
  targetId?: string;
  /** Référence épinglée (photo, frame, vidéo) : identifiant d'un média du tournage. */
  referenceId?: string;
  /** Décalage de la vignette de référence sur la toile, en mètres (0,0 = juste au-dessus de la caméra). */
  refOffset?: Point;
  /** Taille de la vignette de référence : 1 = normale, plus grand = agrandie (bascule en un clic). */
  refScale?: number;
  /** Plans de la shot list liés à cette caméra. */
  shotIds?: string[];

  // Lumière
  power?: number;
  temperature?: number;
  /** Ouverture du faisceau, en degrés. */
  beam?: number;
  /** Portée utile, en mètres. */
  reach?: number;
  /** État prévu de la source lumineuse (la lumière reste visible sur le plan lorsqu'elle est éteinte). */
  lightOn?: boolean;

  // Drone
  altitude?: number;

  // Note
  text?: string;
}

export interface TimelineCue {
  id: string;
  /** Instant, en secondes. */
  t: number;
  text: string;
}

export interface SceneBackground {
  /** Média du tournage (photo du lieu, plan, capture satellite, croquis). */
  mediaId: string;
  /** Coin haut-gauche et largeur, en mètres ; la hauteur suit le format de l'image. */
  x: number;
  y: number;
  w: number;
  /** « contain » (défaut) montre la photo entière ; « cover » remplit le plan. */
  fit?: "cover" | "contain";
  opacity: number;
  locked?: boolean;
}

export interface ScenePlan {
  id: string;
  name: string;
  stageId?: string;
  venueId?: string;
  /** Zone de travail, en mètres. */
  width: number;
  height: number;
  background?: SceneBackground;
  /** Modèle du lieu en GLB ou OBJ, conservé dans les médias locaux du tournage. */
  model3dId?: string;
  /** Direction du nord sur le plan (0 = haut), pour placer le soleil. */
  north?: number;
  /** Heure simulée pour le soleil (« HH:MM »). */
  sunTime?: string;
  elements: SceneElement[];
  cues: TimelineCue[];
  /** Durée de l'animation, en secondes. */
  duration: number;
  layers?: Partial<Record<LayerId, { hidden?: boolean; locked?: boolean }>>;
  createdAt: string;
  updatedAt: string;
}
