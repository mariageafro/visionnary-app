import { useState, type ReactNode } from "react";
import { ArrowRight, Camera, Clapperboard, Plus, UserRound, Users } from "lucide-react";
import type { Item, MediaEntry, ModuleId } from "../../types";
import { done, makeItem, moduleById, orderSections, sectionOf, type Module } from "../../model";
import { isDroneShot, isPhotoShot, isVideoShot, type Count } from "../../stageStats";
import { useProject } from "../../store";
import { CheckBox, Empty, Row, Thumb } from "../../ui";
import { ItemEditor, itemsOf, mediaFor, MediaCard, MemberAvatar, nextOrder, QuickAdd, titleOf, type Operator } from "../common";
import { PickFiles, type ImportTarget } from "../MediaDrop";

export type BoardKind = "photo" | "video" | "drone";
const kindFilter: Record<BoardKind, (i: Item) => boolean> = { photo: isPhotoShot, video: isVideoShot, drone: isDroneShot };
const boardWords: Record<BoardKind, [string, string]> = {
  photo: ["photo", "photos réalisées"],
  video: ["plan vidéo", "plans vidéo tournés"],
  drone: ["plan drone", "plans drone réalisés"],
};

/** Barre d'avancement d'un onglet : « 12 / 30 photos réalisées ». */
export function BoardHead({ count, label, children }: { count: Count; label: string; children?: ReactNode }) {
  return (
    <div className="board-head">
      <div className="board-count">
        <strong>
          {count.done} / {count.total}
        </strong>
        <span>{label}</span>
        <div className="progress dark">
          <span style={{ width: `${count.total ? (count.done / count.total) * 100 : 0}%` }} />
        </div>
      </div>
      {children && <div className="board-actions">{children}</div>}
    </div>
  );
}

/**
 * Plans d'un type (photo, vidéo ou drone) groupés par moment, en grandes cartes illustrées.
 * On ajoute en masse, on importe des photos qui deviennent des plans, on ouvre la fiche plein écran.
 */
