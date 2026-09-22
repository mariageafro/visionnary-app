import QuickStatus from "./QuickStatus";
import "./missions.css";
import ReferenceGallery from "./ReferenceGallery";
import { useEffect, useRef, useState } from "react";
import { ArrowDownUp, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Heart, Pencil, Play, Plus, Star, X } from "lucide-react";
import type { Item, MediaEntry } from "../types";
import { done, makeItem, poseCategories } from "../model";
import { useProject } from "../store";
import { Empty, MediaViewer, Screen, Thumb, useMedia } from "../ui";
import { clockShort, ItemEditor, itemsOf, mediaFor, nextOrder, operatorsOf, shortFocal, titleOf } from "./common";
import { DropVeil, ImportProgress, ImportSheet, PickFiles, useFileDrop, useImporter } from "./MediaDrop";
import "./poses.css";
import "./viewer.css";

const categoryOf = (i: Item) => String(i.category || "Sans catégorie");
type Filter = "all" | "favorites" | "todo" | `cat:${string}`;

/**
 * Pose Board : le moodboard photo du mariage. Les références gardent leur format (façon Pinterest),
 * se rangent par catégorie, se cochent le jour J, se marquent en favori et se réordonnent.
 * Sur tout le mariage (/m/poses) ou dans une étape.
 */
