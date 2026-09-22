import { describe, it, expect } from "vitest";
import { duplicateProject, makeItem, momentLabel, newProject, orderSections, otherSection, sectionOf, sideOf } from "../src/model";
import { dayOrder, isMomentNow, momentKey, momentState, operatorDayOrder, stageFrise, toClock } from "../src/moments";
import { proposeMoments } from "../src/shotlist";
import { validateWorkspace } from "../src/exports";
import type { Item } from "../src/types";

const shot = (section: string | undefined, extra: Partial<Item> = {}) => makeItem("shots", "Plan", { section, ...extra });

describe("chapitres des plans", () => {
  it("reconnaît les chapitres connus, garde les anciens et les personnalisés", () => {
    expect(sectionOf(shot("Mariée · Seule"))).toBe("Mariée · Seule");
    expect(sectionOf(shot("  mariée ·  seule "))).toBe("Mariée · Seule");
    expect(sectionOf(shot("Préparatifs mariée"))).toBe("Préparatifs mariée");
    expect(sectionOf(shot("Henné"))).toBe("Henné");
    expect(sectionOf(shot(undefined))).toBe(otherSection);
    expect(sectionOf(shot("   "))).toBe(otherSection);
  });
  it("range les chapitres dans l’ordre du film, anciens préparatifs à leur place", () => {
    expect(
      orderSections([otherSection, "Henné", "Cérémonie", "Marié · Seul", "Préparatifs marié", "Mariée · Seule", "Préparatifs mariée", "Danse des familles"]),
    ).toEqual(["Préparatifs mariée", "Mariée · Seule", "Préparatifs marié", "Marié · Seul", "Cérémonie", "Henné", "Danse des familles", otherSection]);
  });
  it("attribue les moments à leur côté et raccourcit leur nom", () => {
    expect(sideOf("Mariée · Habillage")).toBe("mariée");
    expect(sideOf("Marié · Habillage")).toBe("marié");
    expect(sideOf("Préparatifs marié")).toBe("marié");
    expect(sideOf("Mariée · Robe de soirée")).toBe("mariée");
    expect(sideOf("Portraits mariée")).toBeUndefined();
    expect(sideOf("Entrée des mariés")).toBeUndefined();
    expect(momentLabel("Mariée · Détails & accessoires")).toBe("Détails & accessoires");
    expect(momentLabel("Préparatifs mariée")).toBe("Préparatifs mariée");
    expect(momentLabel("Cérémonie")).toBe("Cérémonie");
  });
});

