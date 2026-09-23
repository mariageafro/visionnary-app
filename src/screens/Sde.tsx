import { useState } from "react";
import { Check, Clapperboard, Music2, Plus, Radio, Video } from "lucide-react";
import { makeItem } from "../model";
import { useProject } from "../store";
import { Empty, Screen, useMedia } from "../ui";
import { ItemEditor, itemsOf, nextOrder } from "./common";
import { sdeProgress } from "./sdeProgress";

export default function Sde() {
  const { project: p, addItems, update } = useProject();
  const media = useMedia(p.id);
  const [editing, setEditing] = useState<ReturnType<typeof itemsOf>[number] | null>(null);
  const tracking = itemsOf(p, "sde")[0];
  const shots = itemsOf(p, "shots").filter((shot) => shot.sde === "indispensable" || shot.sde === "utile");
  const progress = sdeProgress(shots, (shot) => media.some((entry) => entry.itemId === shot.id || entry.id === shot.sourceMediaId), tracking?.musicReady === true, tracking?.editReady === true);
  const createTracking = () => addItems([makeItem("sde", "Suivi Same-Day Edit", { order: nextOrder(p, "sde") })], "Suivi Same-Day Edit créé");
  const toggle = (key: "musicReady" | "editReady") => {
    if (!tracking) return;
    update({ ...p, items: p.items.map((item) => item.id === tracking.id ? { ...item, [key]: item[key] !== true } : item) }, key === "musicReady" ? "Préparation musique mise à jour" : "État du montage mis à jour");
  };
  return <Screen title="Same-Day Edit" backTo="/tournage" actions={<button className="icon-btn gold" aria-label="Ajouter un suivi SDE" onClick={createTracking}><Plus size={20} /></button>}>
    <p className="muted">Suivez les plans à tourner, les médias disponibles sur cet appareil et la préparation de la musique avant de commencer le montage.</p>
    {!tracking ? <Empty icon={<Clapperboard size={30} />} title="Préparer le suivi SDE" text="Ajoutez un suivi pour renseigner l’échéance de projection, la durée cible et les informations de musique." action={<button className="btn gold" onClick={createTracking}><Plus size={16} /> Créer le suivi</button>} /> :
      <div className="card sde-tracking">
        <div><strong>{tracking.title}</strong><p className="muted">{tracking.due ? "Projection : " + tracking.due : "Échéance de projection à renseigner"}{tracking.duration ? " · " + tracking.duration + " s" : ""}</p></div>
        <button className="btn small" onClick={() => setEditing(tracking)}>Modifier le suivi</button>
        <button className={"btn " + (tracking.musicReady ? "gold" : "")} aria-pressed={tracking.musicReady === true} onClick={() => toggle("musicReady")}><Music2 size={16} /> {tracking.musicReady ? "Musique prête" : "Confirmer musique prête"}</button>
        <div className="sde-stats">
          <div><strong>{progress.captured.length}/{progress.essential.length}</strong><span>Plans indispensables tournés</span></div>
          <div><strong>{progress.withMedia.length}/{progress.essential.length}</strong><span>Plans avec média local</span></div>
          <div><strong>{progress.missing.length}</strong><span>Plans encore manquants</span></div>
        </div>
        <div className="sde-ready">
          {progress.canStart ? <Check size={18} /> : <Radio size={18} />}
          {progress.canStart ? "Médias requis présents localement et musique prête : le montage peut commencer." : "Le montage attend les plans indispensables tournés, leurs médias importés localement et la musique prête."}
        </div>
        <button className={"btn " + (progress.editReady ? "gold" : "")} disabled={!progress.canStart} aria-pressed={progress.editReady} onClick={() => toggle("editReady")}><Video size={16} /> {progress.editReady ? "Montage prêt à commencer" : "Confirmer que le montage est prêt"}</button>
      </div>}
    {shots.length > 0 ? <section className="card stack"><h2>Plans du Same-Day Edit</h2>{shots.map((shot) => {
      const local = media.some((entry) => entry.itemId === shot.id || entry.id === shot.sourceMediaId);
      return <div className="sde-shot" key={shot.id}><span><strong>{shot.title}</strong><small>{shot.sde === "indispensable" ? "Indispensable" : "Utile"} · {shot.status}</small></span><span className={"chip " + (local ? "gold" : "outline")}>{local ? "Média local" : "Média manquant"}</span></div>;
    })}</section> : <Empty icon={<Clapperboard size={30} />} title="Aucun plan SDE" text="Marquez des plans comme indispensables ou utiles dans Plans & scènes pour les suivre ici." />}
    {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
  </Screen>;
}
