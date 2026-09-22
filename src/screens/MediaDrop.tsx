import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, Check, Heart, ImagePlus, Images, Upload, Video } from "lucide-react";
import type { Item, ModuleId } from "../types";
import { makeItem } from "../model";
import { importMedia, MAX_MEDIA_BYTES } from "../media";
import { titleFromFile } from "../stageStats";
import { useProject } from "../store";
import { Sheet, mediaChanged } from "../ui";
import "./media.css";

/** Ce que deviennent les fichiers importés : un fichier = un élément illustré. */
export type ImportTarget = "photo" | "video" | "pose" | "reference";
export const importTargets: [ImportTarget, string, typeof Camera][] = [
  ["photo", "Plans photo", Camera],
  ["video", "Plans vidéo", Video],
  ["pose", "Poses", Heart],
  ["reference", "Références", Images],
];
const moduleFor: Record<ImportTarget, ModuleId> = { photo: "shots", video: "shots", pose: "poses", reference: "inspirations" };
const nounFor: Record<ImportTarget, string> = { photo: "Photo", video: "Plan", pose: "Pose", reference: "Référence" };
const accepted = (f: File) => /^(image|video)\//.test(f.type) || /\.(heic|heif|mov|mp4|m4v|jpe?g|png|webp|gif)$/i.test(f.name);

/**
 * Glisser des fichiers n'importe où sur l'écran : renvoie `true` pendant le survol pour afficher
 * le voile. Ignoré quand une feuille est ouverte (elle a sa propre zone de dépôt).
 */
export function useFileDrop(onFiles: (files: File[]) => void, enabled = true) {
  const [dragging, setDragging] = useState(false);
  const handler = useRef(onFiles);
  useEffect(() => {
    handler.current = onFiles;
  });
  useEffect(() => {
    if (!enabled) return;
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
    const busy = () => !!document.querySelector("dialog[open]");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e) || busy()) return;
      depth++;
      setDragging(true);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e) && !busy()) e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      depth = 0;
      setDragging(false);
      if (e.defaultPrevented || busy() || !hasFiles(e)) return;
      e.preventDefault();
      const files = Array.from(e.dataTransfer!.files).filter(accepted);
      if (files.length) handler.current(files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [enabled]);
  return dragging;
}