describe("frise d’une étape", () => {
  const setup = () => {
    const p = newProject("Test");
    const stage = makeItem("stages", "Préparatifs", { time: "09:00", duration: 60 });
    const shots = [
      shot("Mariée · Détails & accessoires"),
      shot("Mariée · Détails & accessoires", { shootMinutes: 5 }),
      shot("Mariée · Maquillage & coiffure"),
      shot("Mariée · Habillage", { shootMinutes: 50 }),
      shot("Marié · Seul"),
      shot("Marié · Habillage", { shootMinutes: 10 }),
    ].map((s) => ({ ...s, stageId: stage.id }));
    p.items = [stage, ...shots];
    return { p, stage, shots };
  };
  const times = (t: { moments: { start: number | null }[] } | undefined) => t?.moments.map((m) => (m.start === null ? null : toClock(m.start)));

  it("enchaîne les moments de chaque côté en parallèle, 3 min par plan par défaut", () => {
    const { p, stage, shots } = setup();
    const frise = stageFrise(p, stage, shots);
    expect(frise.before).toBeUndefined();
    expect(frise.sides.map((t) => t.side)).toEqual(["mariée", "marié"]);
    const [bride, groom] = frise.sides;
    expect(bride.moments.map((m) => m.label)).toEqual(["Détails & accessoires", "Maquillage & coiffure", "Habillage"]);
    expect(times(bride)).toEqual(["09:00", "09:08", "09:11"]);
    expect(times(groom)).toEqual(["09:00", "09:03"]);
    expect(bride.minutes).toBe(61);
    // Étape de 60 min : la piste mariée finit à 10:01, une minute trop tard ; le marié tient.
    expect(bride.overflow).toBe(1);
    expect(groom.overflow).toBe(0);
  });
  it("respecte un horaire saisi à la main et fait suivre les moments suivants", () => {
    const { p, stage, shots } = setup();
    p.moments = { [momentKey(stage.id, "Mariée · Maquillage & coiffure")]: "08:30" };
    const [bride] = stageFrise(p, stage, shots).sides;
    expect(times(bride)).toEqual(["09:00", "08:30", "08:33"]);
    expect(bride.moments[1].manual).toBe(true);
    expect(toClock(bride.moments[1].estimated!)).toBe("09:08");
    expect(bride.overflow).toBe(0);
  });
  it("place les moments communs avant et après les deux côtés", () => {
    const { p, stage, shots } = setup();
    const decor = { ...shot("Lieu & décor", { shootMinutes: 10 }), stageId: stage.id };
    const extra = { ...shot(undefined), stageId: stage.id };
    const frise = stageFrise(p, stage, [decor, ...shots, extra]);
    expect(times(frise.before)).toEqual(["09:00"]);
    expect(times(frise.sides[0])).toEqual(["09:10", "09:18", "09:21"]);
    expect(times(frise.sides[1])).toEqual(["09:10", "09:13"]);
    // Les moments communs d'après attendent la fin de la piste la plus longue.
    expect(times(frise.after)).toEqual(["10:11"]);
    expect(frise.after!.moments[0].section).toBe(otherSection);
  });
  it("sans horaire d’étape, donne les durées et démarre à la première heure saisie", () => {
    const { p, stage, shots } = setup();
    delete stage.time;
    let [bride] = stageFrise(p, stage, shots).sides;
    expect(times(bride)).toEqual([null, null, null]);
    expect(bride.moments.map((m) => m.minutes)).toEqual([8, 3, 50]);
    p.moments = { [momentKey(stage.id, "Mariée · Maquillage & coiffure")]: "10:00" };
    [bride] = stageFrise(p, stage, shots).sides;
    expect(times(bride)).toEqual([null, "10:00", "10:03"]);
    expect(bride.overflow).toBe(0);
  });
  it("met une étape sans côtés sur une seule piste commune", () => {
    const p = newProject("Test");
    const stage = makeItem("stages", "Cérémonie", { time: "14:00", duration: 30 });
    const shots = [shot("Cérémonie"), shot("Cérémonie"), shot("Famille")];
    const frise = stageFrise(p, stage, shots);
    expect(frise.sides).toEqual([]);
    expect(frise.after).toBeUndefined();
    expect(frise.before!.moments.map((m) => [m.section, m.shots.length])).toEqual([
      ["Famille", 1],
      ["Cérémonie", 2],
    ]);
    expect(times(frise.before)).toEqual(["14:00", "14:03"]);
  });
});

describe("état d’un moment", () => {
  it("passe de à faire à en cours puis fait, et signale les essentiels manquants", () => {
    const a = shot("x", { priority: "MUST HAVE" });
    const b = shot("x");
    expect(momentState([a, b])).toMatchObject({ label: "à faire", done: 0, total: 2 });
    expect(momentState([a, b]).missing).toEqual([a]);
    expect(momentState([a, { ...b, status: "à refaire" }]).label).toBe("en cours");
    expect(momentState([a, { ...b, status: "tourné" }])).toMatchObject({ label: "en cours", done: 1 });
    const all = momentState([{ ...a, status: "excellent" }, { ...b, status: "tourné" }]);
    expect(all).toMatchObject({ label: "fait", done: 2, missing: [] });
  });
  it("compte un plan sauté comme traité mais garde l’essentiel sauté manquant", () => {
    const state = momentState([shot("x", { priority: "MUST HAVE", status: "sauté" }), shot("x", { status: "tourné" })]);
    expect(state.label).toBe("fait");
    expect(state.done).toBe(1);
    expect(state.missing).toHaveLength(1);
  });
});

describe("horaires de moments dans les copies et sauvegardes", () => {
  it("suivent l’étape copiée et restent valides dans une sauvegarde", () => {
    const p = newProject("Test");
    const stage = makeItem("stages", "Préparatifs", { time: "09:00" });
    p.items = [stage];
    p.moments = { [momentKey(stage.id, "Mariée · Seule")]: "09:40", [momentKey("etape-supprimee", "Cérémonie")]: "14:00" };
    const copy = duplicateProject(p);
    expect(copy.moments).toEqual({ [momentKey(copy.items[0].id, "Mariée · Seule")]: "09:40" });
    const workspace = { schemaVersion: 1 as const, projects: [p], presets: [], activeProjectId: p.id, revision: 0, updatedAt: "" };
    expect(validateWorkspace(workspace)).toBeTruthy();
    expect(() => validateWorkspace({ ...workspace, projects: [{ ...p, moments: { x: "9h40" } }] })).toThrow("horaires des moments");
  });
});

