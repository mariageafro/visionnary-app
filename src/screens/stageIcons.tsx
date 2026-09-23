import {
  Cake,
  Camera,
  Car,
  Church,
  Clock3,
  DoorOpen,
  Eye,
  HardDrive,
  Heart,
  Landmark,
  Mic,
  Music2,
  Radio,
  Shirt,
  Sparkles,
  Star,
  Users,
  UtensilsCrossed,
  Wine,
  Zap,
  Plane,
} from "lucide-react";

/** Icônes proposées à l'utilisateur pour personnaliser une étape manuellement. */
export const stageIconChoices: Record<string, typeof Clock3> = {
  auto: Camera,
  car: Car,
  shirt: Shirt,
  eye: Eye,
  landmark: Landmark,
  church: Church,
  sparkles: Sparkles,
  heart: Heart,
  wine: Wine,
  door: DoorOpen,
  meal: UtensilsCrossed,
  music: Music2,
  mic: Mic,
  cake: Cake,
  users: Users,
  live: Radio,
  zap: Zap,
  drone: Plane,
  backup: HardDrive,
  clock: Clock3,
  star: Star,
};

/** Couleurs proposées en complément des couleurs déjà déduites automatiquement du titre. */
export const stageColorChoices = [
  "#2f9e62", "#1f9aa8", "#6b6f78", "#3b6fd1", "#e59a2f", "#c0842c", "#d8456b",
  "#5aa13a", "#d44ec2", "#9a6b3c", "#7b4fd6", "#2c8fb8", "#e0708a", "#4f7a5f",
  "#d9463b", "#e6b12f", "#4d88c7", "#8a7a5c",
];

const rules: [RegExp, typeof Clock3, string][] = [
  [/arriv|install|trajet|départ/i, Car, "#2f9e62"],
  [/prépar|habill|maquill|coiff/i, Shirt, "#1f9aa8"],
  [/first look|révélation|découverte/i, Eye, "#6b6f78"],
  [/mairie|civil/i, Landmark, "#3b6fd1"],
  [/église|religieuse|cérémonie/i, Church, "#e59a2f"],
  [/tradition|dot/i, Sparkles, "#c0842c"],
  [/couple|portrait|pré-wedding/i, Heart, "#d8456b"],
  [/cocktail|vin d’honneur|vin d'honneur|apéritif/i, Wine, "#5aa13a"],
  [/entrée/i, DoorOpen, "#d44ec2"],
  [/dîner|repas|diner/i, UtensilsCrossed, "#9a6b3c"],
  [/bal|danse|flashmob|dancefloor|soirée/i, Music2, "#7b4fd6"],
  [/discours|speech|interview/i, Mic, "#2c8fb8"],
  [/gâteau|gateau|dessert/i, Cake, "#e0708a"],
  [/groupe|famille|photo/i, Users, "#4f7a5f"],
  [/live|direct/i, Radio, "#d9463b"],
  [/same-day|sde|projection/i, Zap, "#e6b12f"],
  [/drone/i, Plane, "#4d88c7"],
  [/sauvegarde|backup/i, HardDrive, "#666"],
];

/**
 * Icône + couleur d'une étape. Si l'utilisateur a choisi une icône/couleur manuellement
 * (`item.icon` / `item.color`), elle prime sur la déduction automatique par mots-clés du titre.
 */
export function stageLook(title: string, item?: Record<string, string | number | boolean | undefined>) {
  const hit = rules.find(([re]) => re.test(title));
  const auto = { Icon: hit?.[1] ?? Camera, color: hit?.[2] ?? "#8a7a5c" };
  const icon = item?.icon ? stageIconChoices[String(item.icon)] : undefined;
  return { Icon: icon ?? auto.Icon, color: (item?.color as string) || auto.color };
}