/** Voile plein écran pendant le glisser. */
export function DropVeil({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return (
    <div className="drop-veil" aria-hidden="true">
      <div>
        <Upload size={40} />
        <strong>Déposez vos photos et vidéos</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

/** Bouton qui ouvre la galerie ou l'appareil photo (plusieurs fichiers). */
export function PickFiles({ onFiles, label = "Importer", className = "btn" }: { onFiles: (files: File[]) => void; label?: ReactNode; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={className} onClick={() => input.current?.click()}>
        <ImagePlus size={17} /> {label}
      </button>
      <input
        ref={input}
        className="sr-only"
        type="file"
        multiple
        accept="image/*,video/*,.heic,.heif,.mov"
        onChange={(e) => {
          const files = Array.from(e.target.files || []).filter(accepted);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}

interface Job {
  id: string;
  name: string;
  preview: string;
  state: "attente" | "import" | "fait" | "erreur";
}

/**
 * Import en série : les éléments sont créés d'un coup (une seule annulation), puis chaque fichier
 * rejoint son élément ; les vignettes apparaissent une à une pendant la progression.
 */
export function useImporter() {
  const { project: p, addItems, notify } = useProject();
  const [jobs, setJobs] = useState<Job[]>([]);
  const running = useRef(false);
  // Aperçus instantanés (fichiers d'origine) : libérés quand la progression disparaît ou à la sortie.
  const previews = useRef<string[]>([]);
  const release = () => {
    previews.current.forEach((url) => URL.revokeObjectURL(url));
    previews.current = [];
  };
  useEffect(() => release, []);

  async function run(files: File[], target: ImportTarget, extra: Partial<Item>, existing: number) {
    if (running.current) return notify("Un import est déjà en cours");
    const heavy = files.filter((f) => f.size > MAX_MEDIA_BYTES);
    const list = files.filter((f) => f.size <= MAX_MEDIA_BYTES);
    if (!list.length) return notify("Fichiers trop lourds (500 Mo maximum)");
    running.current = true;
    const module = moduleFor[target];
    const base = Math.max(-1, ...p.items.filter((i) => i.module === module).map((i) => i.order)) + 1;
    const items = list.map((file, n) =>
      makeItem(module, titleFromFile(file.name, `${nounFor[target]} ${existing + n + 1}`), {
        order: base + n,
        ...(target === "photo" ? { media: "photo" } : target === "video" ? { media: "video" } : {}),
        ...extra,
      }),
    );
    addItems(items, `${items.length} ${items.length > 1 ? "éléments créés" : "élément créé"} · import des fichiers…`);
    release();
    const queue: Job[] = list.map((file, n) => ({ id: items[n].id, name: file.name, preview: URL.createObjectURL(file), state: "attente" }));
    previews.current = queue.map((j) => j.preview);
    setJobs(queue);
    for (const [n, file] of list.entries()) {
      setJobs((all) => all.map((j, k) => (k === n ? { ...j, state: "import" } : j)));
      try {
        await importMedia(file, p.id, items[n].id);
        setJobs((all) => all.map((j, k) => (k === n ? { ...j, state: "fait" } : j)));
      } catch {
        setJobs((all) => all.map((j, k) => (k === n ? { ...j, state: "erreur" } : j)));
      }
      mediaChanged();
    }
    running.current = false;
    notify(heavy.length ? `Import terminé · ${heavy.length} fichier(s) de plus de 500 Mo ignoré(s)` : "Import terminé");
    setTimeout(() => {
      setJobs([]);
      release();
    }, 2500);
  }
  return { jobs, run, busy: jobs.some((j) => j.state === "attente" || j.state === "import") };
}

/** Progression d'import : vignettes instantanées, coche verte quand le fichier est rangé. */
export function ImportProgress({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) return null;
  const finished = jobs.filter((j) => j.state === "fait" || j.state === "erreur").length;
  return (
    <div className="import-progress" role="status">
      <div className="import-head">
        <strong>{finished < jobs.length ? `Import ${finished + 1} / ${jobs.length}` : `${jobs.length} fichier${jobs.length > 1 ? "s" : ""} importé${jobs.length > 1 ? "s" : ""}`}</strong>
        <div className="progress dark">
          <span style={{ width: `${(finished / jobs.length) * 100}%` }} />
        </div>
      </div>
      <div className="import-thumbs">
        {jobs.slice(0, 18).map((j) => (
          <span key={j.id} className={"import-thumb is-" + j.state}>
            {/\.(mov|mp4|m4v|webm)$/i.test(j.name) ? <Video size={16} /> : /\.(heic|heif)$/i.test(j.name) ? <Images size={16} /> : <img src={j.preview} alt="" />}
            {j.state === "fait" && <Check size={14} strokeWidth={3} />}
          </span>
        ))}
        {jobs.length > 18 && <span className="import-more">+{jobs.length - 18}</span>}
      </div>
    </div>
  );
}

/**
 * Confirmation d'import : aperçu des fichiers, ce qu'ils deviennent (photo, vidéo, pose, référence)
 * et, pour des plans, le moment où les ranger.
 */
export function ImportSheet({
  files,
  target: initial,
  targets = importTargets.map((t) => t[0]),
  sections,
  section: initialSection,
  categories,
  category: initialCategory,
  onClose,
  onConfirm,
}: {
  files: File[];
  target: ImportTarget;
  targets?: ImportTarget[];
  sections?: string[];
  section?: string;
  /** Catégories proposées pour des poses ou des références. */
  categories?: string[];
  category?: string;
  onClose: () => void;
  onConfirm: (target: ImportTarget, section: string, category: string) => void;
}) {
  const [target, setTarget] = useState(initial);
  const [section, setSection] = useState(initialSection ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");
  // Aperçus créés et libérés par le même effet : fiable même quand React remonte le composant.
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  useEffect(() => {
    const list = files.slice(0, 12).map((f) => ({ name: f.name, url: /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif)$/i.test(f.name) ? URL.createObjectURL(f) : "" }));
    setPreviews(list);
    return () => list.forEach((p) => p.url && URL.revokeObjectURL(p.url));
  }, [files]);
  const videos = files.filter((f) => /^video\//.test(f.type) || /\.(mov|mp4|m4v)$/i.test(f.name)).length;
  return (
    <Sheet title={`Importer ${files.length} fichier${files.length > 1 ? "s" : ""}`} onClose={onClose}>
      <div className="import-previews">
        {previews.map((p, n) => (
          <span key={n} className="import-thumb">
            {p.url ? <img src={p.url} alt={p.name} /> : <Video size={18} />}
          </span>
        ))}
        {files.length > 12 && <span className="import-more">+{files.length - 12}</span>}
      </div>
      <p className="muted" style={{ margin: "12px 0" }}>
        Un fichier = un élément, illustré par sa photo{videos ? ` (dont ${videos} vidéo${videos > 1 ? "s" : ""} de référence)` : ""}. Les titres viennent des noms
        de fichiers et restent modifiables.
      </p>
      <div className="field">
        Créer des
        <div className="choices">
          {importTargets
            .filter(([id]) => targets.includes(id))
            .map(([id, label, Icon]) => (
              <button key={id} type="button" className={"choice" + (target === id ? " on" : "")} aria-pressed={target === id} onClick={() => setTarget(id)}>
                <Icon size={16} /> {label}
              </button>
            ))}
        </div>
      </div>
      {sections && (target === "photo" || target === "video") && (
        <label className="field" style={{ marginTop: 12 }}>
          Moment
          <input list="import-sections" value={section} placeholder="Ex. Mariée · Détails & accessoires" onChange={(e) => setSection(e.target.value)} />
          <datalist id="import-sections">
            {sections.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
      )}
      {categories && (target === "pose" || target === "reference") && (
        <label className="field" style={{ marginTop: 12 }}>
          Catégorie
          <input list="import-categories" value={category} placeholder="Ex. Couple, Famille, Photos éditoriales" onChange={(e) => setCategory(e.target.value)} />
          <datalist id="import-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      )}
      <div className="form-actions">
        <button className="btn" onClick={onClose}>
          Annuler
        </button>
        <button className="btn gold" onClick={() => onConfirm(target, section.trim(), category.trim())}>
          <Upload size={16} /> Importer
        </button>
      </div>
    </Sheet>
  );
}
