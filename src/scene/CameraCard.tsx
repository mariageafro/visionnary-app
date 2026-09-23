import MediaPicker from "./MediaPicker";
import { useScenePlans } from "./store";
import { updateElements } from "./ops";
import { useEffect, useRef, useState } from "react";
import { Camera, Clapperboard, Crosshair, Eye, EyeOff, MoveRight, Ruler, X } from "lucide-react";
import type { Item, MediaEntry } from "../types";
import type { SceneElement, ScenePlan } from "./types";
import { movementById, sensorById, supports } from "./catalog";
import { cameraFov, dist, estimateFraming, frameWidth, round } from "./geometry";
import { poseAt } from "./motion";
import { Thumb } from "../ui";
import { mediaFor, VideoPreview, type Operator } from "../screens/common";
import "../screens/viewer.css";

/**
 * Fiche caméra plein écran : le jour J, on touche CAM A et on voit tout de suite le cadrage
 * attendu (référence épinglée), l'objectif, le mouvement, la mission et les plans à tourner.
 */
export default function CameraCard({
  el: initialEl,
  plan,
  media,
  operator,
  shots,
  onClose,
}: {
  el: SceneElement;
  plan: ScenePlan;
  media: MediaEntry[];
  operator?: Operator;
  shots: Item[];
  onClose: () => void;
}) {
  const {save} = useScenePlans();
  const [picking,setPicking] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const el=plan.elements.find(e=>e.id===initialEl.id)??initialEl;
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const find = (id: string) => plan.elements.find((e) => e.id === id);
  const target = el.targetId ? find(el.targetId) : undefined;
  const reach = target ? dist(el, poseAt(target, el.motion?.start ?? 0, find)) : 0;
  const framing = target ? estimateFraming(frameWidth(reach, cameraFov(el))) : null;
  const linked = shots.filter((s) => el.shotIds?.includes(s.id));
  // Référence : celle épinglée, sinon celle du premier plan lié.
  const reference = (el.referenceId && media.find((m) => m.id === el.referenceId)) || linked.map((s) => mediaFor(media, s)).find(Boolean);
  const move = movementById(el.motion?.type);
  const support = supports.find(([id]) => id === el.support)?.[1];
  return (
    <dialog
      ref={dialog}
      className="shot-viewer"
      aria-label={"Caméra " + (el.tag ?? el.name)}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="sv">
        <header className="sv-top">
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <X size={22} />
          </button>
          <div className="sv-count">
            <strong>{el.tag ?? el.name}</strong>
            <small>{plan.name}</small>
          </div>
          <button className="icon-btn" aria-pressed={!showInfo} aria-label={showInfo ? "Cacher les infos" : "Montrer les infos"} title={showInfo ? "Cacher les infos" : "Montrer les infos"} onClick={() => setShowInfo(!showInfo)}>
            {showInfo ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </header>
        <div className={"sv-main" + (showInfo ? "" : " info-hidden")}>
          <div className="sv-stage">
            {reference ? (
              reference.type.startsWith("video/") ? (
                <VideoPreview media={reference} className="sv-video" />
              ) : (
                <Thumb media={reference} className="sv-img" full />
              )
            ) : (
              <div className="sv-empty">
                <Camera size={40} />
                <span>Pas encore de référence épinglée sur cette caméra</span>
              </div>
            )}
          </div>
          <div className="sv-body">
            <div className="sv-chips">
              {operator && (
                <span className="chip dark cam-op">
                  <i style={{ background: operator.color }} /> {operator.name}
                </span>
              )}
              {support && <span className="chip dark">{support}</span>}
            </div>
            <button className="btn gold" onClick={()=>setPicking(true)}>Ajouter / changer la référence</button>
            <h2>{el.mission || "Mission à préciser"}</h2>
            <div className="sv-specs">
              <div>
                <span>Objectif</span>
                <strong>{el.focal ?? 35} mm</strong>
              </div>
              <div>
                <span>Cadrage attendu</span>
                <strong>
                  {framing ? framing.label : el.framing || "—"}
                  {framing && <em>{framing.code}</em>}
                </strong>
              </div>
              <div>
                <span>Mouvement</span>
                <strong>{move?.label ?? "Statique"}</strong>
              </div>
              <div>
                <span>Boîtier</span>
                <strong>{el.model || sensorById(el.sensor).label}</strong>
              </div>
            </div>
            <dl className="sv-more">
              {target && (
                <div>
                  <dt>
                    <Crosshair size={12} /> Sujet
                  </dt>
                  <dd>
                    {target.name} · {round(reach, 1)} m
                  </dd>
                </div>
              )}
              {el.height !== undefined && (
                <div>
                  <dt>
                    <Ruler size={12} /> Hauteur
                  </dt>
                  <dd>{el.height} m</dd>
                </div>
              )}
              {move && el.motion && (
                <div>
                  <dt>
                    <MoveRight size={12} /> Quand
                  </dt>
                  <dd>
                    de {el.motion.start} s à {round(el.motion.start + el.motion.duration, 1)} s
                  </dd>
                </div>
              )}
            </dl>
            {move && <p className="sv-notes">{move.hint}</p>}
            {el.notes && <p className="sv-notes">{el.notes}</p>}
            {linked.length > 0 && (
              <div className="cam-shots">
                <span className="sd-sub">
                  <Clapperboard size={13} /> Plans à tourner
                </span>
                {linked.map((s) => (
                  <div key={s.id} className="cam-shot">
                    {mediaFor(media, s) ? <Thumb media={mediaFor(media, s)} /> : <span className="tr-empty" />}
                    <span>{s.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {picking&&<MediaPicker title="Cadrage attendu de cette caméra" ownerId={plan.id} media={media} onClose={()=>setPicking(false)} onPick={m=>{save(updateElements(plan,[el.id],{referenceId:m.id}),"Référence caméra ajoutée");setPicking(false);}}/>}
    </dialog>
  );
}