describe("répartition des anciens préparatifs en moments", () => {
  // Les 24 plans de l'ancienne shot-list, tels qu'ils existent dans un projet réel.
  const legacy: [string, string, string][] = [
    ["Préparatifs mariée", "Robe sur cintre, détail dentelle", "Mariée · Détails & accessoires"],
    ["Préparatifs mariée", "Chaussures et accessoires posés", "Mariée · Détails & accessoires"],
    ["Préparatifs mariée", "Bouquet, alliance, invitation en flat lay", "Mariée · Détails & accessoires"],
    ["Préparatifs mariée", "Mariée en peignoir, moment calme", "Mariée · Seule"],
    ["Préparatifs mariée", "Mains de la maquilleuse au travail", "Mariée · Maquillage & coiffure"],
    ["Préparatifs mariée", "Coiffure — dernier geste", "Mariée · Maquillage & coiffure"],
    ["Préparatifs mariée", "Mariée qui rit avec ses demoiselles d’honneur", "Mariée · Avec ses proches"],
    ["Préparatifs mariée", "Mariée et sa mère, regard complice", "Mariée · Avec ses proches"],
    ["Préparatifs mariée", "Enfilage de la robe, de dos", "Mariée · Habillage"],
    ["Préparatifs mariée", "Boutons ou zip fermés par la mère ou un témoin", "Mariée · Habillage"],
    ["Préparatifs mariée", "Pose des chaussures", "Mariée · Habillage"],
    ["Préparatifs mariée", "Parfum vaporisé", "Mariée · Habillage"],
    ["Préparatifs mariée", "Dernier regard dans le miroir", "Mariée · Seule"],
    ["Préparatifs mariée", "Mariée seule, plein pied avant de sortir", "Mariée · Seule"],
    ["Préparatifs marié", "Costume sur cintre, détail tissu", "Marié · Détails & accessoires"],
    ["Préparatifs marié", "Chaussures et montre posées", "Marié · Détails & accessoires"],
    ["Préparatifs marié", "Boutons de manchette et alliance", "Marié · Détails & accessoires"],
    ["Préparatifs marié", "Marié qui enfile la chemise", "Marié · Habillage"],
    ["Préparatifs marié", "Nœud papillon ajusté par un témoin ou le père", "Marié · Habillage"],
    ["Préparatifs marié", "Marié et ses témoins, rires complices", "Marié · Avec ses proches"],
    ["Préparatifs marié", "Marié et son père, moment calme", "Marié · Avec ses proches"],
    ["Préparatifs marié", "Veste enfilée, dernier ajustement", "Marié · Habillage"],
    ["Préparatifs marié", "Marié seul, regard caméra", "Marié · Seul"],
    ["Préparatifs marié", "Marié plein pied, prêt à partir", "Marié · Seul"],
  ];
  it("range chacun des 24 anciens plans dans le bon moment", () => {
    const items = legacy.map(([section, title]) => makeItem("shots", title, { section }));
    const proposed = new Map(proposeMoments(items).map((x) => [x.item.title, x.section]));
    expect(Object.fromEntries(legacy.map(([, title]) => [title, proposed.get(title)]))).toEqual(
      Object.fromEntries(legacy.map(([, title, moment]) => [title, moment])),
    );
  });
  it("ne propose rien pour un plan non reconnu ou hors anciens préparatifs", () => {
    const items = [
      makeItem("shots", "Lettre lue à voix haute", { section: "Préparatifs mariée" }),
      makeItem("shots", "Dernier regard dans le miroir", { section: "Mariée · Seule" }),
      makeItem("shots", "Coiffure du marié", { section: "Préparatifs marié" }),
    ];
    expect(proposeMoments(items).map((x) => [x.item.title, x.section])).toEqual([["Coiffure du marié", "Marié · Habillage"]]);
  });
});

