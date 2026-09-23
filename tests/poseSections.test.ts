import { describe, expect, it } from "vitest";
import { makeItem, newProject } from "../src/model";
import { addPoseSection, movePoseSection, poseSectionTitles, removePoseSection, renamePoseSection, setPoseSectionCollapsed } from "../src/poseSections";

describe("sections de la galerie photographe", () => {
  it("personnalise les titres et l'ordre sans détacher les photos existantes", () => {
    const pose = makeItem("poses", "Portrait de la mariée", { category: "Couple", sourceMediaId: "photo-1" });
    const project = { ...newProject(), items: [pose] };
    const named = renamePoseSection(project, "Couple", "Portraits du couple");
    expect(named.items[0]).toMatchObject({ id: pose.id, category: "Portraits du couple", sourceMediaId: "photo-1" });
    const added = addPoseSection(named, "Détails photo");
    expect(poseSectionTitles(added)).toEqual(["Portraits du couple", "Détails photo"]);
    const moved = movePoseSection(added, "Détails photo", -1);
    expect(poseSectionTitles(moved)).toEqual(["Détails photo", "Portraits du couple"]);
    const folded = setPoseSectionCollapsed(moved, "Détails photo", true);
    expect(folded.poseSections?.find((entry) => entry.title === "Détails photo")?.collapsed).toBe(true);
    const removed = removePoseSection(folded, "Portraits du couple");
    expect(removed.items[0]).toMatchObject({ id: pose.id, sourceMediaId: "photo-1" });
    expect(removed.items[0].category).toBeUndefined();
    expect(poseSectionTitles(removed)).toEqual(["Détails photo", "Sans catégorie"]);
  });

  it("empêche les doublons et réserve À faire absolument aux poses prioritaires", () => {
    const project = addPoseSection(newProject(), "Famille");
    expect(addPoseSection(project, "Famille")).toBe(project);
    expect(addPoseSection(project, "À faire absolument")).toBe(project);
    expect(renamePoseSection(project, "Famille", "À faire absolument")).toBe(project);
  });
});
