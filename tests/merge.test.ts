import { describe, expect, it } from "vitest";
import { makeItem } from "../src/model";
import { angleOwners, detachFromSeries, doneAngles, mergeIntoSeries, seriesMedia, toggleAngle } from "../src/merge";
import type { MediaEntry } from "../src/types";

const media = (id: string, itemId: string): MediaEntry => ({ id, projectId: "p", itemId, name: id, type: "image/jpeg", size: 1, blob: new Blob() });
const a = makeItem("poses", "A");
const b = makeItem("poses", "B");
const c = makeItem("poses", "C");
const shot = makeItem("shots", "Plan");

describe("séries d'angles", () => {
  it("regroupe des poses dans une cible sans toucher aux médias et masque les sources", () => {
    const items = mergeIntoSeries([a, b, c, shot], a.id, [b.id, c.id])!;
    const target = items.find((i) => i.id === a.id)!;
    expect(angleOwners(target)).toEqual([a.id, b.id, c.id]);
    expect(items.find((i) => i.id === b.id)).toMatchObject({ mergedInto: a.id, status: "archivé" });
    const files = seriesMedia([media("m1", a.id), media("m2", b.id), media("m3", c.id), media("x", shot.id)], target);
    expect(files.map((m) => m.id).sort()).toEqual(["m1", "m2", "m3"]);
  });
  it("ne mélange pas photos et vidéos de modules différents, ignore soi-même", () => {
    expect(mergeIntoSeries([a, shot], a.id, [shot.id])).toBeNull();
    expect(mergeIntoSeries([a, b], a.id, [a.id])).toBeNull();
  });
  it("emporte les angles d'une série regroupée dans une autre", () => {
    const step1 = mergeIntoSeries([a, b, c], b.id, [c.id])!;
    const step2 = mergeIntoSeries(step1, a.id, [b.id])!;
    expect(angleOwners(step2.find((i) => i.id === a.id)!)).toEqual([a.id, b.id, c.id]);
  });
  it("détache un angle qui redevient une pose visible", () => {
    const merged = mergeIntoSeries([a, b], a.id, [b.id])!;
    const back = detachFromSeries(merged, a.id, b.id);
    expect(back.find((i) => i.id === b.id)).toMatchObject({ mergedInto: "", status: "prévu" });
    expect(angleOwners(back.find((i) => i.id === a.id)!)).toEqual([a.id]);
  });
  it("valide les angles et termine la série quand tous sont pris", () => {
    let item = toggleAngle(a, "m1", 2);
    expect([...doneAngles(item)]).toEqual(["m1"]);
    expect(item.status).toBe("prévu");
    item = toggleAngle(item, "m2", 2);
    expect(item.status).toBe("terminé");
    item = toggleAngle(item, "m2", 2);
    expect(item.status).toBe("prévu");
  });
});