describe("ordre de la journée (Mode Jour J)", () => {
  it("suit le déroulé, puis la frise en croisant les deux côtés, puis les plans sans étape", () => {
    const p = newProject("Test");
    const prep = makeItem("stages", "Préparatifs", { time: "09:00", duration: 120, order: 0 });
    const ceremony = makeItem("stages", "Cérémonie", { time: "14:00", duration: 60, order: 1 });
    const s = (title: string, section: string | undefined, stageId?: string, extra: Partial<Item> = {}) =>
      makeItem("shots", title, { section, stageId, ...extra });
    // Ordre de saisie volontairement désordonné : la cérémonie a été créée en premier.
    const shots = [
      s("Alliances", "Cérémonie", ceremony.id),
      s("Sans étape", "Cocktail"),
      s("Portrait sans étape", "Portraits couple"),
      s("Habillage marié", "Marié · Habillage", prep.id),
      s("Robe", "Mariée · Détails & accessoires", prep.id, { shootMinutes: 10 }),
      s("Costume", "Marié · Détails & accessoires", prep.id),
      s("Miroir", "Mariée · Seule", prep.id),
    ].map((x, n) => ({ ...x, order: n }));
    p.items = [prep, ceremony, ...shots];
    // Côté marié : Costume 09:00, Habillage 09:03 ; côté mariée : Robe 09:00, Miroir 09:10.
    expect(dayOrder(p, shots).map((x) => x.title)).toEqual([
      "Robe",
      "Costume",
      "Habillage marié",
      "Miroir",
      "Alliances",
      "Portrait sans étape",
      "Sans étape",
    ]);
  });
  it("pack individuel : ne garde que les plans d'un cadreur, dans l'ordre de sa journée", () => {
    const p = newProject("Test");
    const prep = makeItem("stages", "Préparatifs", { time: "09:00", duration: 120, order: 0 });
    const ceremony = makeItem("stages", "Cérémonie", { time: "14:00", duration: 60, order: 1 });
    const christopher = makeItem("team", "Christopher");
    const maurice = makeItem("team", "Maurice");
    const s = (title: string, section: string | undefined, stageId: string | undefined, operatorId: string | undefined, extra: Partial<Item> = {}) =>
      makeItem("shots", title, { section, stageId, operatorId, ...extra });
    const shots = [
      s("Costume", "Marié · Détails & accessoires", prep.id, christopher.id),
      s("Robe", "Mariée · Détails & accessoires", prep.id, maurice.id),
      s("Alliances", "Cérémonie", ceremony.id, christopher.id),
      s("Portrait sans étape", "Portraits couple", undefined, christopher.id),
      s("Archivé", "Cérémonie", ceremony.id, christopher.id, { status: "archivé" }),
    ].map((x, n) => ({ ...x, order: n }));
    p.items = [prep, ceremony, christopher, maurice, ...shots];
    expect(operatorDayOrder(p, christopher.id).map((x) => x.title)).toEqual(["Costume", "Alliances", "Portrait sans étape"]);
    expect(operatorDayOrder(p, maurice.id).map((x) => x.title)).toEqual(["Robe"]);
    expect(operatorDayOrder(p, "inconnu")).toEqual([]);
  });
});

describe("repère Maintenant", () => {
  const moment = { key: "test", section: "Portraits", label: "Portraits", shots: [], minutes: 10, start: 540, estimated: 540, manual: false };
  it("inclut le début et exclut la fin, uniquement à la date du projet", () => {
    expect(isMomentNow(moment, "2026-09-22", new Date(2026, 8, 22, 9, 0))).toBe(true);
    expect(isMomentNow(moment, "2026-09-22", new Date(2026, 8, 22, 9, 10))).toBe(false);
    expect(isMomentNow(moment, "2026-09-21", new Date(2026, 8, 22, 9, 5))).toBe(false);
    expect(isMomentNow(moment, "", new Date(2026, 8, 22, 9, 5))).toBe(false);
    expect(isMomentNow({ ...moment, start: null }, "2026-09-22", new Date(2026, 8, 22, 9, 5))).toBe(false);
  });
  it("conserve un moment qui traverse minuit sur la journée suivante", () => {
    expect(isMomentNow({ ...moment, start: 1435 }, "2026-09-22", new Date(2026, 8, 23, 0, 2))).toBe(true);
    expect(isMomentNow({ ...moment, start: 1435 }, "2026-09-22", new Date(2026, 8, 23, 0, 5))).toBe(false);
  });
});
