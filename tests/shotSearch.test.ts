import { expect, it } from "vitest";
import { makeItem } from "../src/model";
import { matchesShotSearch } from "../src/shotSearch";
it("retrouve un plan par mots sans accents dans ses détails et affectations", () => {
  const member = makeItem("team", "Chloé");
  const stage = makeItem("stages", "Préparatifs");
  const shot = makeItem("shots", "Mariée seule", { operatorId: member.id, stageId: stage.id, focal: "85 mm", framing: "Plan poitrine" });
  expect(matchesShotSearch(shot, "  CHLOE   mariee 85 preparatifs ", [member, stage])).toBe(true);
  expect(matchesShotSearch(shot, "mariee drone", [member, stage])).toBe(false);
  expect(matchesShotSearch(shot, "undefined", [])).toBe(false);
  expect(matchesShotSearch(shot, "   ", [])).toBe(true);
});
