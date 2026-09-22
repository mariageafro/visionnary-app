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
  Users,
  UtensilsCrossed,
  Wine,
  Zap,
  Plane,
} from "lucide-react";

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

export function stageLook(title: string) {
  const hit = rules.find(([re]) => re.test(title));
  return { Icon: hit?.[1] ?? Camera, color: hit?.[2] ?? "#8a7a5c" };
}
