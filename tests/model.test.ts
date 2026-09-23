import { describe, it, expect } from "vitest";
import { cloneItems, duplicateProject, makeItem, newProject, presetLibrary } from "../src/model";
import { validateWorkspace, projectEDL } from "../src/exports";
import type { Workspace } from "../src/types";
const workspace = (items = []) =>
  ({
    schemaVersion: 1,
    projects: [],
    presets: [{ id: "p", name: "Preset", description: "", items }],
    activeProjectId: "",
    revision: 0,
    updatedAt: "",
  }) as Workspace;
describe("relations et copies", () => {
  it("remappe les relations internes sans modifier les textes et retire les liens externes", () => {
    const stage = makeItem("stages", "Cérémonie");
    const shot = makeItem("shots", stage.id, {
      stageId: stage.id,
      operatorId: "hors-selection",
      mediaId: "image",
    });
    const copy = cloneItems([stage, shot]);
    expect(copy[1].stageId).toBe(copy[0].id);
    expect(copy[1].title).toBe(stage.id);
    expect(copy[1].operatorId).toBeUndefined();
    expect(copy[1].mediaId).toBeUndefined();
    expect(shot.mediaId).toBe("image");
  });
  it("duplique projet et placements en gardant les références médias (l'appelant duplique les fichiers)", () => {
    const p = newProject();
    p.coverId = "cover";
    p.items = [makeItem("notes", "Test", { imageId: "img" })];
    p.placements = [
      {
        id: "pos",
        type: "camera",
        label: "Cam",
        x: 1,
        y: 1,
        endX: 2,
        endY: 2,
        angle: 0,
        color: "gold",
        operator: "Camille",
        focal: "35",
        duration: 5,
      },
    ];
    const copy = duplicateProject(p);
    expect(copy.id).not.toBe(p.id);
    // La couverture du tournage n'est pas reportée automatiquement (l'appelant peut en choisir une nouvelle).
    expect(copy.coverId).toBeUndefined();
    // Mais la référence média d'un élément, elle, est conservée : à l'appelant de dupliquer le fichier en pointant dessus.
    expect(copy.items[0].imageId).toBe("img");
    expect(copy.placements[0].id).not.toBe("pos");
    expect(copy.placements[0].operator).toBe("Camille");
  });
  it("dupliquer un tournage entier (modèle pour un autre mariage) remet toute la progression à zéro", () => {
    const p = newProject("Original");
    p.status = "terminé";
    p.items = [
      makeItem("shots", "Plan tourné", { status: "tourné", startedAt: "2026-01-01T10:00:00.000Z", takesLog: "1,2,3" }),
      makeItem("stages", "Étape finie", { status: "fait", startedAt: "2026-01-01T09:00:00.000Z", endedAt: "2026-01-01T10:00:00.000Z" }),
      makeItem("checklists", "Archivée", { status: "archivé" }),
    ];
    const copy = duplicateProject(p);
    expect(copy.status).toBe("en préparation");
    expect(copy.items.map((i) => i.status)).toEqual(["prévu", "prévu", "archivé"]);
    expect(copy.items[0].startedAt).toBeUndefined();
    expect(copy.items[0].takesLog).toBeUndefined();
    expect(copy.items[1].endedAt).toBeUndefined();
  });
  it("valide les presets livrés et rejette les références de mauvais type", () => {
    expect(validateWorkspace({ ...workspace(), presets: presetLibrary() })).toBeTruthy();
    const p = makeItem("notes", "Note");
    const shot = makeItem("shots", "Plan", { stageId: p.id });
    expect(() =>
      validateWorkspace({
        ...workspace(),
        presets: [{ id: "p", name: "p", description: "", items: [p, shot] }],
      }),
    ).toThrow("référence stageId");
  });
  it("exporte uniquement la sélection dans l’ordre de pré-montage avec ses durées", () => {
    const p = newProject();
    p.items = [
      makeItem("shots", "Après", { included: true, timelineOrder: 1, duration: 3, order: 0 }),
      makeItem("shots", "Avant", { included: true, timelineOrder: 0, duration: 2, order: 1 }),
      makeItem("shots", "Exclu", { included: false, duration: 10 }),
    ];
    const edl = projectEDL(p);
    expect(edl.indexOf("Avant")).toBeLessThan(edl.indexOf("Après"));
    expect(edl).not.toContain("Exclu");
    expect(edl).toContain("01:00:00:00 01:00:02:00");
    expect(edl).toContain("01:00:02:00 01:00:05:00");
  });
});

describe('compatibilité des nouveaux modules', () => {
  it('sauvegarde le module drone utilisé par le créateur de tournage', () => {
    const p = newProject('Drone');
    p.items = [makeItem('drone', 'Repérage extérieur')];
    expect(validateWorkspace({...workspace(), projects:[p], activeProjectId:p.id})).toBeTruthy();
  });
  it('duplique scènes, opérateurs et garde la référence média (à dupliquer par l’appelant)', () => {
    const p = newProject();
    const member = makeItem('team', 'Camille');
    p.items = [member, makeItem('shots', 'Plan', {operatorId:member.id, sourceMediaId:'original'})];
    p.scenes = [{id:'ceremonie',name:'Cérémonie'}];
    p.placements = [{id:'cam',type:'camera',label:'A',x:10,y:20,endX:30,endY:40,angle:0,color:'#ddd',operator:'Camille',operatorId:member.id,sceneId:'ceremonie',focal:'35',duration:4}];
    const copy = duplicateProject(p);
    expect(copy.scenes![0].id).not.toBe('ceremonie');
    expect(copy.placements[0].sceneId).toBe(copy.scenes![0].id);
    expect(copy.placements[0].operatorId).toBe(copy.items[0].id);
    expect(copy.items[1].operatorId).toBe(copy.items[0].id);
    expect(copy.items[1].sourceMediaId).toBe('original');
    expect(p.items[1].sourceMediaId).toBe('original');
  });
});
