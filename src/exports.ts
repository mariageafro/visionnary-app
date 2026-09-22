import JSZip from "jszip";
import type { Workspace, Project, MediaEntry } from "./types";
import { listMedia, restoreWorkspace } from "./storage";
import { itemRelations, mediaReferenceKeys, modules as moduleDefinitions } from "./model";
const MAX_BYTES = 250 * 1024 * 1024;
const modules = new Set(moduleDefinitions.map(m => m.id as string));
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Sauvegarde invalide : ${message}`);
}
function object(value: unknown): asserts value is Record<string, unknown> {
  assert(value && typeof value === "object" && !Array.isArray(value), "objet attendu");
}
function strings(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) assert(typeof value[key] === "string", `champ ${key}`);
}
export function validateWorkspace(value: unknown): Workspace {
  object(value);
  assert(value.schemaVersion === 1, "version incompatible");
  assert(Array.isArray(value.projects) && value.projects.length <= 1000, "projets");
  assert(Array.isArray(value.presets) && value.presets.length <= 1000, "presets");
  strings(value, ["activeProjectId", "updatedAt"]);
  assert(Number.isSafeInteger(value.revision) && Number(value.revision) >= 0, "révision");
  const ids = new Set<string>();
  const items = (entries: unknown) => {
    assert(Array.isArray(entries) && entries.length <= 20000, "éléments");
    const ids = new Set<string>();
    for (const item of entries) {
      object(item);
      strings(item, ["id", "module", "title", "status", "priority", "notes"]);
      assert(item.id && !ids.has(String(item.id)), "identifiant élément dupliqué");
      ids.add(String(item.id));
      assert(modules.has(String(item.module)), "module inconnu");
      assert(Number.isFinite(item.order), "ordre");
      for (const v of Object.values(item))
        assert(
          v === undefined ||
            typeof v === "string" ||
            typeof v === "boolean" ||
            (typeof v === "number" && Number.isFinite(v)),
          "valeur élément",
        );
    }
    for (const item of entries) {
      for (const [key, target] of Object.entries(itemRelations)) {
        const ref = item[key];
        if (ref !== undefined && ref !== "") {
          assert(typeof ref === "string", "référence " + key);
          assert(
            entries.some((other) => other.id === ref && (!target || other.module === target)),
            "référence " + key + " absente ou incompatible",
          );
        }
      }
    }
  };
  for (const project of value.projects) {
    object(project);
    strings(project, [
      "id",
      "name",
      "date",
      "venue",
      "couple",
      "style",
      "status",
      "mustHave",
      "avoid",
      "priorities",
      "createdAt",
      "updatedAt",
    ]);
    assert(project.id && !ids.has(String(project.id)), "identifiant projet dupliqué");
    ids.add(String(project.id));
    assert(Number.isFinite(project.guests) && Number(project.guests) >= 0, "invités");
    items(project.items);
    assert(project.coverId === undefined || typeof project.coverId === "string", "couverture");
    // Une étape supprimée peut laisser un horaire orphelin : il est ignoré, pas bloquant.
    assert(
      project.moments === undefined ||
        (!!project.moments &&
          typeof project.moments === "object" &&
          !Array.isArray(project.moments) &&
          Object.values(project.moments).every((t) => typeof t === "string" && /^\d{2}:\d{2}$/.test(t))),
      "horaires des moments",
    );
    if (project.scenePlans !== undefined) {
      assert(Array.isArray(project.scenePlans) && project.scenePlans.length <= 500, "plans de scène");
      const planIds = new Set();
      for (const plan of project.scenePlans) {
        object(plan);
        strings(plan, ["id", "name"]);
        assert(!planIds.has(plan.id), "plan de scène dupliqué");
        planIds.add(plan.id);
        for (const key of ["width", "height", "duration"]) assert(Number.isFinite(plan[key]) && Number(plan[key]) >= 0, `plan de scène ${key}`);
        assert(Array.isArray(plan.cues), "repères de timeline");
        assert(Array.isArray(plan.elements) && plan.elements.length <= 5000, "éléments de scène");
        const elementIds = new Set();
        for (const el of plan.elements) {
          object(el);
          strings(el, ["id", "kind", "name", "layer"]);
          assert(!elementIds.has(el.id), "élément de scène dupliqué");
          elementIds.add(el.id);
          for (const key of ["x", "y", "rotation"]) assert(Number.isFinite(el[key]), `élément de scène ${key}`);
          if (el.motion !== undefined) {
            object(el.motion);
            assert(typeof el.motion.type === "string" && Number.isFinite(el.motion.start) && Number.isFinite(el.motion.duration), "mouvement");
          }
        }
      }
    }
    assert(Array.isArray(project.placements) && project.placements.length <= 10000, "placements");
    const placementIds = new Set();
    for (const p of project.placements) {
      object(p);
      strings(p, ["id", "type", "label", "color", "operator", "focal"]);
      assert(p.id && !placementIds.has(p.id), "placement dupliqué");
      placementIds.add(p.id);
      for (const key of ["x", "y", "endX", "endY", "angle", "duration"])
        assert(Number.isFinite(p[key]), `placement ${key}`);
    }
  }
  assert(value.activeProjectId === "" || ids.has(String(value.activeProjectId)), "projet actif absent");
  const presetIds = new Set();
  for (const preset of value.presets) {
    object(preset);
    strings(preset, ["id", "name", "description"]);
    assert(preset.id && !presetIds.has(preset.id), "preset dupliqué");
    presetIds.add(preset.id);
    assert(preset.custom === undefined || typeof preset.custom === "boolean", "preset custom");
    assert(preset.kind === undefined || preset.kind === "tournage" || preset.kind === "étape", "type de preset");
    items(preset.items);
  }
  return value as unknown as Workspace;
}
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const filename = (name: string) => name.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 80) || "visionnary";
/**
 * Ce à quoi un média peut être rattaché : un élément, ou le tournage lui-même (photo de couverture).
 * Un média dont le propriétaire n'existe plus est un orphelin : il reste hors des sauvegardes.
 */
export function mediaOwners(project: Project): Set<string> {
  return new Set([project.id, ...project.items.map((i) => i.id), ...(project.scenePlans ?? []).map((s) => s.id)]);
}
export async function exportWorkspace(workspace: Workspace): Promise<void> {
  downloadBlob(await workspaceArchive(workspace), "visionnary-sauvegarde.zip");
}
/** Archive restaurable : workspace.json, media.json et les fichiers (originaux + miniatures). */
export async function workspaceArchive(workspace: Workspace): Promise<Blob> {
  validateWorkspace(workspace);
  const zip = new JSZip();
  zip.file("workspace.json", JSON.stringify(workspace, null, 2));
  const owners = new Map(workspace.projects.map((p) => [p.id, mediaOwners(p)]));
  // Un média encore cité par un élément (clip, copie d'étape) reste dans l'archive même si
  // l'élément qui l'a importé a été supprimé : il y est alors détaché (sans propriétaire).
  const cited = new Set(
    workspace.projects
      .flatMap((p) => [
        p.coverId,
        ...p.items.flatMap((i) => mediaReferenceKeys.map((k) => i[k])),
        // Fonds de plan et références épinglées sur les caméras.
        ...(p.scenePlans ?? []).flatMap((s) => [s.background?.mediaId, ...s.elements.map((e) => e.referenceId)]),
      ])
      .filter(Boolean)
      .map(String),
  );
  const media = (await listMedia())
    .filter((m) => owners.has(m.projectId) && (!m.itemId || owners.get(m.projectId)!.has(m.itemId) || cited.has(m.id)))
    .map((m) => (!m.itemId || owners.get(m.projectId)!.has(m.itemId) ? m : { ...m, itemId: "" }));
  const estimatedBytes = new TextEncoder().encode(JSON.stringify(workspace)).byteLength + media.reduce((sum,m)=>sum+m.blob.size+(m.thumbnail?.size||0)+2048,0);
  if (estimatedBytes > MAX_BYTES - 1024 * 1024) throw new Error("Pack supérieur à 250 Mo : allégez les vidéos de référence avant l’export. Les fichiers originaux restent sur cet appareil.");
  const manifest = [];
  for (const [index, m] of media.entries()) {
    const path = `media/${index}`;
    zip.file(path, await m.blob.arrayBuffer());
    const thumbnailPath = m.thumbnail ? `${path}-thumb` : undefined;
    if (m.thumbnail && thumbnailPath) zip.file(thumbnailPath, await m.thumbnail.arrayBuffer());
    manifest.push({
      id: m.id,
      projectId: m.projectId,
      itemId: m.itemId,
      name: m.name,
      type: m.type,
      size: m.size,
      path,
      thumbnailPath,
      width: m.width, height: m.height, duration: m.duration, unsupported: m.unsupported,
    });
  }
  zip.file("media.json", JSON.stringify(manifest));
  return new Blob([await zip.generateAsync({ type: "uint8array" })], { type: "application/zip" });
}
export async function importWorkspace(file: File): Promise<Workspace> {
  assert(file.size <= MAX_BYTES, "fichier limité à 250 Mo");
  let workspace: Workspace;
  const media: MediaEntry[] = [];
  if (file.name.toLowerCase().endsWith(".json")) {
    workspace = validateWorkspace(JSON.parse(await file.text()));
    for (const p of workspace.projects) {
      delete p.coverId;
      for (const i of p.items)
        for (const key of Object.keys(i)) if (mediaReferenceKeys.includes(key)) delete i[key];
    }
  } else {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entries = Object.values(zip.files);
    assert(entries.length <= 10000, "trop de fichiers");
    let expanded = 0;
    for (const entry of entries) {
      assert(!entry.name.startsWith("/") && !entry.name.split("/").includes(".."), "chemin dangereux");
      const size =
        (entry as unknown as { _data?: { uncompressedSize: number } })._data?.uncompressedSize ?? 0;
      expanded += size;
      assert(expanded <= MAX_BYTES, "archive décompressée limitée à 250 Mo");
    }
    const data = zip.file("workspace.json");
    assert(data, "workspace.json absent");
    workspace = validateWorkspace(JSON.parse(await data.async("string")));
    const manifestFile = zip.file("media.json");
    assert(manifestFile, "media.json absent");
    const manifest: unknown = JSON.parse(await manifestFile.async("string"));
    assert(Array.isArray(manifest) && manifest.length <= 10000, "médias");
    const ids = new Set();
    for (const m of manifest) {
      object(m);
      strings(m, ["id", "projectId", "itemId", "name", "type", "path"]);
      assert(m.id && !ids.has(m.id), "média dupliqué");
      ids.add(m.id);
      const project = workspace.projects.find((p) => p.id === m.projectId);
      assert(project, "projet média absent");
      assert(m.itemId === "" || mediaOwners(project).has(String(m.itemId)), "élément média absent");
      assert(Number.isSafeInteger(m.size) && Number(m.size) >= 0, "taille média");
      assert(/^media\/[\w-]+$/.test(String(m.path)), "chemin média");
      const entry = zip.file(String(m.path));
      assert(entry, "fichier média absent");
      const bytes = await entry.async("arraybuffer");
      assert(bytes.byteLength === m.size, "taille média incohérente");
      let thumbnail: Blob | undefined;
      if (m.thumbnailPath !== undefined) {
        assert(typeof m.thumbnailPath === "string" && /^media\/[\w-]+$/.test(m.thumbnailPath), "miniature");
        const thumb = zip.file(m.thumbnailPath);
        assert(thumb, "miniature absente");
        thumbnail = new Blob([await thumb.async("arraybuffer")]);
      }
      media.push({
        id: String(m.id),
        projectId: String(m.projectId),
        itemId: String(m.itemId),
        name: String(m.name),
        type: String(m.type),
        size: Number(m.size),
        blob: new Blob([bytes], { type: String(m.type) }),
        thumbnail,
        ...(typeof m.width === 'number' && Number.isFinite(m.width) ? {width:m.width} : {}),
        ...(typeof m.height === 'number' && Number.isFinite(m.height) ? {height:m.height} : {}),
        ...(typeof m.duration === 'number' && Number.isFinite(m.duration) ? {duration:m.duration} : {}),
        ...(typeof m.unsupported === 'boolean' ? {unsupported:m.unsupported} : {}),
      });
    }
    for (const p of workspace.projects) {
      // Les sauvegardes antérieures au 22/09/2026 omettaient la couverture : on la retire au lieu de
      // refuser toute l'archive (le reste du tournage est intact).
      if (p.coverId && !media.some((m) => m.id === p.coverId && m.projectId === p.id)) delete p.coverId;
      for (const item of p.items)
        for (const key of mediaReferenceKeys)
          assert(
            !item[key] || media.some((m) => m.id === item[key] && m.projectId === p.id),
            "référence média absente",
          );
    }
  }
  await restoreWorkspace(workspace, media);
  return workspace;
}
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function exportProjectCSV(project: Project): void {
  const keys = [...new Set(project.items.flatMap((i) => Object.keys(i)))];
  const projectKeys = Object.keys(project).filter((k) => !["items", "placements"].includes(k));
  const rows = [
    ["PROJET", ...projectKeys],
    ["", ...projectKeys.map((k) => (project as unknown as Record<string, unknown>)[k])],
    [],
    ["ÉLÉMENTS", ...keys],
    ...project.items.map((i) => ["", ...keys.map((k) => i[k])]),
    [],
    [
      "PLACEMENTS",
      "id",
      "type",
      "label",
      "x",
      "y",
      "endX",
      "endY",
      "angle",
      "color",
      "operator",
      "focal",
      "duration",
    ],
    ...project.placements.map((p) => [
      "",
      p.id,
      p.type,
      p.label,
      p.x,
      p.y,
      p.endX,
      p.endY,
      p.angle,
      p.color,
      p.operator,
      p.focal,
      p.duration,
    ]),
  ];
  downloadBlob(
    new Blob(["\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
    `${filename(project.name)}.csv`,
  );
}
export function exportProjectJSON(project: Project): void {
  downloadBlob(
    new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }),
    `${filename(project.name)}.json`,
  );
}
export function projectEDL(project: Project): string {
  const tc = (frames: number) =>
    `${String(Math.floor(frames / 90000)).padStart(2, "0")}:${String(Math.floor(frames / 1500) % 60).padStart(2, "0")}:${String(Math.floor(frames / 25) % 60).padStart(2, "0")}:${String(frames % 25).padStart(2, "0")}`;
  let cursor = 90000;
  const lines = [
    "TITLE: VISIONNARY REPERAGE - PLACEHOLDERS SANS RUSHS",
    "FCM: NON-DROP FRAME",
    "* 25 FPS. DUREES PREVISIONNELLES. REMPLACER LES CLIPS AVANT MONTAGE.",
  ];
  project.items
    .filter((i) => i.module === "shots" && i.included === true)
    .sort((a, b) => Number(a.timelineOrder ?? a.order) - Number(b.timelineOrder ?? b.order))
    .forEach((shot, index) => {
      const duration = Math.round(Math.max(1, Math.min(3600, Number(shot.duration) || 5)) * 25);
      lines.push(
        `${String(index + 1).padStart(3, "0")}  AX       V     C        00:00:00:00 ${tc(duration)} ${tc(cursor)} ${tc(cursor + duration)}`,
        `* COMMENT: ${shot.title.replace(/[\r\n]/g, " ")} — PLACEHOLDER`,
      );
      cursor += duration;
    });
  return lines.join("\r\n");
}
export function exportEDL(project: Project): void {
  downloadBlob(
    new Blob([projectEDL(project)], { type: "text/plain" }),
    `${filename(project.name)}-reperage.edl`,
  );
}
