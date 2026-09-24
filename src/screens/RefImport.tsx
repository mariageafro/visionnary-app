import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { useStore } from "../store";
import { importMedia } from "../media";
import { libraryOf, newLibrary } from "../library";
import { isRefManifest, planRefImport, type RefManifest, type RefPlan } from "../refs";

/**
 * Ajoute les plans d'un manifeste Resolve (références du couple) au tournage actif : un manifest.json et un dossier
 * clips/ d'aperçus légers. Les vidéos d'origine ne sont jamais copiées. Additif, idempotent, annulable.
 */
export default function RefImport() {
  const { w, project: p, change, update, notify } = useStore();
  const [manifest, setManifest] = useState<RefManifest | null>(null);
  const [files, setFiles] = useState<Map<string, File>>(new Map());
  const [plan, setPlan] = useState<RefPlan | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState("");

  async function choose(list: FileList | null) {
    setMessage("");
    setPlan(null);
    if (!list || !p) return;
    const all = [...list];
    const mf = all.find((f) => f.name === "manifest.json");
    if (!mf) return setMessage("Aucun manifest.json : choisissez le dossier qui contient manifest.json et le dossier clips.");
    try {
      const parsed: unknown = JSON.parse(await mf.text());
      if (!isRefManifest(parsed)) throw new Error("format");
      const byName = new Map(all.filter((f) => /\.(mp4|mov|m4v|webm)$/i.test(f.name)).map((f) => [f.name, f]));
      setManifest(parsed);
      setFiles(byName);
      const holder = parsed.type === "inspiration_library" ? libraryOf(w) ?? newLibrary() : p;
      setPlan(planRefImport(holder, parsed, new Set(byName.keys())));
    } catch {
      setMessage("Ce manifest.json n'est pas un manifeste de références valide.");
    }
  }

  async function run() {
    if (!plan || !p || !manifest) return;
    const toLibrary = manifest.type === "inspiration_library";
    const holder = toLibrary ? libraryOf(w) ?? newLibrary() : p;
    const total = plan.items.length;
    let done = 0;
    setProgress({ done, total });
    const covers = new Map<string, string>();
    try {
      for (const { item, file } of plan.items) {
        const media = await importMedia(files.get(file)!, holder.id, item.id);
        covers.set(item.id, media.id);
        setProgress({ done: ++done, total });
      }
      const added = plan.items.map(({ item }) => ({ ...item, coverId: covers.get(item.id) ?? "" }));
      if (toLibrary) {
        const withItems = { ...holder, items: [...holder.items, ...added], updatedAt: new Date().toISOString() };
        change({ ...w, projects: libraryOf(w) ? w.projects.map((x) => (x.id === holder.id ? withItems : x)) : [...w.projects, withItems] }, `${total} inspirations ajoutées à la bibliothèque`);
      } else update({ ...p, items: [...p.items, ...added] }, `${total} références importées`);
      notify(`${total} références ajoutées`);
      setMessage(`Terminé : ${total} plans de référence ajoutés.`);
      setPlan(null);
    } catch (e) {
      setMessage("Import interrompu : " + (e instanceof Error ? e.message : String(e)) + " — relancez pour reprendre (les plans déjà ajoutés ne seront pas dupliqués).");
    } finally {
      setProgress(null);
    }
  }

  return (
    <>
      <div className="section-title">Importer des références (manifeste Resolve)</div>
      <div className="card">
        <p className="muted">Ajoute les plans d'une timeline DaVinci Resolve analysée : chaque plan devient une tâche à réaliser. Rien n'est remplacé, les vidéos sources ne sont pas copiées, l'ajout s'annule.</p>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <label className="btn" aria-disabled={!!progress}>
            <FolderOpen size={17} /> Choisir le dossier des références
            <input className="sr-only" type="file" multiple disabled={!!progress} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={(e) => { void choose(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        {plan && manifest && (
          <div style={{ marginTop: 12 }}>
            <p>
              <strong>{plan.items.length}</strong> plans à ajouter ({manifest.type === "couple_reference" ? "références du couple" : "bibliothèque d'inspiration"} · « {manifest.timeline} »)
              {plan.alreadyThere ? ` · ${plan.alreadyThere} déjà présents, ignorés` : ""}
              {plan.missingFiles ? ` · ${plan.missingFiles} clips introuvables` : ""}
            </p>
            <button className="btn gold full" disabled={!plan.items.length || !!progress} onClick={() => void run()}>
              {progress ? `Import en cours… ${progress.done}/${progress.total}` : `Ajouter ${plan.items.length} plans à ce tournage`}
            </button>
          </div>
        )}
        {message && <p className="notice" style={{ marginTop: 10 }}>{message}</p>}
      </div>
    </>
  );
}
