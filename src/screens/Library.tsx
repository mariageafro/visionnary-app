import { useMemo, useState } from "react";
import { Check, FolderOpen, Images, Plus, Trash2 } from "lucide-react";
import type { Item, Project } from "../types";
import { importMedia } from "../media";
import { deleteMedia, listMedia, putMedia } from "../storage";
import { uid, poseCategories } from "../model";
import { poseSectionTitles } from "../poseSections";
import { isPack, type Pack } from "../packImport";
import { libraryOf, newLibrary, planLibraryFromFolder, planLibraryFromPack, planUseFromLibrary, type LibraryEntry } from "../library";
import { useStore } from "../store";
import { Empty, Screen, Thumb, useMedia } from "../ui";
import { itemsOf, mediaFor } from "./common";
import "./library.css";

const IMAGE = /\.(jpe?g|png|webp|heic|mp4|mov|m4v|webm)$/i;

type Pending = { entries: LibraryEntry[]; files: Map<string, File>; alreadyThere: number; label: string };

/**
 * Bibliothèque de poses : photos et vidéos de référence classées par catégorie, réutilisables d'un
 * mariage à l'autre. On y importe un dossier, puis on pioche par catégorie pour créer les poses du tournage.
 */
export default function Library() {
  const { w, project, change, update, notify } = useStore();
  const library = libraryOf(w);
  const media = useMedia(library?.id ?? "__aucune__");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState("");
  const [section, setSection] = useState("auto");
  const [stageId, setStageId] = useState("");

  const items = library ? itemsOf(library, "poses") : [];
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(String(item.category || "Sans catégorie"), (counts.get(String(item.category || "Sans catégorie")) ?? 0) + 1);
    return [...counts];
  }, [items]);
  const shown = category ? items.filter((item) => String(item.category || "Sans catégorie") === category) : items;
  const picked = items.filter((item) => selected.includes(item.id));
  const sectionChoices = project ? [...new Set([...poseSectionTitles(project), ...poseCategories])] : [];
  const suggested = (item?: Item) => (item && typeof item.sectionHint === "string" && sectionChoices.includes(item.sectionHint) ? item.sectionHint : String(item?.category ?? "Sans catégorie"));
  const stages = project ? itemsOf(project, "stages") : [];

  async function chooseFiles(list: FileList | null, mode: "pack" | "dossier") {
    setMessage("");
    setPending(null);
    if (!list) return;
    const all = [...list];
    const byName = new Map(all.filter((f) => IMAGE.test(f.name)).map((f) => [f.name, f]));
    const holder = library ?? newLibrary();
    if (mode === "pack") {
      const manifest = all.find((f) => f.name === "manifest.json");
      if (!manifest) return setMessage("Aucun manifest.json : choisissez le dossier du pack.");
      try {
        const parsed: unknown = JSON.parse(await manifest.text());
        if (!isPack(parsed)) throw new Error("format");
        const plan = planLibraryFromPack(holder, parsed as Pack, new Set(byName.keys()));
        setPending({ ...plan, files: byName, label: `pack « ${(parsed as Pack).projet} »` });
      } catch {
        setMessage("Ce manifest.json n'est pas un pack valide.");
      }
      return;
    }
    const plan = planLibraryFromFolder(holder, [...byName.values()].map((f) => ({ name: f.name, path: f.webkitRelativePath || f.name, size: f.size })));
    const files = new Map<string, File>();
    for (const entry of plan.entries) {
      const file = all.find((f) => (f.webkitRelativePath || f.name) === (entry as { path?: string }).path);
      if (file) files.set(entry.file + "\u0000" + (entry as { path?: string }).path, file);
    }
    setPending({ entries: plan.entries, files, alreadyThere: plan.alreadyThere, label: "dossier" });
  }

  async function runImport() {
    if (!pending) return;
    const holder = library ?? newLibrary();
    const total = pending.entries.length;
    let done = 0;
    setProgress({ done, total });
    const added: Item[] = [];
    try {
      for (const entry of pending.entries) {
        const file = pending.files.get(entry.file) ?? pending.files.get(entry.file + "\u0000" + (entry as { path?: string }).path);
        if (!file) continue;
        const saved = await importMedia(file, holder.id, entry.item.id);
        added.push({ ...entry.item, coverId: saved.id });
        setProgress({ done: ++done, total });
      }
      const withItems: Project = { ...holder, items: [...holder.items, ...added], updatedAt: new Date().toISOString() };
      change({ ...w, projects: library ? w.projects.map((p) => (p.id === holder.id ? withItems : p)) : [...w.projects, withItems] }, `${added.length} éléments ajoutés à la bibliothèque`);
      setMessage(`Terminé : ${added.length} éléments ajoutés à la bibliothèque.`);
      setPending(null);
    } catch (e) {
      setMessage("Import interrompu : " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setProgress(null);
    }
  }

  async function use(group: boolean) {
    if (!project || !library || !picked.length) return;
    const target = section === "auto" ? suggested(picked[0]) : section;
    const plan = planUseFromLibrary(project, picked, { group, section: target, stageId: stageId || undefined });
    const libraryMedia = await listMedia(library.id);
    const created: Item[] = [];
    for (const item of plan.items) {
      let cover = "";
      for (const sourceId of plan.sources.get(item.id) ?? []) {
        for (const entry of libraryMedia.filter((m) => m.itemId === sourceId)) {
          const copy = { ...entry, id: uid(), projectId: project.id, itemId: item.id };
          await putMedia(copy);
          if (!cover) cover = copy.id;
        }
      }
      created.push(cover ? { ...item, coverId: cover } : item);
    }
    update({ ...project, items: [...project.items, ...created] }, group ? "Pose créée depuis la bibliothèque" : `${created.length} poses créées depuis la bibliothèque`);
    setSelected([]);
    setMessage(`${created.length} pose${created.length > 1 ? "s" : ""} ajoutée${created.length > 1 ? "s" : ""} à « ${project.name} » (section « ${target} »).`);
  }

  async function removePicked() {
    if (!library || !picked.length) return;
    if (!window.confirm(`Retirer ${picked.length} élément(s) de la bibliothèque ? Les poses déjà créées dans vos tournages ne changent pas.`)) return;
    const ids = new Set(picked.map((p) => p.id));
    for (const m of await listMedia(library.id)) if (ids.has(m.itemId)) await deleteMedia(m.id);
    change({ ...w, projects: w.projects.map((p) => (p.id === library.id ? { ...p, items: p.items.filter((i) => !ids.has(i.id)) } : p)) }, "Éléments retirés de la bibliothèque");
    setSelected([]);
    notify(`${ids.size} éléments retirés`);
  }

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <Screen title="Bibliothèque de poses" backTo="/plus">
      <p className="muted">
        Vos photos et vidéos de référence, classées par catégorie. Choisissez une catégorie, cochez ce qui vous intéresse, puis créez les poses de votre tournage : plusieurs photos cochées forment une seule pose (ses angles), une seule photo forme une pose simple.
      </p>
      <details className="card lib-import" open={!items.length}>
        <summary>Ajouter à la bibliothèque</summary>
        <p className="muted">Un pack préparé (dossier avec manifest.json) ou n'importe quel dossier : chaque sous-dossier devient une catégorie, chaque fichier un élément.</p>
        <div className="btn-row">
          <label className="btn">
            <FolderOpen size={17} /> Dossier du pack
            <input className="sr-only" type="file" multiple disabled={!!progress} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={(e) => { void chooseFiles(e.target.files, "pack"); e.target.value = ""; }} />
          </label>
          <label className="btn">
            <Images size={17} /> Importer un dossier
            <input className="sr-only" type="file" multiple disabled={!!progress} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={(e) => { void chooseFiles(e.target.files, "dossier"); e.target.value = ""; }} />
          </label>
        </div>
        {pending && (
          <div style={{ marginTop: 12 }}>
            <p>
              <strong>{pending.entries.length}</strong> éléments à ajouter ({pending.label}){pending.alreadyThere ? ` · ${pending.alreadyThere} déjà présents, ignorés` : ""}
            </p>
            <button className="btn gold full" disabled={!pending.entries.length || !!progress} onClick={() => void runImport()}>
              {progress ? `Import en cours… ${progress.done}/${progress.total}` : `Ajouter ${pending.entries.length} éléments à la bibliothèque`}
            </button>
          </div>
        )}
      </details>
      {message && <p className="notice">{message}</p>}

      {items.length ? (
        <>
          <div className="choices lib-cats">
            <button type="button" className={"choice" + (!category ? " on" : "")} onClick={() => setCategory("")}>Toutes <small>{items.length}</small></button>
            {categories.map(([name, count]) => (
              <button key={name} type="button" className={"choice" + (category === name ? " on" : "")} onClick={() => setCategory(name)}>{name} <small>{count}</small></button>
            ))}
          </div>
          <div className="lib-grid">
            {shown.map((item) => {
              const on = selected.includes(item.id);
              return (
                <button key={item.id} type="button" className={"lib-tile" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => toggle(item.id)} title={`${item.title}${item.framing ? " · " + String(item.framing) : ""}`}>
                  <Thumb media={mediaFor(media, item)} className="lib-thumb" />
                  <span className="lib-check">{on ? <Check size={16} /> : <Plus size={16} />}</span>
                  {item.framing ? <span className="lib-badge">{String(item.framing)}</span> : null}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <Empty icon={<Images size={32} />} title="La bibliothèque est vide" text="Ajoutez un dossier de photos et vidéos ci-dessus : elles resteront disponibles pour tous vos mariages." />
      )}

      {picked.length > 0 && (
        <div className="lib-bar">
          <strong>{picked.length} sélectionnée{picked.length > 1 ? "s" : ""}</strong>
          {project ? (
            <>
              <label className="lib-select">Section
                <select value={section} onChange={(e) => setSection(e.target.value)}>
                  <option value="auto">Conseillée : {suggested(picked[0])}</option>
                  {sectionChoices.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="lib-select">Étape
                <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
                  <option value="">Sans étape</option>
                  {stages.map((s) => <option key={s.id} value={s.id}>{String(s.time || "")} · {s.title}</option>)}
                </select>
              </label>
              <button className="btn gold" onClick={() => void use(true)}>{picked.length > 1 ? `Créer 1 pose avec ces ${picked.length} photos` : "Créer la pose"}</button>
              {picked.length > 1 && <button className="btn" onClick={() => void use(false)}>Créer {picked.length} poses séparées</button>}
            </>
          ) : <span className="muted">Ouvrez d'abord un tournage pour y créer des poses.</span>}
          <button className="icon-btn" aria-label="Retirer de la bibliothèque" onClick={() => void removePicked()}><Trash2 size={18} /></button>
          <button className="btn small" onClick={() => setSelected([])}>Tout décocher</button>
        </div>
      )}
    </Screen>
  );
}
