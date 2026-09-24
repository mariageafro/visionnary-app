import DemoButton from "./DemoButton";
import { useEffect, useRef, useState } from "react";
import { Play, Plus, Heart } from "lucide-react";
import { useStore } from "../store";
import ShootWizard from "./ShootWizard";
import { buildWeddingDemo } from "../weddingDemo";
import { buildAndyMaevaWedding } from "../andyMaevaWedding";
import { importMedia } from "../media";
import { putMedia } from "../storage";
import type { Item } from "../types";
import { mediaChanged, navigate } from "../ui";
import "./welcome.css";

/**
 * Écran d'accueil : premier lancement ou aucun tournage actif. Sur le site public déployé
 * (accès direct demandé), la démo se charge toute seule plutôt que d'attendre un clic — en local
 * (npm run dev), on garde le choix manuel pour ne pas gêner un vrai premier tournage.
 */
export default function Welcome() {
  const store = useStore();
  const { w, change } = store;
  const latest = useRef(store);
  latest.current = store;
  const [wizard, setWizard] = useState(false);
  const [weddingBusy, setWeddingBusy] = useState(false);
  const [weddingProgress, setWeddingProgress] = useState("");
  const [name, setName] = useState(w.ownerName ?? "");
  const [auto, setAuto] = useState(import.meta.env.PROD && w.projects.length === 0);
  const started = useRef(false);
  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    void (async () => {
      try {
        const p = await buildWeddingDemo();
        const s = latest.current;
        s.change({ ...s.w, projects: [...s.w.projects, p], activeProjectId: p.id }, "Démo ouverte · entièrement modifiable");
        mediaChanged();
        navigate("/accueil");
      } catch {
        setAuto(false);
      }
    })();
  }, [auto]);
  if (auto)
    return (
      <div className="welcome">
        <img className="welcome-bg" src="director.jpg" alt="" />
        <div className="welcome-shade" />
        <div className="welcome-body">
          <span className="brand">
            <b>
              VISIONNARY <i />
            </b>
            <small>SHOOT · CREATE · EMOTION</small>
          </span>
          <p className="welcome-tag">Ouverture de la démo…</p>
        </div>
      </div>
    );
  return (
    <div className="welcome">
      <img className="welcome-bg" src="director.jpg" alt="" />
      <div className="welcome-shade" />
      <div className="welcome-body">
        <span className="brand">
          <b>
            VISIONNARY <i />
          </b>
          <small>SHOOT · CREATE · EMOTION</small>
        </span>
        <div className="welcome-play">
          <Play size={38} fill="currentColor" />
        </div>
        <p className="welcome-tag">
          Des idées d’aujourd’hui,
          <br />
          des images de demain.
        </p>
        <label className="field welcome-name">
          Votre prénom
          <input value={name} placeholder="Ex. Maurice" onChange={(e) => setName(e.target.value)} />
        </label>
        <button
          className="btn gold full"
          onClick={() => {
            if (name.trim() !== (w.ownerName ?? "")) change({ ...w, ownerName: name.trim() });
            setWizard(true);
          }}
        >
          <Plus size={18} /> Préparer mon premier tournage
        </button>
        <label className="btn full" style={{ cursor: weddingBusy ? "wait" : "pointer", marginTop: 8 }}>
          <Heart size={17} /> {weddingBusy ? weddingProgress : "Créer la fiche Andy & Maeva · 24 septembre + importer les photos"}
          <input className="sr-only" type="file" multiple accept="image/*,.heic,.heif" disabled={weddingBusy} onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (!files.length || weddingBusy) return;
            const project = buildAndyMaevaWedding();
            const sectionMap: Record<string, string> = { Man: "Préparatifs marié", Wife: "Accessoires & détails", Couple: "Portraits éditoriaux", Bridesmaids: "Cortège", Groomsmen: "Cortège", "Original Groups": "Cortège" };
            const stageMap: Record<string, string> = { "Préparatifs marié": "Arrivée du marié · loge", "Accessoires & détails": "Préparatifs · accessoires et détails", "Portraits éditoriaux": "Shooting Visionary", "Cortège": "Arrivée de la mariée et du cortège" };
            const categories = new Map<string, Item>();
            for (const file of files) {
              const path = file.webkitRelativePath || file.name;
              const folder = path.split("/").at(-2) || "";
              const category = sectionMap[folder] || "Portraits éditoriaux";
              const key = category;
              let pose = categories.get(key);
              if (!pose) {
                const stage = project.items.find((item) => item.module === "stages" && item.title === stageMap[category]);
                pose = { id: crypto.randomUUID(), module: "poses", title: `Galerie · ${category}`, status: "prévu", priority: "IMPORTANT", notes: "Photos de référence fournies par le client ; classées automatiquement d'après le nom du dossier. Vérifier la pertinence de chaque image.", order: project.items.filter((item) => item.module === "poses").length, section: category, category, ...(stage ? { stageId: stage.id } : {}) };
                categories.set(key, pose);
                project.items.push(pose);
              }
            }
            store.change({ ...w, projects: [...w.projects, project], activeProjectId: project.id }, "Fiche Andy & Maeva créée · import des références photo");
            setWeddingBusy(true);
            void (async () => {
              let count = 0;
              try {
                const poseItems = new Map(project.items.filter((item) => item.module === "poses").map((item) => [String(item.category), item]));
                for (const [index, file] of files.entries()) {
                  const path = file.webkitRelativePath || file.name;
                  const folder = path.split("/").at(-2) || "";
                  const category = sectionMap[folder] || "Portraits éditoriaux";
                  const pose = poseItems.get(category);
                  if (!pose) continue;
                  setWeddingProgress(`Import des photos · ${index + 1}/${files.length}`);
                  try {
                    const media = await importMedia(file, project.id, pose.id);
                    if (!media.unsupported) count++;
                  } catch { /* Garder l'import en cours même si un fichier isolé est invalide. */ }
                }
                setWeddingProgress(`Terminé · ${count} références photo importées`);
                mediaChanged();
                navigate("/accueil");
              } finally {
                setTimeout(() => { setWeddingBusy(false); setWeddingProgress(""); }, 1600);
              }
            })();
          }} />
        </label>
        <p className="welcome-note">Dans la fenêtre de sélection, choisissez le dossier « 24 Septembre » pour classer automatiquement ses sous-dossiers.</p>
        <DemoButton/>
        <p className="welcome-note">Tout reste sur cet appareil, même sans réseau.</p>
      </div>
      {wizard && <ShootWizard onClose={() => setWizard(false)} />}
    </div>
  );
}
