import type { Item, Project, Workspace } from "./types";
import { makeItem, newProject } from "./model";
import { importMedia } from "./media";
import { deleteMedia, listMedia } from "./storage";

/** Plan Andy & Maeva embarqué dans le site : poses photo, missions du teaser (vignettes) et références Resolve. Chargé à la demande (#/charger/andy-maeva[/photo]). */
const BASE = "seed/andy-maeva-7k2q/";
interface SeqClip { code: string; mission: string; folder: string; rank: number; n: number; dur: number; old: string; must: boolean; thumb: string }
interface RefClip { code: string; index: number; title: string; stage: string; category: string; subject?: string; description?: string; movement?: string; framing?: string; effect?: string; drone?: boolean; priority: string; tags?: string; analysis_confidence?: string; source_video?: string; source_in?: string; source_out?: string; duration_s?: number; thumb: string }
interface PoseSeed { id: string; title: string; section: string; subject: string; person: string; framing: string; favorite: boolean; essential: boolean; notes: string; images: string[] }
interface Plan { couple: string; sequence: SeqClip[]; refs: RefClip[]; poses?: PoseSeed[]; poseSections?: { title: string; order: number; parent?: string; hidden?: boolean }[] }
const POSE_ORDER = ["Choix de Maeva ★", "Préparatifs mariée", "Accessoires & détails", "Demoiselles d’honneur", "Préparatifs marié", "Garçons d’honneur", "Cortège", "Cérémonie", "Couple", "Photos de groupe", "Vin d'honneur", "Réception & détails", "Entrées", "Danse & soirée", "Gâteau"];

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
  const has = (prefix: string) => p.items.some((i) => String(i.packKey ?? "").startsWith(prefix));
  const jobs: { item: Item; path: string; name: string }[] = [];
  const fresh: Item[] = [];
  if (part === "photo" && plan.poses?.length && !has("seed-pose2:")) {
    // Ancienne version du chargement (avec des poses masquées) : on la remplace proprement.
    const old = new Set(p.items.filter((i) => String(i.packKey ?? "").startsWith("seed-pose:")).map((i) => i.id));
    if (old.size) {
      for (const m of await listMedia(p.id)) if (old.has(m.itemId)) await deleteMedia(m.id);
      p.items = p.items.filter((i) => !old.has(i.id));
    }
    plan.poses.forEach((pose, n) => {
      const item = makeItem("poses", pose.title, {
        order: n, category: pose.section, subjectGroup: pose.subject, packKey: "seed-pose2:" + pose.id,
        ...(pose.person ? { person: pose.person } : {}), ...(pose.framing ? { framing: pose.framing } : {}),
        ...(pose.favorite ? { favorite: true } : {}), ...(pose.essential ? { priority: "MUST HAVE" } : {}), notes: pose.notes && !pose.notes.startsWith("Référence") ? pose.notes : "",
      });
      pose.images.forEach((img, k) => jobs.push({ item, path: img, name: `${pose.id}-${k + 1}.jpg` }));
      fresh.push(item);
    });
    const defs: { title: string; order: number; parent?: string }[] = (plan.poseSections ?? POSE_ORDER.map((title, order) => ({ title, order }))).filter((d) => plan.poses!.some((x) => x.section === d.title) || (plan.poseSections ?? []).some((c) => c.parent === d.title));
    const ids = new Map(defs.map((d) => [d.title, crypto.randomUUID()]));
    p.poseSections = defs.map((d) => ({ id: ids.get(d.title)!, title: d.title, order: d.order, ...(d.parent && ids.get(d.parent) ? { parentId: ids.get(d.parent) } : {}) }));
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
  if (!fresh.length) return { workspace: { ...w, activeProjectId: p.id, projects: existing ? w.projects.map((x) => (x.id === p.id ? p : x)) : [...w.projects, p] }, created: !existing };
  let done = 0;
  await pool(jobs, async (job) => {
    const media = await importMedia(await fileFrom(job.path, job.name), p.id, job.item.id);
    if (!job.item.coverId) job.item.coverId = media.id;
    progress(++done, jobs.length);
  });
  p.items.push(...fresh);
  return { workspace: { ...w, activeProjectId: p.id, projects: existing ? w.projects.map((x) => (x.id === p.id ? p : x)) : [...w.projects, p] }, created: true };
}
