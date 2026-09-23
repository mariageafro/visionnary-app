import { describe, expect, it } from "vitest";
import { orderedSectionTitles, reorderShotSection, siblingSectionTitles } from "../src/shotSections";
import type { ShotSection } from "../src/types";

const sections: ShotSection[] = [
  { id: "a", title: "Mariée", order: 1 },
  { id: "b", title: "Marié", order: 0 },
  { id: "a1", title: "Mariée · Habillage", parentId: "a", order: 1 },
  { id: "a0", title: "Mariée · Maquillage", parentId: "a", order: 0 },
];

describe("sections de plans", () => {
  it("garde les sous-sections près du parent et les chapitres anciens", () => {
    expect(orderedSectionTitles(sections, ["Cérémonie"])).toEqual([
      "Marié", "Mariée", "Mariée · Maquillage", "Mariée · Habillage", "Cérémonie",
    ]);
  });

  it("réordonne uniquement les sous-sections d'un même parent", () => {
    const moved = reorderShotSection(sections, [], "Mariée · Habillage", "Mariée · Maquillage");
    expect(moved && orderedSectionTitles(moved, [])).toEqual([
      "Marié", "Mariée", "Mariée · Habillage", "Mariée · Maquillage",
    ]);
    expect(reorderShotSection(sections, [], "Mariée · Habillage", "Marié")).toBeNull();
  });

  it("déplace un chapitre historique avec ses sous-sections et conserve les identifiants", () => {
    const moved = reorderShotSection(sections, ["Cérémonie"], "Mariée", "Marié");
    expect(moved && orderedSectionTitles(moved, ["Cérémonie"])).toEqual([
      "Mariée", "Mariée · Maquillage", "Mariée · Habillage", "Marié", "Cérémonie",
    ]);
    expect(siblingSectionTitles(moved ?? [], ["Cérémonie"], "Mariée · Habillage")).toEqual([
      "Mariée · Maquillage", "Mariée · Habillage",
    ]);
    expect(moved?.find((entry) => entry.title === "Mariée")?.id).toBe("a");
  });
});
