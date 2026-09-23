import { describe, expect, it } from "vitest";
import { makeItem } from "../src/model";
import { guideContext, operatorGuides } from "../src/operatorGuide";

describe("aide opérateur contextuelle", () => {
  it("choisit une aide selon le module et les consignes du plan", () => {
    expect(guideContext(makeItem("interviews", "Interview couple"))).toBe("interview");
    expect(guideContext(makeItem("shots", "Entrée sur le dancefloor"))).toBe("dancefloor");
    expect(guideContext(makeItem("shots", "Mouvement", { support: "Gimbal" }))).toBe("gimbal");
    expect(guideContext(makeItem("shots", "Sécurité vœux"))).toBe("ceremony");
    expect(guideContext(makeItem("poses", "Portrait des mariés"))).toBe("photo");
  });

  it("fournit les principes multicam demandés", () => {
    const tips = operatorGuides.multicam.tips.join(" ");
    expect(tips).toContain("large de sécurité");
    expect(tips).toContain("réactions");
    expect(tips).toContain("continu");
    expect(tips).toContain("micros");
  });
});
