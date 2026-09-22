import { describe, it, expect } from "vitest";
import type { SceneElement } from "../src/scene/types";
import { angleTo, cameraFov, contains, estimateFraming, frameWidth, hfov, normAngle } from "../src/scene/geometry";
import { poseAt, progress, sceneLength, trail } from "../src/scene/motion";
import { sceneTemplates } from "../src/scene/templates";
import { addElements, alignElements, assetElement, clonePlan, duplicateElements, expandGroups, groupElements, makePerson, newPlan, removeElements, withMovement } from "../src/scene/ops";
import { legacyPlan } from "../src/scene/legacy";
import { duplicateProject, makeItem, newProject } from "../src/model";
import { validateWorkspace } from "../src/exports";

const el = (extra: Partial<SceneElement>): SceneElement => ({ id: "x", kind: "camera", name: "CAM A", x: 0, y: 0, rotation: 0, layer: "cameras", ...extra });
const near = (a: number, b: number, eps = 0.02) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe("champ de vision d’une caméra", () => {
  it("calcule l’angle selon capteur et focale", () => {
    near(hfov(36, 85), 23.9, 0.1);
    near(hfov(36, 24), 73.7, 0.1);
    near(hfov(24.9, 50), 28.0, 0.1);
    near(cameraFov({ sensor: "mft", focal: 25 }), 38.2, 0.2);
  });
  it("estime la valeur de plan à la distance du sujet", () => {
    const w = frameWidth(3, hfov(36, 85));
    near(w, 1.27, 0.01);
    expect(estimateFraming(w)).toEqual({ label: "Plan poitrine", code: "MCU" });
    expect(estimateFraming(frameWidth(1.2, hfov(36, 85))).code).toBe("CU");
    expect(estimateFraming(frameWidth(6, hfov(36, 35))).code).toBe("WS");
    expect(estimateFraming(frameWidth(30, hfov(36, 24))).code).toBe("EWS");
  });
  it("détecte un point dans un élément tourné", () => {
    const table = el({ kind: "object", w: 2, h: 0.5, rotation: 90 });
    expect(contains(table, { x: 0, y: 0.9 })).toBe(true);
    expect(contains(table, { x: 0.9, y: 0 })).toBe(false);
    expect(contains({ ...table, shape: "ellipse", rotation: 0, w: 2, h: 2 }, { x: 0.8, y: 0.8 })).toBe(false);
  });
});

describe("moteur d’animation", () => {
  const none = () => undefined;
  it("reste en place avant le début et à l’arrivée après la fin", () => {
    const cam = el({ motion: { type: "push-in", start: 2, duration: 4, distance: 2, easing: "linear" } });
    expect(progress(cam.motion!, 0)).toBe(0);
    expect(poseAt(cam, 1, none)).toMatchObject({ x: 0, y: 0 });
    near(poseAt(cam, 4, none).x, 1);
    near(poseAt(cam, 9, none).x, 2);
  });
  it("pan : le pied reste fixe, seul l’axe tourne", () => {
    const cam = el({ rotation: -90, motion: { type: "pan-right", start: 0, duration: 2, easing: "linear" } });
    const end = poseAt(cam, 2, none);
    expect([end.x, end.y]).toEqual([0, 0]);
    near(end.rotation, -45);
  });
  it("travelling latéral perpendiculaire à l’axe", () => {
    const cam = el({ rotation: 0, motion: { type: "truck-left", start: 0, duration: 1, distance: 2 } });
    const end = poseAt(cam, 1, none);
    near(end.x, 0);
    near(end.y, -2);
  });
  it("arc 180° : la caméra passe de l’autre côté du sujet en le regardant", () => {
    const bride = el({ id: "bride", kind: "person", x: 4, y: 0 });
    const cam = el({ motion: { type: "arc180", start: 0, duration: 6, targetId: "bride" } });
    const find = (id: string) => (id === "bride" ? bride : undefined);
    const mid = poseAt(cam, 3, find);
    near(mid.x, 4, 0.05);
    near(Math.abs(mid.y), 4, 0.05);
    const end = poseAt(cam, 6, find);
    near(end.x, 8, 0.05);
    near(end.y, 0, 0.05);
    near(normAngle(end.rotation - angleTo(end, bride)), 0, 0.5);
  });
  it("tracking : suit la mariée qui marche en gardant l’écart", () => {
    const bride = el({ id: "bride", kind: "person", x: 0, y: 10, rotation: -90, motion: { type: "walk", start: 0, duration: 10, path: [{ x: 0, y: 0 }], easing: "linear" } });
    const cam = el({ x: 2, y: 10, rotation: 180, motion: { type: "follow", start: 0, duration: 10, targetId: "bride" } });
    const find = (id: string) => (id === "bride" ? bride : undefined);
    const b = poseAt(bride, 5, find);
    near(b.y, 5, 0.1);
    const c = poseAt(cam, 5, find);
    near(c.x, 2, 0.05);
    near(c.y, b.y, 0.05);
    near(normAngle(c.rotation - 180), 0, 0.5);
    expect(poseAt(bride, 10, find).rotation).toBeCloseTo(-90, 0);
  });
  it("drone : altitude qui monte, orbite autour du sujet", () => {
    const drone = el({ kind: "drone", altitude: 20, motion: { type: "rise", start: 0, duration: 4, rise: 30 } });
    expect(poseAt(drone, 4, none).altitude).toBe(50);
    const handheld = el({ motion: { type: "handheld", start: 0, duration: 5 } });
    expect(poseAt(handheld, 2.5, none)).toEqual(poseAt(handheld, 2.5, none));
  });
  it("donne la trajectoire à dessiner et la durée de la scène", () => {
    const cam = el({ motion: { type: "orbit360", start: 1, duration: 10, targetId: "c" } });
    const center = el({ id: "c", kind: "person", x: 3, y: 0 });
    const points = trail(cam, (id) => (id === "c" ? center : undefined), 8);
    expect(points).toHaveLength(9);
    near(points[8].x, 0, 0.05);
    expect(sceneLength([cam, el({ motion: { type: "walk", start: 12, duration: 8 } })])).toBe(20);
    expect(sceneLength([el({})])).toBe(6);
  });
});

