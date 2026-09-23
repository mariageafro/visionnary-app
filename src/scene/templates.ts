// Presets de scène : des lieux déjà construits, caméras placées et mouvements prêts, entièrement
// modifiables. On repositionne ensuite selon la vraie salle.
import type { SceneElement, ScenePlan } from "./types";
import { angleTo } from "./geometry";
import { assetElement, makeLight, makePerson, newPlan, nextCameraTag, uid } from "./ops";
import { sceneLength } from "./motion";

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  build: () => ScenePlan;
}

/** Quatre murs d'une pièce de `w` × `h` mètres, coin haut-gauche en (x, y). */
function room(plan: ScenePlan, w: number, h: number, x = 0, y = 0): SceneElement[] {
  return [
    assetElement(plan, "mur", { x: x + w / 2, y }, { w, h: 0.2, name: "Mur" }),
    assetElement(plan, "mur", { x: x + w / 2, y: y + h }, { w, h: 0.2, name: "Mur" }),
    assetElement(plan, "mur", { x, y: y + h / 2 }, { w: h, h: 0.2, rotation: 90, name: "Mur" }),
    assetElement(plan, "mur", { x: x + w, y: y + h / 2 }, { w: h, h: 0.2, rotation: 90, name: "Mur" }),
  ];
}
function camera(plan: ScenePlan, at: { x: number; y: number }, extra: Partial<SceneElement>): SceneElement {
  const cam = assetElement(plan, "camera", at, extra);
  const tag = extra.tag ?? nextCameraTag(plan);
  plan.elements.push({ ...cam, tag, name: extra.name ?? tag });
  return plan.elements[plan.elements.length - 1];
}
const aim = (from: { x: number; y: number }, to: { x: number; y: number }) => Math.round(angleTo(from, to));
function finish(plan: ScenePlan): ScenePlan {
  return { ...plan, duration: sceneLength(plan.elements) };
}

