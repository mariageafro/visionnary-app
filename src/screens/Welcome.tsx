import DemoButton from "./DemoButton";
import { useEffect, useRef, useState } from "react";
import { Play, Plus } from "lucide-react";
import { useStore } from "../store";
import ShootWizard from "./ShootWizard";
import { buildWeddingDemo } from "../weddingDemo";
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
          <img className="welcome-logo" src="logo-visionary-wedding.jpg" alt="Visionary Wedding" />
          <p className="welcome-tag">Ouverture de la démo…</p>
        </div>
      </div>
    );
  return (
    <div className="welcome">
      <img className="welcome-bg" src="director.jpg" alt="" />
      <div className="welcome-shade" />
      <div className="welcome-body">
        <img className="welcome-logo" src="logo-visionary-wedding.jpg" alt="Visionary Wedding" />
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
        <DemoButton/>
        <p className="welcome-note">Tout reste sur cet appareil, même sans réseau.</p>
      </div>
      {wizard && <ShootWizard onClose={() => setWizard(false)} />}
    </div>
  );
}
