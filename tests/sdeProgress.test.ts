import { describe, expect, it } from "vitest";
import { makeItem } from "../src/model";
import { sdeProgress } from "../src/screens/sdeProgress";

describe("progression Same-Day Edit", () => {
  it("compte les essentiels tournés, les médias locaux et bloque tant qu’un élément manque", () => {
    const a = makeItem("shots", "Plan A", { sde: "indispensable", status: "tourné" });
    const b = makeItem("shots", "Plan B", { sde: "indispensable", status: "prévu" });
    const useful = makeItem("shots", "B-roll", { sde: "utile", status: "prévu" });
    const result = sdeProgress([a, b, useful], (shot) => shot.id === a.id, false, true);
    expect(result.captured.map((shot) => shot.id)).toEqual([a.id]);
    expect(result.withMedia.map((shot) => shot.id)).toEqual([a.id]);
    expect(result.missing.map((shot) => shot.id)).toEqual([b.id]);
    expect(result.canStart).toBe(false);
    expect(result.editReady).toBe(false);
  });

  it("permet de confirmer le montage prêt seulement lorsque tous les essentiels et la musique sont prêts", () => {
    const shot = makeItem("shots", "Plan essentiel", { sde: "indispensable", status: "excellent" });
    const result = sdeProgress([shot], () => true, true, true);
    expect(result.canStart).toBe(true);
    expect(result.editReady).toBe(true);
  });
});
