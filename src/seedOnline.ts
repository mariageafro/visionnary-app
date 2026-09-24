import type { Item, Project, Workspace } from "./types";
import { makeItem, newProject } from "./model";
import { importMedia } from "./media";

/** Plan vidéo Andy & Maeva embarqué dans le site : missions du teaser (vignettes) + références Resolve. Chargé à la demande par le lien #/charger/andy-maeva. */
const BASE = "seed/andy-maeva-7k2q/";
interface SeqClip { code: string; mission: string; folder: string; rank: number; n: number; dur: number; old: string; must: boolean; thumb: string }
interface RefClip { code: string; index: number; title: string; stage: string; category: string; subject?: string; description?: string; movement?: string; framing?: string; effect?: string; drone?: boolean; priority: string; tags?: string; analysis_confidence?: string; source_video?: string; source_in?: string; source_out?: string; duration_s?: number; thumb: string }
interface PoseSeed { id: string; title: string; section: string; subject: string; person: string; framing: string; favorite: boolean; essential: boolean; notes: string; images: string[] }
interface Plan { couple: string; sequence: SeqClip[]; refs: RefClip[]; poses?: PoseSeed[] }
const POSE_ORDER = ["Choix de Maeva ★", "Préparatifs mariée", "Accessoires & détails", "Demoiselles d’honneur", "Préparatifs marié", "Garçons d’honneur", "Cortège", "Cérémonie", "Couple", "Photos de groupe", "Vin d'honneur", "Réception & détails", "Entrées", "Danse & soirée", "Gâteau"];

const fileFrom = async (path: string, name: string) => {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error("Vignette introuvable : " + path);
  return new File([await res.blob()], name, { type: "image/jpeg" });
};

export async function loadAndyMaevaPlan(w: Workspace, progress: (done: number, total: number) => void): Promise<{ workspace: Workspace; projectId: string; created: boolean }> {
  const existing = w.projects.find((p) => !p.library && p.couple === "Andy & Maeva" && p.items.some((i) => i.refSet === "teaser"));
  const plan = (await (await fetch(BASE + "plan.json")).json()) as Plan;
  if (existing) {
    if (existing.items.some((i) => i.module === "poses") || !plan.poses?.length) return { workspace: { ...w, activeProjectId: existing.id }, projectId: existing.id, created: false };
    const more: Item[] = [];
    await addPoses(existing, plan.poses, more, () => undefined);
    const upgraded: Project = { ...existing, items: [...existing.items, ...more], poseSections: poseSections(plan.poses) };
    return { workspace: { ...w, activeProjectId: existing.id, projects: w.projects.map((x) => (x.id === existing.id ? upgraded : x)) }, projectId: existing.id, created: true };
  }
  const p: Project = newProject("Andy & Maeva · 24 septembre 2026");
  p.couple = "Andy & Maeva";
  p.date = "2026-09-24";
  p.status = "en préparation";
  p.services = "Photo + vidéo";
  const items: Item[] = [];
  ["Trude|Photographe|Sony A7|35-150 mm ; 24-70 mm (cérémonie religieuse)", "Mauricet|Réalisation / direction||", "Serge|Cadreur||", "Jole|Cadreur||"].forEach((row, n) => {
    const [title, role, camera, lenses] = row.split("|");
    items.push(makeItem("team", title, { role, mission: role, order: n, ...(camera ? { camera, lenses } : {}) }));
  });
  const total = plan.sequence.length + plan.refs.length + (plan.poses?.reduce((n, x) => n + x.images.length, 0) ?? 0);
  let done = 0;
  const add = async (item: Item, thumb: string, name: string) => {
    if (thumb) {
      const media = await importMedia(await fileFrom(thumb, name + ".jpg"), p.id, item.id);
      item.coverId = media.id;
    }
    items.push(item);
    progress(++done, total);
  };
  for (const c of plan.sequence) {
    await add(makeItem("inspirations", `${c.mission.replace(/^\d+ · /, "")} · plan ${c.rank}`, {
      order: items.length, refSource: "couple", refSet: "teaser", refCode: c.code, refStage: c.mission, category: c.mission.replace(/^\d+ · /, ""), status: "à faire", priority: c.must ? "MUST HAVE" : "IMPORTANT",
      notes: `Plan ${c.rank} de la mission. Dans le teaser à la position ${c.n} (${c.dur} s). Fichier sur le Mac : ${c.folder}/${c.folder.split("_")[0]}-${String(c.rank).padStart(3, "0")}__seq${String(c.n).padStart(5, "0")}__${c.dur}s.mov`,
      packKey: "seed:" + c.code, movement: "À confirmer", confidence: "à confirmer", srcIn: "", srcOut: "", dur: c.dur,
    }), c.thumb, c.code);
  }
  for (const c of plan.refs) {
    await add(makeItem("inspirations", c.title, {
      order: items.length, refSource: "couple", refSet: "resolve", refCode: c.code, refStage: c.stage, category: c.category, subject: c.subject ?? "", framing: c.framing && c.framing !== "À confirmer" ? c.framing : "", movement: c.movement ?? "À confirmer", effect: c.effect ?? "", drone: c.drone === true, tags: c.tags ?? "",
      priority: c.priority, status: "à faire", notes: c.description ?? "", confidence: c.analysis_confidence ?? "à confirmer", refVideo: c.source_video ?? "", srcIn: c.source_in ?? "", srcOut: c.source_out ?? "", dur: c.duration_s ?? 0, packKey: "seed:" + c.code,
    }), c.thumb, c.code);
  }
  if (plan.poses?.length) {
    await addPoses(p, plan.poses, items, () => progress(++done, total));
    p.poseSections = poseSections(plan.poses);
  }
  p.items = items;
  return { workspace: { ...w, projects: [...w.projects, p], activeProjectId: p.id }, projectId: p.id, created: true };
}

const poseSections = (poses: PoseSeed[]) => POSE_ORDER.filter((t) => poses.some((x) => x.section === t)).map((title, order) => ({ id: crypto.randomUUID(), title, order }));

/** Poses du photographe : une pose par entrée, ses images sont ses angles (fichiers propres à la pose). */
async function addPoses(p: Project, poses: PoseSeed[], into: Item[], tick: () => void) {
  const base = into.filter((i) => i.module === "poses").length;
  for (const [n, pose] of poses.entries()) {
    const item = makeItem("poses", pose.title, {
      order: base + n, category: pose.section, subjectGroup: pose.subject, packKey: "seed-pose:" + pose.id,
      ...(pose.person ? { person: pose.person } : {}), ...(pose.framing ? { framing: pose.framing } : {}),
      ...(pose.favorite ? { favorite: true } : {}), ...(pose.essential ? { priority: "MUST HAVE" } : {}), notes: pose.notes && !pose.notes.startsWith("Référence") ? pose.notes : "",
    });
    for (const [k, img] of pose.images.entries()) {
      const media = await importMedia(await fileFrom(img, `${pose.id}-${k + 1}.jpg`), p.id, item.id);
      if (k === 0) item.coverId = media.id;
      tick();
    }
    into.push(item);
  }
}
