import { useState } from "react";
import { FolderOpen, Images } from "lucide-react";
import { useStore } from "../store";
import { importMedia } from "../media";
import { isPack, planPackImport, applyPackImport, type Pack, type PackPlan } from "../packImport";

/**
 * Ajoute un pack de poses (manifest.json + images) à la galerie photographe du tournage actif.
 * Additif : rien n'est remplacé, relancer l'import ne crée pas de doublons, et l'ajout s'annule (⌘Z).
 */
export default function PackImport() {
  const { project: p, update, notify } = useStore();
  const [pack, setPack] = useState<Pack | null>(null);
  const [files, setFiles] = useState<Map<string, File>>(new Map());
  const [plan, setPlan] = useState<PackPlan | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState("");

  async function choose(list: FileList | null) {
    setMessage("");
    setPlan(null);
    if (!list || !p) return;
    const all = [...list];
    const manifestFile = all.find((file) => file.name === "manifest.json");
    if (!manifestFile) {
      setMessage("Aucun fichier manifest.json trouvé : choisissez le dossier du pack (celui qui contient manifest.json et le dossier images).");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await manifestFile.text());
      if (!isPack(parsed)) throw new Error("format");
      const byName = new Map(all.filter((file) => /\.(jpe?g|png|webp)$/i.test(file.name)).map((file) => [file.name, file]));
      setPack(parsed);
      setFiles(byName);
      setPlan(planPackImport(p, parsed, new Set(byName.keys())));
    } catch {
      setMessage("Ce manifest.json n'est pas un pack de poses valide.");
    }
  }

  async function run() {
    if (!pack || !plan || !p) return;
    const total = plan.poses.reduce((n, entry) => n + entry.files.length, 0);
    const covers = new Map<string, string>();
    let done = 0;
    setProgress({ done, total });
    try {
      for (const entry of plan.poses) {
        for (const name of entry.files) {
          const media = await importMedia(files.get(name)!, p.id, entry.item.id);
          if (name === entry.pose.cover || !covers.has(entry.item.id)) covers.set(entry.item.id, media.id);
          setProgress({ done: ++done, total });
        }
      }
      update(applyPackImport(p, plan, covers), `${plan.poses.length} poses importées`);
      notify(`${plan.poses.length} poses et ${total} photos ajoutées`);
      setPlan(null);
      setPack(null);
      setFiles(new Map());
      setMessage(`Terminé : ${plan.poses.length} poses et ${total} photos ajoutées à la Galerie photographe.`);
    } catch (e) {
      setMessage("Import interrompu : " + (e instanceof Error ? e.message : String(e)) + " — les photos déjà lues restent en mémoire de l'appareil ; relancez pour reprendre (les poses déjà ajoutées ne seront pas dupliquées).");
    } finally {
      setProgress(null);
    }
  }

  const photos = plan?.poses.reduce((n, entry) => n + entry.files.length, 0) ?? 0;
  return (
    <>
      <div className="section-title">Ajouter un pack de poses</div>
      <div className="card">
        <p className="muted">Ajoute les poses d'un pack préparé (dossier avec manifest.json et images) à la Galerie photographe de ce tournage, rangées par section et rattachées aux étapes du jour. Rien n'est remplacé et l'ajout s'annule.</p>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <label className="btn" aria-disabled={!!progress}>
            <FolderOpen size={17} /> Choisir le dossier du pack
            <input className="sr-only" type="file" multiple disabled={!!progress} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} onChange={(e) => { void choose(e.target.files); e.target.value = ""; }} />
          </label>
          <label className="btn" aria-disabled={!!progress}>
            <Images size={17} /> Choisir les fichiers
            <input className="sr-only" type="file" multiple accept=".json,image/*" disabled={!!progress} onChange={(e) => { void choose(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        {message && <p className="notice" style={{ marginTop: 12 }}>{message}</p>}
        {plan && (
          <div style={{ marginTop: 12 }}>
            <p><strong>{plan.poses.length}</strong> poses à ajouter ({photos} photos){plan.alreadyThere ? ` · ${plan.alreadyThere} déjà présentes, ignorées` : ""}{plan.missingFiles ? ` · ${plan.missingFiles} images introuvables` : ""}</p>
            {plan.withoutStage > 0 && <p className="muted">{plan.withoutStage} poses n'ont pas d'étape correspondante dans ce tournage : elles seront rangées par section seulement.</p>}
            <button className="btn gold full" disabled={!plan.poses.length || !!progress} onClick={() => void run()}>
              {progress ? `Import en cours… ${progress.done}/${progress.total}` : `Ajouter ${plan.poses.length} poses à ce tournage`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