describe("presets de scène", () => {
  it("construit chaque preset avec des caméras nommées et une durée cohérente", () => {
    for (const t of sceneTemplates) {
      const plan = t.build();
      const cams = plan.elements.filter((e) => e.kind === "camera");
      expect(cams.length, t.id).toBeGreaterThanOrEqual(1);
      expect(new Set(cams.map((c) => c.tag)).size, t.id).toBe(cams.length);
      expect(plan.duration, t.id).toBe(sceneLength(plan.elements));
      // Toute cible visée existe dans le plan.
      const ids = new Set(plan.elements.map((e) => e.id));
      for (const e of plan.elements) {
        if (e.targetId) expect(ids.has(e.targetId), `${t.id} ${e.name}`).toBe(true);
        if (e.motion?.targetId) expect(ids.has(e.motion.targetId), `${t.id} ${e.name}`).toBe(true);
      }
    }
  });
  it("cérémonie : la mariée remonte l’allée et CAM A la suit", () => {
    const plan = sceneTemplates.find((t) => t.id === "ceremonie")!.build();
    const find = (id: string) => plan.elements.find((e) => e.id === id);
    const bride = plan.elements.find((e) => e.role === "mariee")!;
    const camA = plan.elements.find((e) => e.tag === "CAM A")!;
    const start = poseAt(bride, 0, find);
    const end = poseAt(bride, 22, find);
    expect(end.y).toBeLessThan(start.y - 10);
    const camStart = poseAt(camA, 2, find);
    const camMid = poseAt(camA, 10, find);
    expect(camMid.y).toBeLessThan(camStart.y - 3);
    expect(["CAM A", "CAM B", "CAM C", "CAM D"]).toEqual(plan.elements.filter((e) => e.kind === "camera").map((e) => e.tag));
  });
});

