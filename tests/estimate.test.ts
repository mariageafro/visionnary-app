import { describe, expect, it } from "vitest";
import { estimateSections, estimateTotal } from "../src/estimate";
import { makeItem } from "../src/model";

describe("estimations de couverture", () => {
  it("calcule une cible à partir de la durée, du style et de la marge", () => {
    expect(estimateTotal(5, 4, "équilibré", 0)).toBe(75);
    expect(estimateTotal(15, 4, "équilibré", 0)).toBe(225);
    expect(estimateTotal(30, 4, "équilibré", 0)).toBe(450);
    expect(estimateTotal(5, 2, "fast cut", 0)).toBeGreaterThan(estimateTotal(5, 4, "calme", 0));
  });
  it("répartit par sections avec une priorité supérieure aux essentiels", () => {
    const shots = [
      makeItem("shots", "Plan A", { section: "Cérémonie", priority: "MUST HAVE", shootMinutes: 8, stageId: "stage" }),
      makeItem("shots", "Plan B", { section: "Cérémonie", priority: "IMPORTANT", shootMinutes: 7, stageId: "stage" }),
      makeItem("shots", "Plan C", { section: "Cocktail", priority: "BONUS" }),
    ];
    const result = estimateSections(shots, { filmMinutes: 5, averageCutSeconds: 4, style: "équilibré", marginPercent: 0, bRollPercent: 20, availableByStage: { stage: 20 } });
    expect(result).toHaveLength(2);
    expect(result.find((row) => row.section === "Cérémonie")!.target).toBeGreaterThan(result.find((row) => row.section === "Cocktail")!.target);
    expect(result.find((row) => row.section === "Cérémonie")!.shootMinutes).toBe(15);
    expect(result.find((row) => row.section === "Cérémonie")!.state).toBe("confortable");
    expect(result[0].distribution["B-roll"]).toBeGreaterThan(0);
  });
  it("signale une charge critique et ignore les plans archivés", () => {
    const shots = [
      makeItem("shots", "Long", { section: "Soirée", shootMinutes: 35, stageId: "soirée" }),
      makeItem("shots", "Archivé", { section: "Soirée", status: "archivé", shootMinutes: 100 }),
    ];
    const [row] = estimateSections(shots, { filmMinutes: 15, averageCutSeconds: 5, style: "dynamique", marginPercent: 20, bRollPercent: 15, availableByStage: { soirée: 20 } });
    expect(row.planned).toBe(1);
    expect(row.shootMinutes).toBe(35);
    expect(row.state).toBe("critique");
  });
  it("renforce les réactions et le plan large dans une proposition multicam", () => {
    const shots = [makeItem("shots", "Plan", { section: "Cérémonie" })];
    const common = { filmMinutes: 15, averageCutSeconds: 4, style: "équilibré" as const, marginPercent: 0, bRollPercent: 10 };
    const single = estimateSections(shots, common)[0];
    const multicam = estimateSections(shots, { ...common, multicam: true })[0];
    expect(multicam.distribution.Réaction).toBeGreaterThan(single.distribution.Réaction);
    expect(multicam.distribution.Sécurité).toBeGreaterThan(single.distribution.Sécurité);
  });
});
