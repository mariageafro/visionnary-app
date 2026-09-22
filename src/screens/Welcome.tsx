import DemoButton from "./DemoButton";
import { useState } from "react";
import { Play, Plus } from "lucide-react";
import { useStore } from "../store";
import ShootWizard from "./ShootWizard";
import "./welcome.css";

/** Écran d'accueil : premier lancement ou aucun tournage actif. */
export default function Welcome() {
  const { w, change } = useStore();
  const [wizard, setWizard] = useState(false);
  const [name, setName] = useState(w.ownerName ?? "");
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
        <DemoButton/>
        <p className="welcome-note">Tout reste sur cet appareil, même sans réseau.</p>
      </div>
      {wizard && <ShootWizard onClose={() => setWizard(false)} />}
    </div>
  );
}
