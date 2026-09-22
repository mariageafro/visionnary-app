import ReferenceGallery from "./ReferenceGallery";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Clapperboard, Pencil, Plane, RotateCcw, Star, Video, X } from "lucide-react";
import type { Item } from "../types";
import { done, framingCode, makeItem, sectionOf, transitionTypes } from "../model";
import { kindLabels, shotKind } from "../stageStats";
import { useProject } from "../store";
import { useMedia } from "../ui";
import { ItemEditor, operatorsOf, shortFocal, titleOf } from "./common";
import "./viewer.css";

const kindIcons = { both: Clapperboard, video: Video, photo: Camera, drone: Plane };

/**
 * Fiche d'un plan en plein écran : la référence en grand, l'essentiel (cadrage, focale, mouvement,
 * opérateur), le statut en un geste, et le plan suivant d'un swipe, d'une flèche ou du clavier.
 */
export default function ShotViewer({ ids, start, context, onClose }: { ids: string[]; start: number; context?: string; onClose: () => void }) {
  const { project: p, patchItem, addItems, removeItem } = useProject();
  const media = useMedia(p.id);
  const dialog = useRef<HTMLDialogElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState(start);
  const [editing, setEditing] = useState<Item | null>(null);
  const [flash, setFlash] = useState("");
  const shots = ids.map((id) => p.items.find((i) => i.id === id)).filter((i): i is Item => !!i);
  const at = Math.min(index, shots.length - 1);
  const shot = shots[at];
  const next = shots[at + 1];

  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  useEffect(() => {
    if (!shots.length) onClose();
  }, [shots.length, onClose]);
  if (!shot) return null;

  const op = operatorsOf(p).get(String(shot.operatorId));
  const kind = shotKind(shot);
  const KindIcon = kindIcons[kind];
  const link = next && p.items.find((i) => i.module === "transitions" && i.fromId === shot.id && i.toId === next.id && i.status !== "archivé");
  const go = (step: number) => setIndex((n) => Math.max(0, Math.min(shots.length - 1, n + step)));

  function setStatus(status: string) {
    patchItem(shot.id, { status }, `${shot.title} · ${status === "prévu" ? "à faire" : status}`);
    setFlash(status);
    if (status === "tourné" && next) setTimeout(() => go(1), 280);
    setTimeout(() => setFlash(""), 600);
  }
  function setTransition(type: string) {
    if (!next) return;
    if (!type) return link && removeItem(link.id, "Transition retirée");
    if (link) return patchItem(link.id, { movement: type }, "Transition mise à jour");
    addItems(
      [makeItem("transitions", `${shot.title} → ${next.title}`, { fromId: shot.id, toId: next.id, stageId: shot.stageId || next.stageId, movement: type, category: "montage", order: p.items.filter((i) => i.module === "transitions").length })],
      "Transition prévue",
    );
  }
  const specs: [string, unknown][] = [
    ["Personne(s)", shot.person || shot.subject],
    ["Angle", shot.angle],
    ["Caméra", shot.camera],
    ["Cadence", shot.fps],
    ["Lumière", shot.light],
    ["Durée au montage", shot.duration ? `${shot.duration} s` : ""],
    ["Temps de tournage", shot.shootMinutes ? `${shot.shootMinutes} min` : ""],
    ["Réglages", shot.settings],
  ];
  const where = [titleOf(p, shot.stageId), shot.section ? sectionOf(shot) : ""].filter(Boolean).join(" · ");

  return (
    <dialog
      ref={dialog}
      className="shot-viewer"
      aria-label={"Plan : " + shot.title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if ((e.target as Element).closest("select, input, textarea")) return;
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div className="sv">
        <header className="sv-top">
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <X size={22} />
          </button>
          <div className="sv-count">
            <strong>
              {at + 1} / {shots.length}
            </strong>
            {context && <small>{context}</small>}
          </div>
          <button className="icon-btn" aria-label="Modifier le plan" onClick={() => setEditing(shot)}>
            <Pencil size={19} />
          </button>
        </header>

        <nav className="mission-nav" aria-label="Changer de shot"><button className="btn small" disabled={at===0} onClick={()=>go(-1)}>Plan précédent</button><button className="btn small" disabled={at>=shots.length-1} onClick={()=>go(1)}>Plan suivant</button></nav>
        <div
          className="sv-main"
          onPointerDown={(e) => {
            if ((e.target as Element).closest("video, button, select, input, a")) return;
            swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            const dy = e.clientY - s.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
          }}
        >
          <ReferenceGallery key={shot.id} item={shot} media={media} />
          <div className="sv-body">
            <div className="sv-chips">
              <span className="chip dark">
                <KindIcon size={13} /> {kindLabels[kind]}
              </span>
              {shot.priority === "MUST HAVE" && <span className="chip red">MUST HAVE</span>}
              {shot.priority === "BONUS" && <span className="chip dark">Bonus</span>}
              {done(shot) && (
                <span className="chip green">
                  <Check size={13} /> {shot.status === "excellent" ? "Excellent" : "Tourné"}
                </span>
              )}
              {shot.status === "à refaire" && <span className="chip red">À refaire</span>}
            </div>
            {where && <small className="sv-where">{where}</small>}
            <h2>{shot.title}</h2>
            <div className="sv-specs">
              <div>
                <span>Cadrage</span>
                <strong>
                  {String(shot.framing || "—")}
                  {framingCode(shot.framing) && <em>{framingCode(shot.framing)}</em>}
                </strong>
              </div>
              <div>
                <span>Focale</span>
                <strong>{shortFocal(shot.focal) || "—"}</strong>
              </div>
              <div>
                <span>Mouvement</span>
                <strong>{String(shot.movement || "—")}</strong>
              </div>
              <div>
                <span>{kind === "photo" ? "Photographe" : "Opérateur"}</span>
                <strong className="sv-op">
                  {op ? (
                    <>
                      <i style={{ background: op.color }} />
                      {op.name}
                    </>
                  ) : (
                    "Équipe"
                  )}
                </strong>
              </div>
            </div>
            {specs.some(([, v]) => v) && (
              <dl className="sv-more">
                {specs
                  .filter(([, v]) => v)
                  .map(([label, v]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {shot.notes && <p className="sv-notes">{shot.notes}</p>}
            {next && (
              <label className="field sv-transition">
                Transition vers « {next.title} »
                <select value={String(link?.movement ?? "")} onChange={(e) => setTransition(e.target.value)}>
                  <option value="">Aucune transition prévue</option>
                  {[...new Set([...transitionTypes, ...(link?.movement ? [String(link.movement)] : [])])].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        <nav className="sv-status" aria-label="Statut du plan">
          <button className={shot.status === "prévu" || shot.status === "prêt" ? "on" : ""} onClick={() => setStatus("prévu")}>
            À FAIRE
          </button>
          <button className={"redo" + (shot.status === "à refaire" ? " on" : "")} onClick={() => setStatus("à refaire")}>
            <RotateCcw size={18} /> À REFAIRE
          </button>
          <button className={"done" + (done(shot) || flash === "tourné" ? " on" : "")} onClick={() => setStatus("tourné")}>
            <Check size={22} strokeWidth={3} /> FAIT
          </button>
          <button
            className={"star" + (shot.status === "excellent" ? " on" : "")}
            aria-label="Excellent"
            title="Excellent"
            onClick={() => setStatus(shot.status === "excellent" ? "tourné" : "excellent")}
          >
            <Star size={20} fill={shot.status === "excellent" ? "currentColor" : "none"} />
          </button>
        </nav>
      </div>
      {editing && (
        // Un plan supprimé depuis l'éditeur disparaît de la liste : l'index est ramené dans ses bornes.
        <ItemEditor key={editing.id} item={editing} onClose={() => setEditing(null)} />
      )}
    </dialog>
  );
}
