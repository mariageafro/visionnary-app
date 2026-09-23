import { describe, expect, it } from "vitest";
import { MODEL_3D_LIMIT, model3dFormat, model3dImportError } from "../src/scene/model3d";
import { clonePlan, newPlan } from "../src/scene/ops";

describe("modèle 3D local du plan", () => {
  it("accepte GLB et OBJ autonomes, avec une limite explicite", () => {
    expect(model3dFormat("Église.GLB")).toBe("glb");
    expect(model3dFormat("salle.obj")).toBe("obj");
    expect(model3dFormat("salle.gltf")).toBeNull();
    expect(model3dImportError({ name: "salle.obj", size: 10_000 })).toBeNull();
    expect(model3dImportError({ name: "salle.obj", size: MODEL_3D_LIMIT + 1 })).toContain("100 Mo");
    expect(model3dImportError({ name: "salle.glb", size: 0 })).toContain("vide");
  });

  it("conserve le modèle dans une copie du même tournage et le détache d’une copie sans médias", () => {
    const plan = newPlan("Église", { model3dId: "modèle-local", background: { mediaId: "capture", x: 0, y: 0, w: 24, opacity: 1 } });
    expect(clonePlan(plan, new Map(), true).model3dId).toBe("modèle-local");
    expect(clonePlan(plan).model3dId).toBeUndefined();
  });
});