describe("opérations sur un plan", () => {
  const base = () => {
    const plan = newPlan("Test");
    const bride = makePerson("mariee", { x: 2, y: 2 });
    const cam = { ...assetElement(plan, "camera", { x: 0, y: 0 }), targetId: bride.id, motion: { type: "follow", start: 0, duration: 4, targetId: bride.id } };
    return { plan: addElements(plan, [bride, cam]), bride, cam };
  };
  it("nomme les caméras dans l’ordre et une copie prend le nom suivant", () => {
    const { plan, cam } = base();
    expect(cam.tag).toBe("CAM A");
    const copy = duplicateElements(plan, [cam.id]);
    const added = copy.plan.elements.find((e) => e.id === copy.ids[0])!;
    expect(added.tag).toBe("CAM B");
    expect(added.x).toBeCloseTo(0.8);
    // La cible hors sélection reste la même mariée.
    expect(added.targetId).toBe(plan.elements[0].id);
  });
  it("supprimer le sujet retire les liens qui le visaient", () => {
    const { plan, bride, cam } = base();
    const next = removeElements(plan, [bride.id]);
    const c = next.elements.find((e) => e.id === cam.id)!;
    expect(c.targetId).toBeUndefined();
    expect(c.motion?.targetId).toBeUndefined();
  });
  it("donne un mouvement avec ses réglages par défaut", () => {
    const { cam } = base();
    const moved = withMovement(cam, "arc180");
    expect(moved.motion).toMatchObject({ type: "arc180", sweep: 180, duration: 6, targetId: cam.targetId });
    expect(withMovement(cam, "none").motion).toBeUndefined();
  });
  it("aligne à gauche et groupe", () => {
    const plan = addElements(newPlan("T"), [assetElement(newPlan("x"), "chaise", { x: 1, y: 0 }), assetElement(newPlan("x"), "chaise", { x: 3, y: 1 })]);
    const ids = plan.elements.map((e) => e.id);
    const aligned = alignElements(plan, ids, "left");
    expect(aligned.elements.map((e) => e.x)).toEqual([1, 1]);
    const grouped = groupElements(plan, ids);
    expect(expandGroups(grouped, [ids[0]])).toEqual(ids);
  });
  it("copie un plan : nouveaux identifiants, liens internes suivis, liens externes remappés", () => {
    const { plan, bride } = base();
    const withLinks = { ...plan, stageId: "etape-1", elements: plan.elements.map((e) => (e.kind === "camera" ? { ...e, operatorId: "membre-1", referenceId: "media-1" } : e)) };
    const copy = clonePlan(withLinks, new Map([["etape-1", "etape-2"], ["membre-1", "membre-2"]]));
    expect(copy.id).not.toBe(plan.id);
    expect(copy.stageId).toBe("etape-2");
    const cam = copy.elements.find((e) => e.kind === "camera")!;
    const b = copy.elements.find((e) => e.kind === "person")!;
    expect(b.id).not.toBe(bride.id);
    expect(cam.targetId).toBe(b.id);
    expect(cam.motion?.targetId).toBe(b.id);
    expect(cam.operatorId).toBe("membre-2");
    expect(cam.referenceId).toBeUndefined();
  });
});

describe("plans de scène dans le tournage", () => {
  it("sont validés dans une sauvegarde et suivent la copie du tournage", () => {
    const p = newProject("Test");
    const stage = makeItem("stages", "Cérémonie");
    const member = makeItem("team", "Christopher");
    p.items = [stage, member];
    const plan = sceneTemplates[0].build();
    plan.stageId = stage.id;
    plan.elements[plan.elements.length - 1].operatorId = member.id;
    p.scenePlans = [plan];
    const workspace = { schemaVersion: 1 as const, projects: [p], presets: [], activeProjectId: p.id, revision: 0, updatedAt: "" };
    expect(validateWorkspace(workspace)).toBeTruthy();
    expect(() => validateWorkspace({ ...workspace, projects: [{ ...p, scenePlans: [{ ...plan, elements: [{ ...plan.elements[0], x: Number.NaN }] }] }] })).toThrow("élément de scène x");
    const copy = duplicateProject(p);
    expect(copy.scenePlans![0].stageId).toBe(copy.items[0].id);
    expect(copy.scenePlans![0].elements.at(-1)!.operatorId).toBe(copy.items[1].id);
  });
  it("convertit l’ancien plan multicam en mètres sans l’effacer", () => {
    const p = newProject("Test");
    const member = makeItem("team", "Christopher");
    p.items = [member];
    p.placements = [
      { id: "a", type: "camera", label: "Cam A · Plan large", x: 450, y: 280, endX: 450, endY: 280, angle: -90, color: "#fff", operator: "christopher", focal: "85 mm", duration: 8 },
      { id: "b", type: "subject", label: "Partenaire A", x: 300, y: 100, endX: 600, endY: 100, angle: 0, color: "#fff", operator: "", focal: "", duration: 6 },
    ];
    const plan = legacyPlan(p)!;
    const cam = plan.elements[0];
    expect(cam).toMatchObject({ kind: "camera", tag: "CAM A", focal: 85, operatorId: member.id });
    expect(cam.x).toBeCloseTo(15);
    expect(plan.elements[1].motion).toMatchObject({ type: "walk", duration: 6 });
    expect(p.placements).toHaveLength(2);
  });
});
