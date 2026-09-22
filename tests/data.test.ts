import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { importWorkspace, validateWorkspace, csvCell, workspaceArchive } from "../src/exports";
import { putMedia, getMedia, deleteMedia, saveWorkspace, loadWorkspace } from "../src/storage";
import type { Workspace } from "../src/types";
const blank: Workspace = {
  schemaVersion: 1,
  projects: [],
  presets: [],
  activeProjectId: "",
  revision: 0,
  updatedAt: "2026-09-22",
};
describe("sauvegardes", () => {
  it("valide le schéma et refuse les références orphelines", () => {
    expect(validateWorkspace(blank)).toEqual(blank);
    expect(() => validateWorkspace({ ...blank, schemaVersion: 2 })).toThrow();
    expect(() => validateWorkspace({ ...blank, activeProjectId: "absent" })).toThrow();
    expect(() => validateWorkspace({ ...blank, revision: -1 })).toThrow();
  });
  it("neutralise les formules CSV et conserve les guillemets", () => {
    expect(csvCell("=SUM(A1)")).toBe('"\'=SUM(A1)"');
    expect(csvCell("  @cmd")).toBe('"\'  @cmd"');
    expect(csvCell('un "plan"')).toBe('"un ""plan"""');
  });
  it("refuse une archive incohérente sans écraser les données", async () => {
    await saveWorkspace(blank);
    const zip = new JSZip();
    zip.file("workspace.json", JSON.stringify({ ...blank, revision: 9 }));
    zip.file(
      "media.json",
      JSON.stringify([
        { id: "m", projectId: "absent", itemId: "", name: "x", type: "image/png", size: 1, path: "media/0" },
      ]),
    );
    zip.file("media/0", "x");
    const file = new File([await zip.generateAsync({ type: "uint8array" })], "backup.zip");
    await expect(importWorkspace(file)).rejects.toThrow("projet média absent");
    expect(await loadWorkspace()).toEqual(blank);
  });
  it("persiste les données et les fichiers binaires", async () => {
    await saveWorkspace(blank);
    expect(await loadWorkspace()).toEqual(blank);
    const blob = new Blob(["image-test"], { type: "image/png" });
    await putMedia({
      id: "test-media",
      projectId: "p",
      itemId: "",
      name: "test.png",
      type: blob.type,
      size: blob.size,
      blob,
    });
    const stored = await getMedia("test-media");
    expect(await stored?.blob.text()).toBe("image-test");
    await deleteMedia("test-media");
    expect(await getMedia("test-media")).toBeUndefined();
  });
});

describe("photo de couverture dans les sauvegardes", () => {
  const project = (id: string, coverId?: string) => ({
    id, name: "Andy & Maeva", date: "2026-10-24", venue: "", couple: "", style: "", status: "en préparation",
    guests: 0, mustHave: "", avoid: "", priorities: "", items: [], placements: [], createdAt: "", updatedAt: "",
    ...(coverId ? { coverId } : {}),
  });
  it("inclut la couverture (média rattaché au tournage) et la restaure", async () => {
    const blob = new Blob(["couverture"], { type: "image/jpeg" });
    await putMedia({ id: "cover-1", projectId: "p1", itemId: "p1", name: "couple.jpg", type: blob.type, size: blob.size, blob });
    const workspace = { ...blank, projects: [project("p1", "cover-1")], activeProjectId: "p1" } as Workspace;
    const archive = await workspaceArchive(workspace);
    const restored = await importWorkspace(new File([archive], "sauvegarde.zip"));
    expect(restored.projects[0].coverId).toBe("cover-1");
    expect(await (await getMedia("cover-1"))?.blob.text()).toBe("couverture");
  });
  it("restaure une ancienne sauvegarde dont la couverture manquait, sans la refuser", async () => {
    const zip = new JSZip();
    zip.file("workspace.json", JSON.stringify({ ...blank, projects: [project("p2", "perdue")], activeProjectId: "p2" }));
    zip.file("media.json", "[]");
    const file = new File([await zip.generateAsync({ type: "uint8array" })], "ancienne.zip");
    const restored = await importWorkspace(file);
    expect(restored.projects[0].name).toBe("Andy & Maeva");
    expect(restored.projects[0].coverId).toBeUndefined();
  });
});

describe("médias cités après suppression de leur élément", () => {
  it("garde dans l'archive un média encore cité par un plan, détaché de l'élément supprimé", async () => {
    const blob = new Blob(["image"], { type: "image/jpeg" });
    await putMedia({ id: "orphelin-cite", projectId: "p3", itemId: "plan-supprime", name: "ref.jpg", type: blob.type, size: blob.size, blob });
    await putMedia({ id: "orphelin-seul", projectId: "p3", itemId: "autre-supprime", name: "x.jpg", type: blob.type, size: blob.size, blob });
    const copy = { id: "copie", module: "shots", title: "Copie", status: "prévu", priority: "IMPORTANT", notes: "", order: 0, sourceMediaId: "orphelin-cite" };
    const project = {
      id: "p3", name: "Test", date: "", venue: "", couple: "", style: "", status: "", guests: 0, mustHave: "", avoid: "", priorities: "",
      items: [copy], placements: [], createdAt: "", updatedAt: "",
    };
    const archive = await workspaceArchive({ ...blank, projects: [project], activeProjectId: "p3" } as Workspace);
    const restored = await importWorkspace(new File([archive], "sauvegarde.zip"));
    expect(restored.projects[0].items[0].sourceMediaId).toBe("orphelin-cite");
    expect((await getMedia("orphelin-cite"))?.itemId).toBe("");
    expect(await getMedia("orphelin-seul")).toBeUndefined();
  });
});