export default function PoseBoard({ stageId, embedded = false }: { stageId?: string; embedded?: boolean }) {
  const { project: p, patchItem, update } = useProject();
  const media = useMedia(p.id);
  const importer = useImporter();
  const [selectedStage,setSelectedStage] = useState("");
  const activeStage=stageId||selectedStage;
  const [filter, setFilter] = useState<Filter>("all");
  const [reorder, setReorder] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewer, setViewer] = useState<{ ids: string[]; start: number } | null>(null);
  const [pending, setPending] = useState<File[] | null>(null);
  const dragging = useFileDrop((files) => setPending(files), !embedded);
  const all = itemsOf(p, "poses").filter((i) => !activeStage || i.stageId === activeStage);
  const present = [...new Set(all.map(categoryOf))];
  const categories = [...present.filter((c) => poseCategories.includes(c)).sort((a, b) => poseCategories.indexOf(a) - poseCategories.indexOf(b)), ...present.filter((c) => !poseCategories.includes(c))];
  const current = filter.startsWith("cat:") ? filter.slice(4) : "";
  const shown = all.filter((i) =>
    filter === "all" ? true : filter === "favorites" ? i.favorite === true : filter === "todo" ? !done(i) : categoryOf(i) === current,
  );
  const operators = operatorsOf(p);
  const doneCount = all.filter(done).length;
  const add = () => setEditing(makeItem("poses", "", { order: nextOrder(p, "poses"), ...(activeStage ? { stageId:activeStage } : {}), ...(current && current !== "Sans catégorie" ? { category: current } : {}) }));
  // Réordonner : on échange l'ordre avec la voisine visible (même filtre), sans toucher aux autres.
  const move = (item: Item, step: number) => {
    const at = shown.findIndex((i) => i.id === item.id);
    const other = shown[at + step];
    if (!other) return;
    update({ ...p, items: p.items.map((i) => (i.id === item.id ? { ...i, order: other.order } : i.id === other.id ? { ...i, order: item.order } : i)) });
  };

  const body = (
    <>
      {!stageId&&<div className="mission-filters"><select aria-label="Étape des poses" value={selectedStage} onChange={e=>{setSelectedStage(e.target.value);setFilter("all");}}><option value="">Poses de toute la journée</option>{itemsOf(p,"stages").map(s=><option key={s.id} value={s.id}>{s.time} · {s.title}</option>)}</select></div>}
      <div className="board-head">
        <div className="board-count">
          <strong>
            {doneCount} / {all.length}
          </strong>
          <span>poses réalisées</span>
          <div className="progress dark">
            <span style={{ width: `${all.length ? (doneCount / all.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="board-actions">
          <button className="btn gold" onClick={add}>
            <Plus size={17} /> Ajouter<span className="hide-narrow"> une pose</span>
          </button>
          <PickFiles label={<>Importer<span className="hide-narrow"> des références</span></>} onFiles={setPending} />
          {all.length > 1 && (
            <button className={"btn" + (reorder ? " gold" : "")} aria-pressed={reorder} aria-label="Réordonner les poses" onClick={() => setReorder(!reorder)}>
              <ArrowDownUp size={16} /> {reorder ? "Terminer" : <span className="hide-narrow">Réordonner</span>}
            </button>
          )}
        </div>
      </div>

      {all.length > 0 && (
        <div className="pose-filters" role="group" aria-label="Filtrer les poses">
          <button className={"op-pill" + (filter === "all" ? " on" : "")} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            Toutes <small>{all.length}</small>
          </button>
          <button className={"op-pill" + (filter === "favorites" ? " on" : "")} aria-pressed={filter === "favorites"} onClick={() => setFilter("favorites")}>
            <Star size={14} /> Favoris <small>{all.filter((i) => i.favorite === true).length}</small>
          </button>
          <button className={"op-pill" + (filter === "todo" ? " on" : "")} aria-pressed={filter === "todo"} onClick={() => setFilter("todo")}>
            À faire <small>{all.length - doneCount}</small>
          </button>
          {categories.map((c) => (
            <button key={c} className={"op-pill" + (current === c ? " on" : "")} aria-pressed={current === c} onClick={() => setFilter(`cat:${c}`)}>
              {c} <small>{all.filter((i) => categoryOf(i) === c).length}</small>
            </button>
          ))}
        </div>
      )}

      {shown.length ? (
        <div className={"pose-wall" + (reorder ? " is-reordering" : "")}>
          {shown.map((pose, n) => {
            const thumb = mediaFor(media, pose);
            const op = operators.get(String(pose.operatorId));
            const isVideo = thumb?.type.startsWith("video/");
            return (
              <div key={pose.id} className={"pose-tile" + (done(pose) ? " is-done" : "") + (pose.favorite === true ? " is-fav" : "")}>
                <button type="button" className="pose-media" onClick={() => setViewer({ ids: shown.map((i) => i.id), start: n })} aria-label={"Voir la pose " + (pose.title || "")}>
                  <span className="pose-frame">
                    {thumb ? <Thumb media={thumb} className="pose-thumb" /> : <span className="pose-empty"><Heart size={28} /></span>}
                  </span>
                  {isVideo && Number(thumb?.duration) > 0 && (
                    <span className="chip dark insp-duration pose-duration">
                      <Play size={9} fill="#fff" /> {clockShort(Number(thumb!.duration))}
                    </span>
                  )}
                  <span className="pose-shade" />
                  <span className="pose-info">
                    <strong>{pose.title || "Sans titre"}</strong>
                    <small>
                      {filter.startsWith("cat:") ? "" : categoryOf(pose)}
                      {op && (
                        <>
                          <i style={{ background: op.color }} /> {op.name}
                        </>
                      )}
                    </small>
                  </span>
                </button>
                <button type="button" className="pose-fav" aria-pressed={pose.favorite === true} aria-label={pose.favorite === true ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={() => patchItem(pose.id, { favorite: pose.favorite !== true })}>
                  <Star size={15} fill={pose.favorite === true ? "currentColor" : "none"} />
                </button>
                <QuickStatus item={pose}/>
                {reorder && (
                  <div className="pose-move">
                    <button type="button" aria-label="Avancer" disabled={n === 0} onClick={() => move(pose, -1)}>
                      <ChevronLeft size={18} />
                    </button>
                    <button type="button" aria-label="Reculer" disabled={n === shown.length - 1} onClick={() => move(pose, 1)}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          icon={<Heart size={32} />}
          title={all.length ? "Rien dans ce filtre" : "Votre moodboard photo commence ici"}
          text={
            all.length
              ? "Changez de filtre pour retrouver vos poses."
              : "Déposez 5, 20 ou 50 références d’un coup : chaque image devient une pose à cocher le jour J, rangée dans sa catégorie."
          }
          action={
            !all.length ? (
              <div className="btn-row" style={{ justifyContent: "center" }}>
                <PickFiles className="btn gold" label="Importer des références" onFiles={setPending} />
                <button className="btn" onClick={add}>
                  <Plus size={17} /> Ajouter une pose
                </button>
              </div>
            ) : undefined
          }
        />
      )}

      <DropVeil show={dragging} text="Chaque image devient une pose du moodboard." />
      <ImportProgress jobs={importer.jobs} />
      {pending && (
        <ImportSheet
          files={pending}
          target="pose"
          targets={["pose"]}
          categories={[...new Set([...categories.filter((c) => c !== "Sans catégorie"), ...poseCategories])]}
          category={current && current !== "Sans catégorie" ? current : ""}
          onClose={() => setPending(null)}
          onConfirm={(_target, _section, category) => {
            void importer.run(pending, "pose", { ...(activeStage ? { stageId:activeStage } : {}), ...(category ? { category } : {}) }, all.length);
            setPending(null);
            if (category) setFilter(`cat:${category}`);
          }}
        />
      )}
      {viewer && <PoseViewer ids={viewer.ids} start={viewer.start} onClose={() => setViewer(null)} onEdit={setEditing} />}
      {editing && <ItemEditor key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
  // Dans une étape, le tableau de bord gère déjà le glisser-déposer et l'en-tête.
  if (embedded) return body;
  return (
    <Screen title="Galerie photographe" backTo="/tournage">
      {body}
    </Screen>
  );
}

const visual = (m: MediaEntry) => !m.unsupported && /^(image|video)\//.test(m.type);

/** Une pose en plein écran : la référence en grand, la phrase à dire, qui la fait, et la suivante d'un swipe. */
export function PoseViewer({ ids, start, onClose, onEdit }: { ids: string[]; start: number; onClose: () => void; onEdit: (pose: Item) => void }) {
  const { project: p, patchItem } = useProject();
  const media = useMedia(p.id);
  const dialog = useRef<HTMLDialogElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState(start);
  const [pick, setPick] = useState(0);
  const [full, setFull] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const poses = ids.map((id) => p.items.find((i) => i.id === id)).filter((i): i is Item => !!i);
  const at = Math.min(index, poses.length - 1);
  const pose = poses[at];
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  useEffect(() => {
    if (!poses.length) onClose();
  }, [poses.length, onClose]);
  useEffect(() => setPick(0), [pose?.id]);
  if (!pose) return null;
  const own = media.filter((m) => m.itemId === pose.id && visual(m));
  const gallery = own.length ? own : [mediaFor(media, pose)].filter((m): m is MediaEntry => !!m);
  const current = gallery[Math.min(pick, gallery.length - 1)];
  const team = itemsOf(p, "team");
  const operators = operatorsOf(p);
  const go = (step: number) => setIndex((n) => Math.max(0, Math.min(poses.length - 1, n + step)));
  const facts: [string, unknown][] = [
    ["Mains / regard", pose.hands],
    ["Cadrage", pose.framing],
    ["Focale", shortFocal(pose.focal)],
    ["Lumière", pose.light],
    ["Orientation", pose.orientation],
    ["Durée", pose.duration ? `${pose.duration} min` : ""],
    ["Étape", titleOf(p, pose.stageId)],
  ];
  return (
    <dialog
      ref={dialog}
      className="shot-viewer"
      aria-label={"Pose : " + pose.title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if ((e.target as Element).closest("input,textarea,select")) return;
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
              {at + 1} / {poses.length}
            </strong>
            <small>{String(pose.category || "Poses")}</small>
          </div>
          <button className="icon-btn" aria-pressed={!showInfo} aria-label={showInfo ? "Cacher les infos" : "Montrer les infos"} title={showInfo ? "Cacher les infos" : "Montrer les infos"} onClick={() => setShowInfo(!showInfo)}>
            {showInfo ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
          <button className="icon-btn" aria-label="Modifier la pose" onClick={() => onEdit(pose)}>
            <Pencil size={19} />
          </button>
        </header>
        <nav className="mission-nav" aria-label="Changer de pose"><button className="btn small" disabled={at===0} onClick={()=>go(-1)}>Pose précédent</button><button className="btn small" disabled={at>=poses.length-1} onClick={()=>go(1)}>Pose suivant</button></nav>
        <div
          className={"sv-main" + (showInfo ? "" : " info-hidden")}
          onPointerDown={(e) => {
            if ((e.target as Element).closest("video, button, select, input, a")) return;
            swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(dx < 0 ? 1 : -1);
          }}
        >
          <ReferenceGallery key={pose.id} item={pose} media={media} />
          <div className="sv-body">
            <div className="sv-chips">
              {pose.category && <span className="chip dark">{String(pose.category)}</span>}
              {pose.favorite === true && (
                <span className="chip gold">
                  <Star size={12} fill="currentColor" /> Favori
                </span>
              )}
              {done(pose) && (
                <span className="chip green">
                  <Check size={13} /> Réalisée
                </span>
              )}
            </div>
            <h2>{pose.title}</h2>
            {pose.instruction && <p className="pose-say">« {String(pose.instruction)} »</p>}
            {facts.some(([, v]) => v) && (
              <dl className="sv-more">
                {facts
                  .filter(([, v]) => v)
                  .map(([label, v]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {team.length > 0 && (
              <div className="field sv-transition">
                Photographe
                <div className="op-pills pose-assign">
                  {team.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={"op-pill" + (pose.operatorId === m.id ? " on" : "")}
                      aria-pressed={pose.operatorId === m.id}
                      onClick={() => patchItem(pose.id, { operatorId: pose.operatorId === m.id ? "" : m.id })}
                    >
                      <i style={{ background: operators.get(m.id)?.color }} />
                      {m.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {pose.notes && <p className="sv-notes">{pose.notes}</p>}
          </div>
        </div>
        <nav className="sv-status pose-status" aria-label="Statut de la pose">
          <button className={"star" + (pose.favorite === true ? " on" : "")} aria-label="Favori" onClick={() => patchItem(pose.id, { favorite: pose.favorite !== true })}>
            <Star size={20} fill={pose.favorite === true ? "currentColor" : "none"} />
          </button>
          <button className={!done(pose) ? "on" : ""} onClick={() => patchItem(pose.id, { status: "prévu" })}>
            À FAIRE
          </button>
          <button
            className={"done" + (done(pose) ? " on" : "")}
            onClick={() => {
              patchItem(pose.id, { status: "terminé" }, `${pose.title} · réalisée`);
              if (at < poses.length - 1) setTimeout(() => go(1), 280);
            }}
          >
            <Check size={22} strokeWidth={3} /> RÉALISÉE
          </button>
        </nav>
      </div>
      {full && current && <MediaViewer media={current} onClose={() => setFull(false)} />}
    </dialog>
  );
}
