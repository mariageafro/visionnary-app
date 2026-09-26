import type { Item, Project, Workspace } from "./types";
import { makeItem, newProject } from "./model";
import { importMedia } from "./media";
import { deleteMedia, listMedia } from "./storage";

/** Plan Andy & Maeva embarqué dans le site : poses photo, missions du teaser (vignettes) et références Resolve. Chargé à la demande (#/charger/andy-maeva[/photo]). */
const BASE = "seed/andy-maeva-7k2q/";
interface SeqClip { code: string; mission: string; folder: string; rank: number; n: number; dur: number; old: string; must: boolean; thumb: string }
interface RefClip { code: string; index: number; title: string; stage: string; category: string; subject?: string; description?: string; movement?: string; framing?: string; effect?: string; drone?: boolean; priority: string; tags?: string; analysis_confidence?: string; source_video?: string; source_in?: string; source_out?: string; duration_s?: number; thumb: string }
interface PoseExport { poses: Record<string, string | number | boolean>[]; media: { id: string; itemId: string; name: string }[]; sections: { id: string; title: string; order: number; parentId?: string; hidden?: boolean }[] }
interface PoseSeed { id: string; title: string; section: string; subject: string; person: string; framing: string; favorite: boolean; essential: boolean; notes: string; images: string[] }
interface Plan { syncTopic?: string; couple: string; sequence: SeqClip[]; refs: RefClip[]; poses?: PoseSeed[]; poseSections?: { title: string; order: number; parent?: string; hidden?: boolean }[] }

const fileFrom = async (path: string, name: string) => {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error("Vignette introuvable : " + path);
  return new File([await res.blob()], name, { type: "image/jpeg" });
};

/** Exécute les tâches par lots parallèles (le téléchargement des vignettes est le goulot). */
async function pool<T>(tasks: T[], run: (t: T) => Promise<void>, size = 8) {
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => { while (next < tasks.length) await run(tasks[next++]); }));
}

export type SeedPart = "photo" | "video";

