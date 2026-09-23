import { describe, expect, it } from "vitest";
import { elementsFitPhoto, photoPlanSize } from "../src/scene/background";
import { makePerson } from "../src/scene/ops";

describe("cadre d’une photo de scène", () => {
  it("respecte les ratios horizontal et vertical sans déformer la photo", () => {
    expect(photoPlanSize(24, 16, 1920, 1080)).toEqual({ width: 24, height: 13.5 });
    expect(photoPlanSize(24, 16, 1080, 1920)).toEqual({ width: 9, height: 16 });
    expect(photoPlanSize(24, 16, 0, 1920)).toBeUndefined();
  });

  it("refuse de rétrécir le cadre si une personne serait coupée", () => {
    expect(elementsFitPhoto([makePerson("mariee", { x: 8, y: 8 })], 9, 16)).toBe(true);
    expect(elementsFitPhoto([makePerson("mariee", { x: 10, y: 8 })], 9, 16)).toBe(false);
  });
});