export const sceneTemplates: SceneTemplate[] = [
  {
    id: "ceremonie",
    name: "Cérémonie religieuse · 4 caméras",
    description: "Église 14 × 24 m : allée, rangées, autel, couple, officiant, parents. CAM A suit la mariée, CAM B pivote, CAM C sur le marié, CAM D sur les invités.",
    build() {
      const p = newPlan("Cérémonie religieuse", { width: 16, height: 26 });
      p.elements.push(...room(p, 14, 24, 1, 1));
      p.elements.push(
        assetElement(p, "porte", { x: 8, y: 25 }, { w: 2.2, name: "Entrée" }),
        assetElement(p, "allee", { x: 8, y: 16 }, { h: 16, name: "Allée centrale" }),
        assetElement(p, "rangees", { x: 5.05, y: 16.6 }, { rows: 9, cols: 6, w: 3.3, h: 8.1, name: "Invités côté mariée" }),
        assetElement(p, "rangees", { x: 10.95, y: 16.6 }, { rows: 9, cols: 6, w: 3.3, h: 8.1, name: "Invités côté marié" }),
        assetElement(p, "autel", { x: 8, y: 3.4 }, { w: 2.6, name: "Autel" }),
        assetElement(p, "fenetre", { x: 1, y: 8 }, { rotation: 90, w: 2 }),
        assetElement(p, "fenetre", { x: 15, y: 8 }, { rotation: 90, w: 2 }),
      );
      const officiant = makePerson("pretre", { x: 8, y: 4.6 }, { rotation: 90, name: "Prêtre" });
      const groom = makePerson("marie", { x: 8.9, y: 7 }, { rotation: 90 });
      const bride = makePerson("mariee", { x: 8, y: 23.6 }, {
        rotation: -90,
        motion: { type: "walk", start: 2, duration: 20, path: [{ x: 8, y: 15 }, { x: 7.3, y: 7.2 }], easing: "linear" },
      });
      const mother = makePerson("mere", { x: 5, y: 11.8 }, { rotation: -90, name: "Mère de la mariée" });
      const father = makePerson("pere", { x: 11, y: 11.8 }, { rotation: -90, name: "Père du marié" });
      p.elements.push(officiant, groom, bride, mother, father);
      camera(p, { x: 8, y: 24.7 }, { rotation: -90, focal: 35, support: "gimbal", mission: "Suivre la mariée dans l’allée, de dos puis profil", targetId: bride.id, motion: { type: "follow", start: 2, duration: 14, targetId: bride.id } });
      const b = { x: 2.2, y: 9.5 };
      camera(p, b, { rotation: aim(b, { x: 8, y: 20 }), focal: 85, mission: "Mariée côté gauche : visage pendant l’entrée puis les vœux", targetId: bride.id, motion: { type: "pan-follow", start: 2, duration: 20, targetId: bride.id } });
      const c = { x: 13.6, y: 8.2 };
      camera(p, c, { rotation: aim(c, groom), focal: 85, mission: "Marié côté droit : réaction à l’arrivée de la mariée", targetId: groom.id });
      const d = { x: 5.2, y: 5.4 };
      camera(p, d, { rotation: aim(d, { x: 6, y: 16 }), focal: 50, mission: "Réactions des parents et des invités", motion: { type: "pan-right", start: 6, duration: 12, sweep: 25 } });
      p.cues = [
        { id: uid(), t: 2, text: "Entrée de la mariée · CAM A la suit" },
        { id: uid(), t: 10, text: "CAM B pivote avec elle, CAM D sur les invités" },
        { id: uid(), t: 20, text: "Arrivée à l’autel · réaction du marié (CAM C)" },
      ];
      return finish(p);
    },
  },
  {
    id: "mairie",
    name: "Mairie · cérémonie civile",
    description: "Salle des mariages 10 × 8 m : table de l’officiant, couple face à lui, témoins, rangées d’invités. CAM A wide tête-aux-pieds, CAM B/CAM C champ-contrechamp sur le couple pendant les vœux, CAM D sur les réactions des invités.",
    build() {
      const p = newPlan("Mairie", { width: 12, height: 10 });
      p.elements.push(...room(p, 10, 8, 1, 1));
      p.elements.push(
        assetElement(p, "porte", { x: 6, y: 9 }, { w: 2, name: "Entrée" }),
        assetElement(p, "table-rect", { x: 6, y: 2 }, { name: "Table de l’officiant" }),
        assetElement(p, "rangees", { x: 4.35, y: 6.3 }, { rows: 4, cols: 5, w: 2.75, h: 4.4, name: "Invités côté mariée" }),
        assetElement(p, "rangees", { x: 8.15, y: 6.3 }, { rows: 4, cols: 5, w: 2.75, h: 4.4, name: "Invités côté marié" }),
        assetElement(p, "fleurs", { x: 4.8, y: 2 }, {}),
        assetElement(p, "fleurs", { x: 7.2, y: 2 }, {}),
      );
      const officiant = makePerson("officiant", { x: 6, y: 1.5 }, { rotation: 90, name: "Officiant d’état civil" });
      const bride = makePerson("mariee", { x: 5.4, y: 3.6 }, { rotation: -90 });
      const groom = makePerson("marie", { x: 6.6, y: 3.6 }, { rotation: -90 });
      const witness1 = makePerson("temoin", { x: 4.3, y: 3.7 }, { rotation: -90, name: "Témoin de la mariée" });
      const witness2 = makePerson("temoin", { x: 7.7, y: 3.7 }, { rotation: -90, name: "Témoin du marié" });
      p.elements.push(officiant, bride, groom, witness1, witness2);
      camera(p, { x: 2, y: 4.5 }, { rotation: 90, focal: 24, mission: "Master wide : tête-aux-pieds du couple, l’officiant et les témoins" });
      const b = { x: 4, y: 1.6 };
      camera(p, b, { rotation: aim(b, bride), focal: 85, mission: "Champ : visage de la mariée pendant les vœux", targetId: bride.id, motion: { type: "push-in", start: 2, duration: 5, distance: 0.6 } });
      const c = { x: 8, y: 1.6 };
      camera(p, c, { rotation: aim(c, groom), focal: 85, mission: "Contrechamp : visage du marié pendant les vœux", targetId: groom.id, motion: { type: "push-in", start: 2, duration: 5, distance: 0.6 } });
      const d = { x: 6, y: 8.6 };
      camera(p, d, { rotation: -90, focal: 50, mission: "Réactions des invités et des témoins", motion: { type: "pan-left", start: 4, duration: 6, sweep: -30 } });
      p.cues = [
        { id: uid(), t: 0, text: "Lecture des articles du Code civil" },
        { id: uid(), t: 2, text: "Échange des consentements · CAM B/CAM C en champ-contrechamp" },
        { id: uid(), t: 4, text: "CAM D cherche les réactions des invités" },
      ];
      return finish(p);
    },
  },
  {
    id: "salle",
    name: "Salle de réception · 4 caméras",
    description: "Salle 20 × 14 m : tables rondes, piste, DJ, invités autour. Master, couple, réactions, gimbal en orbite pendant la première danse.",
    build() {
      const p = newPlan("Salle de réception", { width: 22, height: 16 });
      p.elements.push(...room(p, 20, 14, 1, 1));
      p.elements.push(
        assetElement(p, "porte", { x: 11, y: 15 }, { w: 2, name: "Entrée de la salle" }),
        assetElement(p, "piste", { x: 11, y: 7.5 }, { w: 6, h: 6, name: "Piste de danse" }),
        assetElement(p, "dj", { x: 11, y: 2.1 }, { name: "DJ" }),
        assetElement(p, "enceinte", { x: 8.6, y: 2.1 }),
        assetElement(p, "enceinte", { x: 13.4, y: 2.1 }),
      );
      for (const [x, y] of [
        [3.5, 3.5],
        [3.5, 7.5],
        [3.5, 11.5],
        [18.5, 3.5],
        [18.5, 7.5],
        [18.5, 11.5],
        [8, 12.8],
        [14, 12.8],
      ])
        p.elements.push(assetElement(p, "table-ronde", { x, y }, { name: "Table" }));
      p.elements.push(
        { ...assetElement(p, "invites-50", { x: 6.4, y: 7.5 }, { w: 1.6, h: 6, count: 24, name: "Invités" }) },
        { ...assetElement(p, "invites-50", { x: 15.6, y: 7.5 }, { w: 1.6, h: 6, count: 24, name: "Invités" }) },
      );
      const couple = makePerson("couple", { x: 11, y: 7.5 }, { rotation: 0, name: "Couple", motion: { type: "turn", start: 0, duration: 20, sweep: 360, easing: "linear" } });
      p.elements.push(couple);
      camera(p, { x: 11, y: 14.2 }, { rotation: -90, focal: 24, mission: "Master wide : toute la piste, plan de sécurité" });
      const b = { x: 15.2, y: 11.2 };
      camera(p, b, { rotation: aim(b, couple), focal: 85, mission: "Couple : visages et mains", targetId: couple.id });
      const c = { x: 6, y: 2.8 };
      camera(p, c, { rotation: aim(c, { x: 5, y: 9 }), focal: 50, mission: "Réactions des invités et des parents" });
      camera(p, { x: 11, y: 4.6 }, { rotation: 90, focal: 24, support: "gimbal", mission: "Gimbal : orbite lente autour du couple", targetId: couple.id, motion: { type: "orbit", start: 0, duration: 20, sweep: 180, targetId: couple.id } });
      p.elements.push(makeLight("led", { x: 7.2, y: 11 }, { rotation: aim({ x: 7.2, y: 11 }, couple), name: "LED piste gauche" }), makeLight("led", { x: 14.8, y: 4 }, { rotation: aim({ x: 14.8, y: 4 }, couple), name: "LED piste droite" }));
      p.cues = [
        { id: uid(), t: 0, text: "Première danse · CAM D commence son orbite" },
        { id: uid(), t: 10, text: "CAM C cherche les parents" },
      ];
      return finish(p);
    },
  },
  {
    id: "flashmob",
    name: "Flashmob · 4 caméras",
    description: "Piste 8 × 8 m, danseurs qui entrent en formation, public autour. Master, medium, réactions, gimbal en mouvement.",
    build() {
      const p = newPlan("Flashmob", { width: 22, height: 18 });
      p.elements.push(assetElement(p, "piste", { x: 11, y: 8 }, { w: 8, h: 8, name: "Piste" }));
      p.elements.push(
        { ...assetElement(p, "invites-50", { x: 11, y: 14.6 }, { w: 10, h: 2.2, count: 40, name: "Public" }) },
        { ...assetElement(p, "invites-50", { x: 4.8, y: 8 }, { w: 2.2, h: 8, count: 30, name: "Public" }) },
        { ...assetElement(p, "invites-50", { x: 17.2, y: 8 }, { w: 2.2, h: 8, count: 30, name: "Public" }) },
      );
      const couple = makePerson("couple", { x: 11, y: 6.5 }, { rotation: 90, name: "Couple" });
      p.elements.push(couple);
      for (let n = 0; n < 8; n++) {
        const row = Math.floor(n / 4);
        const col = n % 4;
        const end = { x: 8.6 + col * 1.6, y: 9 + row * 1.5 };
        const startX = col < 2 ? 3.2 : 18.8;
        p.elements.push(makePerson("danseur", { x: startX, y: end.y }, { name: `Danseur ${n + 1}`, rotation: col < 2 ? 0 : 180, motion: { type: "walk", start: n * 0.4, duration: 4, path: [end] } }));
      }
      camera(p, { x: 11, y: 17 }, { rotation: -90, focal: 24, mission: "Master wide : toute la chorégraphie" });
      const b = { x: 18.5, y: 3 };
      camera(p, b, { rotation: aim(b, { x: 11, y: 9 }), focal: 50, mission: "Medium : danseurs et couple" });
      const c = { x: 11, y: 2.2 };
      camera(p, c, { rotation: 90, focal: 85, mission: "Réactions du public et du couple", targetId: couple.id });
      camera(p, { x: 6.2, y: 3.4 }, {
        rotation: 45,
        focal: 20,
        support: "gimbal",
        mission: "Gimbal : traverse la chorégraphie",
        motion: { type: "custom", start: 4, duration: 12, path: [{ x: 7.4, y: 11.8 }, { x: 14.6, y: 11.8 }, { x: 15.8, y: 3.6 }] },
      });
      p.cues = [
        { id: uid(), t: 0, text: "Les danseurs entrent en formation" },
        { id: uid(), t: 4, text: "CAM D traverse la chorégraphie" },
      ];
      return finish(p);
    },
  },
  {
    id: "chambre",
    name: "Chambre · préparatifs mariée",
    description: "Chambre 5,5 × 4,5 m : fenêtre, coiffeuse, lit, mariée, maquilleuse, mère. Lumière fenêtre + softbox, CAM A en push-in.",
    build() {
      const p = newPlan("Préparatifs mariée · chambre", { width: 7.5, height: 6.5 });
      p.elements.push(...room(p, 5.5, 4.5, 1, 1));
      p.elements.push(
        assetElement(p, "fenetre", { x: 1, y: 3.2 }, { rotation: 90, w: 1.6, name: "Grande fenêtre" }),
        assetElement(p, "porte", { x: 5.4, y: 5.5 }, { name: "Porte" }),
        assetElement(p, "lit", { x: 4.9, y: 2.3 }, { rotation: 90, name: "Lit" }),
        assetElement(p, "bureau", { x: 2.6, y: 1.45 }, { name: "Coiffeuse" }),
        assetElement(p, "miroir", { x: 2.6, y: 1.16 }, { w: 0.9, name: "Miroir" }),
      );
      const bride = makePerson("mariee", { x: 2.6, y: 2.05 }, { rotation: -90 });
      p.elements.push(
        bride,
        makePerson("maquilleuse", { x: 3.35, y: 2.2 }, { rotation: 180 }),
        makePerson("mere", { x: 4.2, y: 4.2 }, { rotation: aim({ x: 4.2, y: 4.2 }, bride), name: "Mère" }),
        makePerson("photographe", { x: 1.7, y: 4.6 }, { rotation: aim({ x: 1.7, y: 4.6 }, bride) }),
        makeLight("fenetre", { x: 1.15, y: 3.2 }, { rotation: 0, name: "Lumière fenêtre", temperature: 5600 }),
        makeLight("softbox", { x: 4.4, y: 1.7 }, { rotation: aim({ x: 4.4, y: 1.7 }, bride), name: "Softbox d’appoint", power: 40, temperature: 5600 }),
      );
      const a = { x: 2.9, y: 4.7 };
      camera(p, a, { rotation: aim(a, bride), focal: 35, support: "gimbal", mission: "Push-in lent vers le reflet dans le miroir", targetId: bride.id, motion: { type: "push-in", start: 0, duration: 6, distance: 1.2 } });
      p.cues = [{ id: uid(), t: 0, text: "Dernier regard dans le miroir · CAM A avance" }];
      return finish(p);
    },
  },
  {
    id: "firstlook",
    name: "First look",
    description: "Jardin : le marié de dos, la mariée s’approche, il se retourne. CAM A suit la mariée, CAM B sur le marié, CAM C sur la mariée.",
    build() {
      const p = newPlan("First look", { width: 18, height: 14 });
      p.elements.push(assetElement(p, "jardin", { x: 9, y: 7 }, { w: 16, h: 12, name: "Jardin" }), assetElement(p, "arche-florale", { x: 9, y: 2.6 }, {}));
      const groom = makePerson("marie", { x: 9, y: 4.2 }, { rotation: -90, motion: { type: "turn", start: 7, duration: 1.5, sweep: 180 } });
      const bride = makePerson("mariee", { x: 9, y: 12 }, { rotation: -90, motion: { type: "walk", start: 0, duration: 7, path: [{ x: 9, y: 5.2 }], easing: "linear" } });
      p.elements.push(groom, bride, makeLight("naturelle", { x: 2, y: 2 }, { rotation: 35, name: "Soleil de fin de journée", temperature: 4200 }));
      camera(p, { x: 7.2, y: 12.4 }, { rotation: -90, focal: 35, support: "gimbal", mission: "Suit la mariée de dos jusqu’au marié", targetId: bride.id, motion: { type: "follow", start: 0, duration: 7, targetId: bride.id } });
      const b = { x: 11.2, y: 2.4 };
      camera(p, b, { rotation: aim(b, groom), focal: 85, mission: "Gros plan du marié qui se retourne", targetId: groom.id });
      const c = { x: 6.6, y: 3.2 };
      camera(p, c, { rotation: aim(c, { x: 9, y: 6 }), focal: 85, mission: "Réaction de la mariée", targetId: bride.id, motion: { type: "pan-follow", start: 0, duration: 8, targetId: bride.id } });
      p.cues = [
        { id: uid(), t: 0, text: "La mariée s’approche" },
        { id: uid(), t: 7, text: "Le marié se retourne" },
        { id: uid(), t: 8.5, text: "Réactions" },
      ];
      return finish(p);
    },
  },
];

export const templateById = (id: string) => sceneTemplates.find((t) => t.id === id);