export async function loadAndyMaevaPlan(w: Workspace, part: SeedPart, progress: (done: number, total: number) => void): Promise<{ workspace: Workspace; created: boolean }> {
  const plan = (await (await fetch(BASE + "plan.json")).json()) as Plan;
  const existing = w.projects.find((p) => !p.library && p.couple === "Andy & Maeva" && p.items.some((i) => String(i.packKey ?? "").startsWith("seed")));
  const p: Project = existing ? { ...existing, items: [...existing.items] } : newProject("Andy & Maeva · 24 septembre 2026");
  if (!existing) {
    p.couple = "Andy & Maeva";
    p.date = "2026-09-24";
    p.status = "en préparation";
    p.services = "Photo + vidéo";
    ["Trude|Photographe|Sony A7|35-150 mm ; 24-70 mm (cérémonie religieuse)", "Mauricet|Réalisation / direction||", "Serge|Cadreur||", "Jole|Cadreur||"].forEach((row, n) => {
      const [title, role, camera, lenses] = row.split("|");
      p.items.push(makeItem("team", title, { role, mission: role, order: n, ...(camera ? { camera, lenses } : {}), packKey: "seed-team:" + title }));
    });
  }
  let topicAdded = false;
  if (plan.syncTopic && !p.syncTopic) { p.syncTopic = plan.syncTopic; topicAdded = true; }
  const has = (prefix: string) => p.items.some((i) => String(i.packKey ?? "").startsWith(prefix));
  const jobs: { item: Item; path: string; name: string; old?: string }[] = [];
  let pendingRemap: (() => void) | undefined;
  const fresh: Item[] = [];
  const mediaMap = new Map<string, string>();
  const firstMedia = new Map<string, string>();
  if (part === "photo" && !p.items.some((i) => i.seedV === "3")) {
    const full = (await (await fetch(BASE + "poses.json")).json()) as PoseExport;
    // Anciennes versions du chargement (poses masquées absentes, sans favoris) : on les remplace proprement.
    const old = new Set(p.items.filter((i) => /^seed-pose2?:/.test(String(i.packKey ?? ""))).map((i) => i.id));
    if (old.size) {
      for (const m of await listMedia(p.id)) if (old.has(m.itemId)) await deleteMedia(m.id);
      p.items = p.items.filter((i) => !old.has(i.id));
    }
    const ids = new Map(full.poses.map((x) => [String(x.id), crypto.randomUUID()]));
    const remap = (v: unknown, map: Map<string, string>) => String(v ?? "").split(",").map((x) => map.get(x) ?? "").filter(Boolean).join(",");
    full.poses.forEach((pose) => {
      const { id: oid, ...fields } = pose;
      const item = { ...makeItem("poses", String(fields.title)), ...fields, id: ids.get(String(oid))!, packKey: "seed-pose2:" + oid, seedV: "3" } as Item;
      if (item.mergedInto) item.mergedInto = ids.get(String(item.mergedInto)) ?? "";
      if (item.includes) item.includes = remap(item.includes, ids);
      fresh.push(item);
    });
    const byId = new Map(fresh.map((i) => [i.id, i]));
    full.media.forEach((m) => jobs.push({ item: byId.get(ids.get(m.itemId)!)!, path: "ph/" + m.id + ".jpg", name: m.name || m.id + ".jpg", old: m.id }));
    const secIds = new Map(full.sections.map((d) => [d.id, crypto.randomUUID()]));
    p.poseSections = full.sections.map((d) => ({ id: secIds.get(d.id)!, title: d.title, order: d.order, ...(d.hidden ? { hidden: true } : {}), ...(d.parentId && secIds.get(d.parentId) ? { parentId: secIds.get(d.parentId) } : {}) }));
    pendingRemap = () => fresh.forEach((i) => {
      i.coverId = (i.coverId && mediaMap.get(String(i.coverId))) || firstMedia.get(i.id);
      if (i.angleOrder) i.angleOrder = remap(i.angleOrder, mediaMap);
      if (i.angleHidden) i.angleHidden = remap(i.angleHidden, mediaMap);
    });
  }
  if (part === "video" && !has("seed:")) {
    plan.sequence.forEach((c) => {
      const item = makeItem("inspirations", `${c.mission.replace(/^\d+ · /, "")} · plan ${c.rank}`, {
        order: fresh.length, refSource: "couple", refSet: "teaser", refCode: c.code, refStage: c.mission, category: c.mission.replace(/^\d+ · /, ""), status: "à faire", priority: c.must ? "MUST HAVE" : "IMPORTANT",
        notes: `Plan ${c.rank} de la mission. Dans le teaser à la position ${c.n} (${c.dur} s). Fichier sur le Mac : ${c.folder}/${c.folder.split("_")[0]}-${String(c.rank).padStart(3, "0")}__seq${String(c.n).padStart(5, "0")}__${c.dur}s.mov`,
        packKey: "seed:" + c.code, movement: "À confirmer", confidence: "à confirmer", dur: c.dur,
      });
      if (c.thumb) jobs.push({ item, path: c.thumb, name: c.code + ".jpg" });
      fresh.push(item);
    });
    plan.refs.forEach((c) => {
      const item = makeItem("inspirations", c.title, {
        order: fresh.length, refSource: "couple", refSet: "resolve", refCode: c.code, refStage: c.stage, category: c.category, subject: c.subject ?? "", framing: c.framing && c.framing !== "À confirmer" ? c.framing : "", movement: c.movement ?? "À confirmer", effect: c.effect ?? "", drone: c.drone === true, tags: c.tags ?? "",
        priority: c.priority, status: "à faire", notes: c.description ?? "", confidence: c.analysis_confidence ?? "à confirmer", refVideo: c.source_video ?? "", srcIn: c.source_in ?? "", srcOut: c.source_out ?? "", dur: c.duration_s ?? 0, packKey: "seed:" + c.code,
      });
      if (c.thumb) jobs.push({ item, path: c.thumb, name: c.code + ".jpg" });
      fresh.push(item);
    });
  }
  if (!fresh.length) return { workspace: { ...w, activeProjectId: p.id, projects: existing ? w.projects.map((x) => (x.id === p.id ? p : x)) : [...w.projects, p] }, created: !existing || topicAdded };
  let done = 0;
  await pool(jobs, async (job) => {
    const media = await importMedia(await fileFrom(job.path, job.name), p.id, job.item.id);
    if (job.old) { mediaMap.set(job.old, media.id); if (!firstMedia.has(job.item.id)) firstMedia.set(job.item.id, media.id); }
    else if (!job.item.coverId) job.item.coverId = media.id;
    progress(++done, jobs.length);
  });
  pendingRemap?.();
  p.items.push(...fresh);
  return { workspace: { ...w, activeProjectId: p.id, projects: existing ? w.projects.map((x) => (x.id === p.id ? p : x)) : [...w.projects, p] }, created: true };
}
