import type { Item } from "./types";

export const operatorGuides: Record<string, { title: string; tips: string[] }> = {
  camera: { title: "Caméra à la main", tips: ["Stabilisez votre posture et gardez une respiration régulière.", "Tenez chaque plan quelques secondes avant et après l’action.", "Surveillez les bords du cadre et les sources de lumière."] },
  gimbal: { title: "Gimbal", tips: ["Vérifiez l’horizon et l’équilibrage avant chaque séquence.", "Marchez souplement, genoux légèrement fléchis ; commencez et terminez sans à-coup.", "Gardez un chemin dégagé et une sortie de plan prévue."] },
  tripod: { title: "Trépied", tips: ["Vérifiez le niveau, le verrouillage des pieds et le cadre.", "Pendant les moments uniques, gardez une caméra large de sécurité en continu.", "Ne coupez pas avant la fin de l’action et quelques secondes de marge."] },
  interview: { title: "Interview", tips: ["Faites un test casque et niveau, puis enregistrez quelques secondes d’ambiance.", "Placez le micro à distance constante et demandez des réponses en phrases complètes.", "Laissez un silence après chaque réponse et évitez les relances qui se chevauchent."] },
  multicam: { title: "Multicam", tips: ["Variez les valeurs de plan et gardez une caméra large de sécurité.", "Anticipez les réactions et ne vous placez pas dans l’axe des autres cadreurs.", "Tournez les moments uniques en continu, sans arrêter trop tôt.", "Communiquez hors axe des micros quand nécessaire."] },
  broll: { title: "B-roll", tips: ["Filmez des plans d’établissement, détails, gestes et réactions.", "Tenez chaque plan stable assez longtemps pour le montage.", "Vérifiez les raccords de mouvement, de lumière et de direction."] },
  cocktail: { title: "Cocktail", tips: ["Alternez ambiance large, échanges, détails de décoration et réactions.", "Demandez l’accord avant les portraits rapprochés et restez discret.", "Enregistrez quelques sons d’ambiance propres."] },
  ceremony: { title: "Cérémonie", tips: ["Repérez les axes et évitez de traverser le champ des invités.", "Assurez une couverture large pendant les vœux, alliances et sortie.", "Anticipez les réactions des proches et laissez tourner la sécurité."] },
  dancefloor: { title: "Dancefloor", tips: ["Protégez les hautes lumières et vérifiez la mise au point en faible lumière.", "Alternez plans larges, mouvements et réactions sans gêner les invités.", "Capturez l’entrée et les moments clés depuis plusieurs axes."] },
  drone: { title: "Drone", tips: ["Vérifiez autorisations, météo, batterie et zone de sécurité avant le vol.", "Gardez une personne en surveillance visuelle et respectez les restrictions du lieu.", "Prévoyez un plan au sol si le vol devient impossible."] },
  live: { title: "Live", tips: ["Vérifiez alimentation, réseau, audio et cadrage avant le direct.", "Contrôlez le retour image/son et gardez une solution de secours.", "Évitez toute modification de câblage pendant la diffusion."] },
  general: { title: "Prise de vue", tips: ["Confirmez le sujet, l’action et la priorité avant de tourner.", "Vérifiez exposition, mise au point, batterie et espace carte.", "Tenez le plan quelques secondes avant et après l’action."] },
  photo: { title: "Photographe", tips: ["Vérifiez les portraits des mariés, des témoins et du cortège, puis les familles et groupes prévus.", "Contrôlez les yeux, les mains, l’arrière-plan et les personnes coupées avant de changer de pose.", "Faites une vue de sécurité puis une variante plus serrée ; marquez les références essentielles au fur et à mesure.", "Gardez du temps pour la salle vide, les détails et les invités sans gêner les moments uniques."] },
};

export function guideContext(item: Item): string {
  if (item.module === "poses") return "photo";
  const text = [item.title, item.category, item.scene, item.section, item.camera, item.support, item.movement, item.media].map((value) => String(value ?? "")).join(" ").toLocaleLowerCase("fr");
  if (item.module === "interviews" || item.category === "Interview" || item.category === "Vœux audio") return "interview";
  if (/drone/.test(text) || item.module === "drone") return "drone";
  if (/live|régie|diffusion/.test(text)) return "live";
  if (/multicam|champ.contrechamp/.test(text)) return "multicam";
  if (/dancefloor|piste de danse|ouverture de bal/.test(text)) return "dancefloor";
  if (/cocktail/.test(text)) return "cocktail";
  if (/cérémonie|vœux|alliances/.test(text)) return "ceremony";
  if (/b.roll/.test(text)) return "broll";
  if (/gimbal|stabilisateur/.test(text)) return "gimbal";
  if (/trépied|trepied|fixe/.test(text)) return "tripod";
  if (item.module === "shots" || /caméra|camera|main levée/.test(text)) return "camera";
  return "general";
}
