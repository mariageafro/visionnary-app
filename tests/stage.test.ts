import { describe, it, expect } from "vitest";
import { duplicateStage, framingCode, makeItem, newProject, stageTemplate } from "../src/model";
import { parseTitles } from "../src/screens/BulkAdd";
import { isPhotoShot, isVideoShot, shotKind, stageItems, stageStats, titleFromFile } from "../src/stageStats";

describe("tableau de bord d’une étape", () => {
  const setup = () => {
    const p = newProject("Test");
    const stage = makeItem("stages", "Préparatifs mariée");
    const other = makeItem("stages", "Cérémonie");
    const s = (title: string, extra: Partial<ReturnType<typeof makeItem>> = {}) => makeItem("shots", title, { stageId: stage.id, ...extra });
    const shots = [
      s("Robe", { media: "photo", status: "tourné" }),
      s("Bijoux", { media: "photo" }),
      s("Miroir", { media: "video", priority: "MUST HAVE" }),
      s("Rires", { priority: "MUST HAVE", status: "excellent" }),
      s("Vue du ciel", { media: "drone", priority: "BONUS" }),
      s("Archivé", { status: "archivé" }),
      makeItem("shots", "Autre étape", { stageId: other.id }),
    ];
    const reference = makeItem("inspirations", "Référence miroir");
    shots[2].referenceId = reference.id;
    const transition = makeItem("transitions", "Miroir → Rires", { fromId: shots[2].id, toId: shots[3].id });
    p.items = [
      stage,
      other,
      ...shots,
      reference,
      transition,
      makeItem("poses", "Portrait fenêtre", { stageId: stage.id, status: "terminé" }),
      makeItem("poses", "Voile", { stageId: stage.id }),
      makeItem("lighting", "Fenêtre", { stageId: stage.id }),
      makeItem("drone", "Establishing", { stageId: stage.id }),
    ];
    return { p, stage };
  };

  it("compte vidéo, photo, drone, poses, essentiels et transitions de l’étape seulement", () => {
    const { p, stage } = setup();
    const items = stageItems(p, stage.id);
    const stats = stageStats(items);
    expect(items.shots.map((s) => s.title)).toEqual(["Robe", "Bijoux", "Miroir", "Rires", "Vue du ciel"]);
    expect(stats.shots).toEqual({ done: 2, total: 5 });
    // « Rires » (sans type) compte en vidéo ET en photo.
    expect(stats.video).toEqual({ done: 1, total: 2 });
    expect(stats.photo).toEqual({ done: 2, total: 3 });
    expect(stats.drone).toEqual({ done: 0, total: 2 });
    expect(stats.essentials).toEqual({ done: 1, total: 2 });
    expect(stats.bonus).toEqual({ done: 0, total: 1 });
    expect(stats.poses).toEqual({ done: 1, total: 2 });
    expect(stats.transitions).toBe(1);
    expect(stats.references).toBe(1);
    expect(stats.lights).toBe(1);
    expect(stats.remaining).toBe(3);
    expect(stats.percent).toBe(40);
  });

  it("lit le type d’un plan, y compris les anciens plans sans type", () => {
    const old = makeItem("shots", "Ancien");
    expect(shotKind(old)).toBe("both");
    expect(isPhotoShot(old) && isVideoShot(old)).toBe(true);
    expect(shotKind(makeItem("shots", "x", { media: "drone" }))).toBe("drone");
  });

  it("donne le code court d’une valeur de plan", () => {
    expect(framingCode("Gros plan")).toBe("CU");
    expect(framingCode("Plan poitrine")).toBe("MCU");
    expect(framingCode("Drone establishing")).toBe("DEST");
    expect(framingCode("Cadrage maison")).toBe("");
  });
});

describe("titre d’un plan créé depuis un fichier", () => {
  it("garde un nom parlant et remplace les noms d’appareil", () => {
    expect(titleFromFile("robe-dentelle_face.jpg", "Photo 1")).toBe("Robe dentelle face");
    expect(titleFromFile("IMG_2034.HEIC", "Photo 2")).toBe("Photo 2");
    expect(titleFromFile("DSC09876.jpg", "Photo 3")).toBe("Photo 3");
    expect(titleFromFile("PXL_20260612_101010.jpg", "Photo 4")).toBe("Photo 4");
    expect(titleFromFile("2026-09-22 10.15.03.jpg", "Photo 5")).toBe("Photo 5");
    expect(titleFromFile("WhatsApp Image 2026-09-01.jpeg", "Photo 6")).toBe("Photo 6");
    expect(titleFromFile("first look église.mp4", "Plan 7")).toBe("First look église");
    expect(titleFromFile("photo-lourde-21mo.jpg", "Pose 8")).toBe("Photo lourde 21mo");
    expect(titleFromFile("Photo 2026-09-22 à 10.15.jpg", "Pose 9")).toBe("Pose 9");
    expect(titleFromFile("Capture d’écran 2026-09-01 à 12.00.00.png", "Référence 1")).toBe("Référence 1");
  });
});

describe("dupliquer une étape et en faire un template", () => {
  const setup = () => {
    const p = newProject("Test");
    const member = makeItem("team", "Christopher");
    const stage = makeItem("stages", "Préparatifs mariée", { time: "09:00", order: 1 });
    const a = makeItem("shots", "Robe", { stageId: stage.id, operatorId: member.id, status: "tourné", takesLog: "[]" });
    const b = makeItem("shots", "Miroir", { stageId: stage.id, status: "excellent" });
    const t = makeItem("transitions", "Robe → Miroir", { fromId: a.id, toId: b.id, movement: "Whip pan" });
    const other = makeItem("shots", "Autre étape");
    p.items = [member, stage, a, b, t, other];
    return { p, member, stage, a, b, t };
  };
  it("copie l'étape, ses plans et ses transitions, garde l'équipe et repart à zéro", () => {
    const { p, member, stage, a } = setup();
    const copies = duplicateStage(p, stage.id, new Map([[a.id, "media-robe"]]));
    const [copyStage, copyA, copyB, copyT] = copies;
    expect(copies).toHaveLength(4);
    expect(copyStage.title).toBe("Préparatifs mariée (copie)");
    expect(copyStage.order).toBe(1.5);
    expect(copyA.stageId).toBe(copyStage.id);
    expect(copyA.operatorId).toBe(member.id);
    expect(copyA.status).toBe("prévu");
    expect(copyA.takesLog).toBeUndefined();
    expect(copyA.sourceMediaId).toBe("media-robe");
    expect(copyB.status).toBe("prévu");
    expect([copyT.fromId, copyT.toId]).toEqual([copyA.id, copyB.id]);
  });
  it("enregistre un template d'étape sans liens vers l'équipe du mariage d'origine", () => {
    const { p, stage } = setup();
    const preset = stageTemplate(p, stage.id)!;
    expect(preset.kind).toBe("étape");
    expect(preset.name).toBe("Préparatifs mariée");
    const [s, a] = preset.items;
    expect(a.stageId).toBe(s.id);
    expect(a.operatorId).toBeUndefined();
    expect(preset.items.every((i) => i.status === "prévu")).toBe(true);
    expect(preset.description).toContain("2 plans");
  });
});

describe("liste de plans collée", () => {
  it("retire puces et numéros, ignore les lignes vides", () => {
    expect(parseTitles("- Robe\n\n• Bijoux\n3) Parfum\n  12. Bouquet  \n* Voile")).toEqual(["Robe", "Bijoux", "Parfum", "Bouquet", "Voile"]);
  });
});