export function ShotBoard({
  kind,
  shots,
  visible,
  media,
  operators,
  transitions,
  onOpen,
  onEdit,
  onBulk,
  onImport,
  children,
}: {
  kind: BoardKind;
  shots: Item[];
  visible: (i: Item) => boolean;
  media: MediaEntry[];
  operators: Map<string, Operator>;
  transitions: Map<string, string>;
  onOpen: (shot: Item, order: Item[]) => void;
  onEdit: (shot: Item) => void;
  onBulk: () => void;
  onImport: (files: File[], target: ImportTarget) => void;
  children?: ReactNode;
}) {
  const all = shots.filter(kindFilter[kind]);
  const list = all.filter(visible);
  const sections = orderSections(list.map(sectionOf));
  const order = sections.flatMap((s) => list.filter((i) => sectionOf(i) === s));
  const [noun, doneLabel] = boardWords[kind];
  const target: ImportTarget = kind === "photo" ? "photo" : "video";
  const actions = (
    <>
      <button className="btn gold" onClick={onBulk}>
        <Plus size={17} /> Ajouter<span className="hide-narrow"> des {kind === "photo" ? "photos" : "plans"}</span>
      </button>
      <PickFiles label={<>Importer<span className="hide-narrow"> des images</span></>} onFiles={(files) => onImport(files, target)} />
    </>
  );
  return (
    <>
      <BoardHead count={{ done: list.filter(done).length, total: list.length }} label={doneLabel}>
        {actions}
      </BoardHead>
      {order.length ? (
        sections.map((section) => {
          const group = order.filter((i) => sectionOf(i) === section);
          return (
            <section key={section}>
              <div className="section-title">
                {section}
                <span>
                  {group.filter(done).length}/{group.length}
                </span>
              </div>
              <div className="insp-grid">
                {group.map((shot) => (
                  <MediaCard
                    key={shot.id}
                    item={shot}
                    thumb={mediaFor(media, shot)}
                    icon={kind === "photo" ? <Camera size={26} /> : <Clapperboard size={26} />}
                    operator={operators.get(String(shot.operatorId))}
                    transition={transitions.get(shot.id)}
                    onView={() => onOpen(shot, order)}
                    onEdit={() => onEdit(shot)}
                  />
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <Empty
          icon={kind === "photo" ? <Camera size={32} /> : <Clapperboard size={32} />}
          title={all.length ? "Aucun plan pour ce filtre" : `Aucun ${noun} pour cette étape`}
          text={
            all.length
              ? "Choisissez « Toute l’équipe » pour tout revoir."
              : `Ajoutez une liste d’un coup, ou déposez des images ici : chaque image devient un ${noun} illustré.`
          }
          action={!all.length ? <div className="btn-row" style={{ justifyContent: "center" }}>{actions}</div> : undefined}
        />
      )}
      {children}
    </>
  );
}

/** Grille illustrée (poses, références) avec ajout et import d'images. */
export function ItemGrid({
  items,
  media,
  icon,
  count,
  countLabel,
  addLabel,
  importLabel,
  target,
  onView,
  onEdit,
  onAdd,
  onImport,
  empty,
}: {
  items: Item[];
  media: MediaEntry[];
  icon: ReactNode;
  count?: Count;
  countLabel: string;
  addLabel: string;
  importLabel: string;
  target: ImportTarget;
  onView: (item: Item) => void;
  onEdit: (item: Item) => void;
  onAdd: () => void;
  onImport: (files: File[], target: ImportTarget) => void;
  empty: string;
}) {
  const actions = (
    <>
      <button className="btn gold" onClick={onAdd}>
        <Plus size={17} /> {addLabel}
      </button>
      <PickFiles label={importLabel} onFiles={(files) => onImport(files, target)} />
    </>
  );
  return (
    <>
      {count ? (
        <BoardHead count={count} label={countLabel}>
          {actions}
        </BoardHead>
      ) : (
        <div className="board-head">
          <div className="board-count">
            <strong>{items.length}</strong>
            <span>{countLabel}</span>
          </div>
          <div className="board-actions">{actions}</div>
        </div>
      )}
      {items.length ? (
        <div className="insp-grid">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              thumb={mediaFor(media, item)}
              subtitle={String(item.category || item.framing || "")}
              icon={icon}
              onView={() => onView(item)}
              onEdit={() => onEdit(item)}
            />
          ))}
        </div>
      ) : (
        <Empty icon={icon} title="Rien pour l’instant" text={empty} action={<div className="btn-row" style={{ justifyContent: "center" }}>{actions}</div>} />
      )}
    </>
  );
}

const rowKeys: Partial<Record<ModuleId, string[]>> = {
  lighting: ["role", "direction", "temperature", "power"],
  audio: ["source", "recorder", "backup"],
  drone: ["move", "time", "wind", "authorization"],
  equipment: ["category", "model", "state"],
  reminders: ["trigger", "offset", "due"],
  notes: ["category", "tags"],
};
const summary = (m: Module, i: Item, p: Parameters<typeof titleOf>[0]) =>
  [...(rowKeys[m.id] ?? []).map((k) => i[k]), titleOf(p, i.operatorId), i.notes].filter((v) => v !== undefined && v !== "").join(" · ");

/**
 * Liste d'éléments d'un module rattachés à l'étape (lumières, audio, matériel, rappels, notes…) :
 * un tap pour modifier, un bouton pour ajouter — l'étape est déjà renseignée.
 */
export function LinkedRows({ module, items, stageId, empty, defaults }: { module: ModuleId; items: Item[]; stageId: string; empty: string; defaults?: Partial<Item> }) {
  const { project: p } = useProject();
  const [editing, setEditing] = useState<Item | null>(null);
  const m = moduleById(module)!;
  const add = () => setEditing(makeItem(module, "", { stageId, order: nextOrder(p, module), ...defaults }));
  return (
    <>
      <div className="board-head">
        <div className="board-count">
          <strong>{items.length}</strong>
          <span>{m.label.toLowerCase()}</span>
        </div>
        <div className="board-actions">
          <button className="btn gold" onClick={add}>
            <Plus size={17} /> Ajouter
          </button>
        </div>
      </div>
      {items.length ? (
        <div className="list">
          {items.map((i) => (
            <Row
              key={i.id}
              done={done(i)}
              title={i.title || "Sans titre"}
              sub={summary(m, i, p) || undefined}
              trail={i.priority === "MUST HAVE" ? <span className="chip red">MUST</span> : i.status !== "prévu" ? <span className="chip outline">{i.status}</span> : undefined}
              onClick={() => setEditing(i)}
            />
          ))}
        </div>
      ) : (
        <Empty title="Rien pour l’instant" text={empty} />
      )}
      {editing && <ItemEditor key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

/** Transitions de l'étape : plan de départ → plan d'arrivée, type, inspiration. */
export function TransitionList({ transitions, stageId, media, onEditShot }: { transitions: Item[]; stageId: string; media: MediaEntry[]; onEditShot: (id: string) => void }) {
  const { project: p } = useProject();
  const [editing, setEditing] = useState<Item | null>(null);
  const shotOf = (id: unknown) => p.items.find((i) => i.id === id && i.module === "shots");
  const add = () => setEditing(makeItem("transitions", "", { stageId, category: "montage", order: nextOrder(p, "transitions") }));
  const end = (shot: Item | undefined, label: string) =>
    shot ? (
      <button type="button" className="tr-end" onClick={() => onEditShot(shot.id)} aria-label={label + " : " + shot.title}>
        {mediaFor(media, shot) ? <Thumb media={mediaFor(media, shot)} /> : <span className="tr-empty"><Clapperboard size={18} /></span>}
        <small>{shot.title}</small>
      </button>
    ) : (
      <span className="tr-end is-missing">
        <span className="tr-empty">?</span>
        <small>{label} à choisir</small>
      </span>
    );
  return (
    <>
      <div className="board-head">
        <div className="board-count">
          <strong>{transitions.length}</strong>
          <span>transition{transitions.length > 1 ? "s" : ""} prévue{transitions.length > 1 ? "s" : ""}</span>
        </div>
        <div className="board-actions">
          <button className="btn gold" onClick={add}>
            <Plus size={17} /> Ajouter une transition
          </button>
        </div>
      </div>
      {transitions.length ? (
        <div className="tr-list">
          {transitions.map((t) => {
            const inspiration = media.find((m) => m.itemId === t.id && !m.unsupported);
            return (
              <div key={t.id} className="tr-row">
                {end(shotOf(t.fromId), "Plan de départ")}
                <button type="button" className="tr-type" onClick={() => setEditing(t)}>
                  {inspiration ? <Thumb media={inspiration} className="tr-inspi" /> : <ArrowRight size={22} />}
                  <strong>{String(t.movement || "Transition")}</strong>
                  <small>{t.category === "tournage" ? "Au tournage" : "Au montage"}{t.duration ? ` · ${t.duration} s` : ""}</small>
                </button>
                {end(shotOf(t.toId), "Plan d’arrivée")}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Aucune transition prévue"
          text="Ouvrez un plan : le champ « Transition vers le plan suivant » la crée en un geste. Ou ajoutez-en une ici, avec sa vidéo d’inspiration."
        />
      )}
      {editing && <ItemEditor key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

/** Qui fait quoi dans l'étape ; un tap sur quelqu'un filtre la frise sur ses plans. */
export function TeamPanel({ stage, shots, poses, onFilter }: { stage: Item; shots: Item[]; poses: Item[]; onFilter: (id: string) => void }) {
  const { project: p, update } = useProject();
  const team = itemsOf(p, "team");
  const [assignee, setAssignee] = useState("");
  const unassigned = shots.filter((s) => !s.operatorId);
  const assignAll = () => {
    if (!assignee) return;
    const ids = new Set(unassigned.map((s) => s.id));
    update({ ...p, items: p.items.map((i) => (ids.has(i.id) ? { ...i, operatorId: assignee } : i)) }, `${ids.size} plans affectés à ${titleOf(p, assignee)}`);
  };
  if (!team.length)
    return (
      <Empty
        icon={<Users size={30} />}
        title="Aucun membre dans l’équipe"
        text="Ajoutez votre équipe pour répartir les plans et les photos."
        action={
          <a className="btn gold" href="#/equipe">
            Composer l’équipe
          </a>
        }
      />
    );
  return (
    <div className="stack">
      {stage.operatorId && (
        <p className="muted">
          Responsable de l’étape : <b style={{ color: "var(--text)" }}>{titleOf(p, stage.operatorId)}</b>
        </p>
      )}
      <div className="list">
        {team.map((m) => {
          const mine = shots.filter((s) => s.operatorId === m.id);
          const myPoses = poses.filter((s) => s.operatorId === m.id);
          return (
            <Row
              key={m.id}
              lead={<MemberAvatar member={m} projectId={p.id} />}
              title={m.title}
              sub={[m.role, m.camera, `${mine.filter(done).length}/${mine.length} plans`, myPoses.length ? `${myPoses.length} poses` : ""].filter(Boolean).join(" · ")}
              chevron
              onClick={() => onFilter(m.id)}
            />
          );
        })}
        {unassigned.length > 0 && <Row lead={<UserRound size={22} />} title="Sans affectation" sub={`${unassigned.length} plan(s) à répartir`} chevron onClick={() => onFilter("unassigned")} />}
      </div>
      {unassigned.length > 0 && (
        <div className="card assign-all">
          <strong>Affecter les {unassigned.length} plans sans opérateur</strong>
          <div className="btn-row">
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Membre">
              <option value="">Choisir un membre</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <button className="btn gold" disabled={!assignee} onClick={assignAll}>
              Affecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Checklist de l'étape : cocher d'un tap, ajouter en une ligne. */
export function ChecklistPanel({ tasks, stageId }: { tasks: Item[]; stageId: string }) {
  const { project: p, patchItem, update } = useProject();
  const [editing, setEditing] = useState<Item | null>(null);
  return (
    <>
      <BoardHead count={{ done: tasks.filter(done).length, total: tasks.length }} label="tâches faites" />
      <div className="list">
        {tasks.map((t) => (
          <div className={"row" + (done(t) ? " is-done" : "")} key={t.id}>
            <CheckBox on={done(t)} label={t.title} onToggle={() => patchItem(t.id, { status: done(t) ? "prévu" : "terminé" })} />
            <button className="row-main" style={{ textAlign: "left" }} onClick={() => setEditing(t)}>
              <strong>{t.title}</strong>
              {t.operatorId && <small>{titleOf(p, t.operatorId)}</small>}
            </button>
          </div>
        ))}
        <QuickAdd
          placeholder="Ajouter une tâche à cette étape"
          onAdd={(title) => update({ ...p, items: [...p.items, makeItem("checklists", title, { stageId, phase: "jourj", category: "Tournage", order: nextOrder(p, "checklists") })] }, "Tâche ajoutée")}
        />
      </div>
      {editing && <ItemEditor key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
