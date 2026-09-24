import { describe, expect, it } from "vitest";
import { makeItem, newProject } from "../src/model";
import { applyPackImport, isPack, planPackImport, type Pack } from "../src/packImport";
import { poseSectionTitles } from "../src/poseSections";

const pack: Pack = {
  version: 1,
  projet: "Test",
  stages: { prep: "pr[ée]par", cer: "c[ée]r[ée]monie" },
  sections: ["Habillage marié"],
  poses: [
    { id: "P001", title: "Habillage marié", category: "Habillage marié", subject: "Marié", person: "Marié", stage: "prep", framing: "Plan large", favorite: true, essential: true, cover: "P001_02.jpg", images: ["P001_01.jpg", "P001_02.jpg"] },
    { id: "P002", title: "Cérémonie — baiser", category: "Cérémonie", subject: "Ensemble", stage: "cer", cover: "P002_01.jpg", images: ["P002_01.jpg", "P002_manquante.jpg"] },
    { id: "P004", title: "Section du tournage", category: "Détails mariée", section: "Accessoires & détails", subject: "Mariée", stage: "prep", cover: "P004_01.jpg", images: ["P004_01.jpg"] },
    { id: "P003", title: "Sans étape", category: "Couple seul", subject: "Ensemble", stage: "inconnu", cover: "P003_01.jpg", images: ["P003_01.jpg"] },
  ],
};
const have = new Set(["P001_01.jpg", "P001_02.jpg", "P002_01.jpg", "P003_01.jpg", "P004_01.jpg"]);

describe("import d'un pack de poses", () => {
  it("valide le format du manifest", () => {
    expect(isPack(pack)).toBe(true);
    expect(isPack({ poses: [{ id: 1 }] })).toBe(false);
    expect(isPack(null)).toBe(false);
  });
  it("regroupe les angles d'une pose, rattache l'étape et compte les manques", () => {
    const stage = makeItem("stages", "Préparatifs");
    const project = { ...newProject("T"), items: [stage] };
    const plan = planPackImport(project, pack, have);
    expect(plan.poses).toHaveLength(4);
    expect(plan.poses[0].files).toEqual(["P001_01.jpg", "P001_02.jpg"]);
    expect(plan.poses[0].item).toMatchObject({ stageId: stage.id, favorite: true, priority: "MUST HAVE", subjectGroup: "Marié", category: "Habillage marié" });
    expect(plan.poses[1].item.stageId).toBeUndefined();
    expect(plan.missingFiles).toBe(1);
    expect(plan.withoutStage).toBe(2);
    // La section du tournage est utilisée quand elle existe ; sinon la catégorie du pack.
    expect(plan.poses.find((e) => e.pose.id === "P004")!.item.category).toBe("Détails mariée");
    const withSection = planPackImport({ ...project, poseSections: [{ id: "s", title: "Accessoires & détails", order: 0 }] }, pack, have);
    expect(withSection.poses.find((e) => e.pose.id === "P004")!.item.category).toBe("Accessoires & détails");
    expect(withSection.sections).not.toContain("Accessoires & détails");
  });
  it("ne crée aucun doublon en relançant l'import et ajoute les sections", () => {
    const project = newProject("T");
    const first = planPackImport(project, pack, have);
    const next = applyPackImport(project, first, new Map([[first.poses[0].item.id, "media-1"]]));
    expect(next.items.find((i) => i.id === first.poses[0].item.id)?.coverId).toBe("media-1");
    expect(poseSectionTitles(next)).toContain("Habillage marié");
    expect(next.poseSections?.map((section) => section.title)).toContain("Habillage marié");
    const again = planPackImport(next, pack, have);
    expect(again.poses).toHaveLength(0);
    expect(again.alreadyThere).toBe(4);
    expect(project.items).toHaveLength(0);
  });
});
