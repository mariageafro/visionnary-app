import { describe, expect, it } from "vitest";
import { makeItem, newProject } from "../src/model";
import { isLibrary, libraryOf, newLibrary, planLibraryFromFolder, planLibraryFromPack, planUseFromLibrary, realProjects } from "../src/library";
import type { Pack } from "../src/packImport";
import type { Workspace } from "../src/types";

const pack: Pack = {
  version: 1, projet: "T", stages: {}, sections: [],
  poses: [
    { id: "P1", title: "Nœud papillon", category: "Habillage marié", moment_folder: "09 Préparatifs marié · Habillage", section: "Préparatifs marié", subject: "Marié", stage: "prep", framing: "Plan taille", cover: "P1_01.jpg", images: ["P1_01.jpg", "P1_02.jpg"] },
    { id: "P2", title: "Alliances", category: "Détails", subject: "Ensemble", stage: "cer", cover: "P2_01.jpg", images: ["P2_01.jpg"] },
  ],
};
const workspace = (projects = [newProject("A"), newLibrary()]): Workspace => ({ schemaVersion: 1, projects, presets: [], activeProjectId: projects[0].id, revision: 0, updatedAt: "" });

describe("bibliothèque de poses", () => {
  it("masque la bibliothèque des tournages", () => {
    const w = workspace();
    expect(realProjects(w).map((p) => p.name)).toEqual(["A"]);
    expect(libraryOf(w) && isLibrary(libraryOf(w)!)).toBe(true);
  });
  it("crée un élément par image, classé par dossier sans son numéro, sans doublon", () => {
    const lib = newLibrary();
    const first = planLibraryFromPack(lib, pack, new Set(["P1_01.jpg", "P1_02.jpg", "P2_01.jpg"]));
    expect(first.entries).toHaveLength(3);
    expect(first.entries[0].item).toMatchObject({ category: "Préparatifs marié · Habillage", sectionHint: "Préparatifs marié", subjectGroup: "Marié" });
    expect(first.entries[2].item.category).toBe("Détails");
    const again = planLibraryFromPack({ ...lib, items: first.entries.map((e) => e.item) }, pack, new Set(["P1_01.jpg", "P1_02.jpg", "P2_01.jpg"]));
    expect(again.entries).toHaveLength(0);
    expect(again.alreadyThere).toBe(3);
  });
  it("classe un dossier importé par sous-dossier", () => {
    const plan = planLibraryFromFolder(newLibrary(), [
      { name: "a.jpg", path: "Racine/03 Cérémonie/a.jpg", size: 1 },
      { name: "b.jpg", path: "Racine/b.jpg", size: 2 },
    ]);
    expect(plan.entries.map((e) => e.item.category)).toEqual(["Cérémonie", "Racine"]);
  });
  it("regroupe plusieurs photos en une pose, ou une pose par photo", () => {
    const project = newProject("W");
    const picked = [makeItem("poses", "Un", { subjectGroup: "Marié", framing: "Plan large" }), makeItem("poses", "Deux")];
    const group = planUseFromLibrary(project, picked, { group: true, section: "Préparatifs marié", title: "Habillage" });
    expect(group.items).toHaveLength(1);
    expect(group.items[0]).toMatchObject({ title: "Habillage", category: "Préparatifs marié", subjectGroup: "Marié" });
    expect(group.sources.get(group.items[0].id)).toEqual(picked.map((p) => p.id));
    const separate = planUseFromLibrary(project, picked, { group: false, section: "Couple", stageId: "s1" });
    expect(separate.items).toHaveLength(2);
    expect(separate.items[0].stageId).toBe("s1");
  });
});
