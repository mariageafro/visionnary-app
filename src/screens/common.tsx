import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRightLeft, Camera, Check, Clapperboard, Copy, Focus, Maximize2, MoreHorizontal, Pencil, Plane, Play, Plus, RotateCcw, Scissors, Star, Sun, Trash2, UserRound, Users, Video } from "lucide-react";
import type { Item, MediaEntry, ModuleId, Project } from "../types";
import { done, framingCode, makeItem, moduleById, priorities, statuses, uid, type Field } from "../model";
import { shotKind } from "../stageStats";
import { useProject } from "../store";
import { MediaManager, MediaViewer, Sheet, useMedia, useObjectUrl, Thumb } from "../ui";
import FramingPicto from "./FramingPicto";

export const fr = (date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + "T12:00").toLocaleDateString("fr-FR", options) : "Date à définir";
export const dayMonth = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? {
        day: String(Number(date.slice(8, 10))),
        month: new Date(date + "T12:00").toLocaleDateString("fr-FR", { month: "short" }).replace(".", "").toUpperCase(),
      }
    : { day: "—", month: "" };
export function daysUntil(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((new Date(date + "T12:00").getTime() - today.getTime()) / 86400000);
}
export const jLabel = (days: number | null) =>
  days === null ? "" : days === 0 ? "Jour J" : days > 0 ? `J−${days}` : `il y a ${-days} j`;

export const itemsOf = (p: Project, module: ModuleId, archived = false) =>
  p.items.filter((i) => i.module === module && (archived || i.status !== "archivé")).sort((a, b) => a.order - b.order);
export const titleOf = (p: Project, id: unknown) => (id ? p.items.find((i) => i.id === id)?.title : undefined);
export const nextOrder = (p: Project, module: ModuleId) =>
  Math.max(-1, ...p.items.filter((i) => i.module === module).map((i) => i.order)) + 1;

/* ---------- Équipe : une couleur fixe par personne, partout dans l'app ---------- */
const teamColors = ["#4d8fe0", "#d8568a", "#22a3a8", "#8b62e0", "#e08a3c", "#5fb3e0", "#c46bd1", "#9aa84a"];
export interface Operator {
  id: string;
  name: string;
  color: string;
}
/** Membres de l'équipe avec leur couleur (rang dans l'équipe : deux personnes n'ont jamais la même tant qu'on est moins de 8). */
export function operatorsOf(p: Project): Map<string, Operator> {
  return new Map(itemsOf(p, "team", true).map((m, n) => [m.id, { id: m.id, name: m.title, color: teamColors[n % teamColors.length] }]));
}
/** « 85 mm · portrait » → « 85 mm » : le chiffre suffit sur une carte. */
export const shortFocal = (focal: unknown) => String(focal ?? "").split("·")[0].trim();

/**
 * Choix du cadreur en un geste : des pastilles, pas un menu déroulant.
 * `counts` affiche le reste à faire de chacun ; « Sans affectation » en option.
 */
export function OperatorPills({
  project,
  value,
  onChange,
  counts,
  unassigned = false,
  label = "Cadreur affiché",
}: {
  project: Project;
  value: string;
  onChange: (id: string) => void;
  counts?: Map<string, number>;
  unassigned?: boolean;
  label?: string;
}) {
  const operators = operatorsOf(project);
  const team = itemsOf(project, "team").map((m) => operators.get(m.id)!);
  const pill = (id: string, content: ReactNode) => (
    <button key={id || "all"} type="button" aria-pressed={value === id} className={"op-pill" + (value === id ? " on" : "")} onClick={() => onChange(id)}>
      {content}
    </button>
  );
  return (
    <div className="op-pills" role="group" aria-label={label}>
      {pill("", <><Users size={15} /> Toute l’équipe{counts?.has("") && <small>{counts.get("")}</small>}</>)}
      {team.map((op) =>
        pill(
          op.id,
          <>
            <i style={{ background: op.color }} />
            {op.name}
            {counts?.has(op.id) && <small>{counts.get(op.id)}</small>}
          </>,
        ),
      )}
      {unassigned && pill("unassigned", <><UserRound size={15} /> Sans affectation{counts?.has("unassigned") && <small>{counts.get("unassigned")}</small>}</>)}
    </div>
  );
}

export function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="quick-add"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onAdd(value.trim());
        setValue("");
      }}
    >
      <input className="input" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => setValue(e.target.value)} />
      <button className="btn gold" aria-label="Ajouter" disabled={!value.trim()}>
        <Plus size={18} />
      </button>
    </form>
  );
}

export function Initials({ name }: { name: string }) {
  return (
    <>
      {name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </>
  );
}

/** Avatar : première photo associée au membre, sinon initiales. */
export function MemberAvatar({ member, projectId }: { member: Item; projectId: string }) {
  const photo = useMedia(projectId, member.id).find((m) => m.type.startsWith("image/") && !m.unsupported);
  return (
    <span className="avatar">
      {photo ? <Thumb media={photo} className="avatar-thumb" /> : <Initials name={member.title} />}
    </span>
  );
}

/* ---------- Galerie (Plans & scènes, Inspirations, Poses, Lieux) ---------- */

/**
 * Média de référence pour un élément : le sien, puis le clip source, puis celui d'une inspiration liée.
 * Jamais un fichier illisible (HEIC…) — la carte affiche alors son icône de repli plutôt qu'un cadre cassé.
 */
export function mediaFor(media: MediaEntry[], item: Item): MediaEntry | undefined {
  const visual = (m: MediaEntry) => !m.unsupported && (m.type.startsWith("image/") || m.type.startsWith("video/"));
  return (
    media.find((m) => m.id === item.coverId && visual(m)) ??
    media.find((m) => m.itemId === item.id && visual(m)) ??
    media.find((m) => m.id === item.sourceMediaId && visual(m)) ??
    media.find((m) => m.itemId === item.referenceId && visual(m))
  );
}
export const clockShort = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/** Champs à afficher en un coup d'œil selon le module (mouvement, sujet, angle, cadrage…). */
const highlights: Partial<Record<ModuleId, string[]>> = {
  // Cadrage, focale, mouvement d'abord (l'opérateur suit) : ce qu'on vérifie avant de tourner.
  shots: ["framing", "focal", "movement", "angle", "subject", "camera", "light"],
  inspirations: ["category", "framing", "intention", "tags"],
  poses: ["category", "framing", "focal", "hands", "light"],
  venues: ["address", "zones", "access"],
  drone: ["move", "wind", "authorization"],
};

const skippedShot = (i: Item) => ["sauté", "impossible"].includes(i.status);

/** Où en est le plan, lisible de loin : tourné, excellent, à refaire, sauté. */
function ShotStatus({ item }: { item: Item }) {
  if (item.status === "excellent")
    return (
      <span className="insp-status gold">
        <Star size={11} fill="currentColor" /> Excellent
      </span>
    );
  if (done(item))
    return (
      <span className="insp-status green">
        <Check size={12} strokeWidth={3} /> Tourné
      </span>
    );
  if (item.status === "à refaire")
    return (
      <span className="insp-status orange">
        <RotateCcw size={11} strokeWidth={3} /> À refaire
      </span>
    );
  if (skippedShot(item)) return <span className="insp-status">{item.status === "sauté" ? "Sauté" : "Impossible"}</span>;
  return null;
}

/**
 * Carte de galerie : la référence en grand, dégradé, titre et repères en overlay.
 * Pour un plan : état (tourné, à refaire…), cadrage · mouvement, focale et opérateur, sans rien ouvrir.
 * Un tap sur l'image ouvre l'aperçu rapide ; le petit bouton coin ouvre directement l'édition.
 */
export function MediaCard({
  item,
  thumb,
  subtitle,
  icon,
  onView,
  onEdit,
  operator,
  transition,
  animate = false,
}: {
  item: Item;
  animate?: boolean;
  thumb?: MediaEntry;
  /** Pour un plan, calculé si absent : valeur de plan (code CU, MCU…) · mouvement. */
  subtitle?: string;
  icon: ReactNode;
  onView: () => void;
  onEdit: () => void;
  operator?: Operator;
  /** Transition prévue vers le plan suivant. */
  transition?: string;
}) {
  const isVideo = thumb?.type.startsWith("video/");
  const isShot = item.module === "shots";
  const focal = isShot ? shortFocal(item.focal) : "";
  const kind = isShot ? shotKind(item) : undefined;
  const KindIcon = kind === "photo" ? Camera : kind === "video" ? Video : kind === "drone" ? Plane : null;
  const line = subtitle ?? (isShot ? [framingCode(item.framing) || item.framing, item.movement].filter(Boolean).join(" · ") : "");
  return (
    <div className={"insp-card" + (isShot && done(item) ? " is-done" : "") + (isShot && skippedShot(item) ? " is-skipped" : "")}>
      <button type="button" className="insp-media" onClick={onView} aria-label={(isVideo ? "Lire " : "Voir ") + (item.title || "l’élément")}>
        {thumb ? (
          <Thumb media={thumb} className="insp-thumb" animate={animate} />
        ) : isShot && framingCode(item.framing) ? (
          <span className="insp-empty has-picto">
            <FramingPicto framing={item.framing} who={item.person || item.subject} orientation={item.orientation} />
          </span>
        ) : (
          <span className="insp-empty">{icon}</span>
        )}
        <span className="insp-shade" />
        <span className="insp-badges">
          {isShot && <ShotStatus item={item} />}
          {item.priority === "MUST HAVE" && !(isShot && done(item)) && <span className="chip red">MUST</span>}
          {isVideo && Number(thumb?.duration) > 0 && (
            <span className="chip dark insp-duration">
              <Play size={9} fill="#fff" /> {clockShort(Number(thumb!.duration))}
            </span>
          )}
        </span>
        <span className="insp-info">
          <strong>{item.title || "Sans titre"}</strong>
          {(line || KindIcon) && (
            <small className="insp-line">
              {KindIcon && <KindIcon size={11} aria-label={kind === "photo" ? "Photo" : kind === "drone" ? "Drone" : "Vidéo"} />}
              {line}
            </small>
          )}
          {(focal || operator || transition) && (
            <span className="insp-meta">
              {focal && <span className="insp-tag">{focal}</span>}
              {operator && (
                <span className="insp-tag">
                  <i style={{ background: operator.color }} />
                  {operator.name}
                </span>
              )}
              {transition && (
                <span className="insp-tag gold" title={"Transition vers le plan suivant : " + transition}>
                  <ArrowRightLeft size={10} /> {transition}
                </span>
              )}
            </span>
          )}
        </span>
      </button>
      <button type="button" className="icon-btn insp-edit" aria-label={"Modifier " + (item.title || "l’élément")} onClick={onEdit}>
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}

const specIcons: Record<string, ReactNode> = {
  framing: <Maximize2 size={13} />,
  angle: <Focus size={13} />,
  focal: <Focus size={13} />,
  movement: <Clapperboard size={13} />,
  camera: <Camera size={13} />,
  subject: <Users size={13} />,
  light: <Sun size={13} />,
};

/**
 * Aperçu rapide : la référence en grand (photo ou vidéo jouable), puis les repères de tournage
 * (cadrage, angle, mouvement, caméra, sujet…) sans ouvrir le formulaire complet.
 */
export function QuickView({
  item,
  media,
  onClose,
  onEdit,
  onTransform,
}: {
  item: Item;
  media: MediaEntry[];
  onClose: () => void;
  onEdit: () => void;
  /** Inspirations : crée un plan à partir de cette référence. */
  onTransform?: () => void;
}) {
  const { project, addItems, patchItem } = useProject();
  const module = moduleById(item.module)!;
  const thumb = mediaFor(media, item);
  const [full, setFull] = useState(false);
  const keys = (highlights[item.module] ?? module.fields.slice(0, 4).map((f) => f.key)).filter((k) => item[k]);
  const operator = item.module === "shots" ? operatorsOf(project).get(String(item.operatorId)) : undefined;
  const spec = (k: string) => (
    <div key={k}>
      {specIcons[k]}
      <span>{module.fields.find((f) => f.key === k)?.label ?? k}</span>
      <strong>{String(item[k])}</strong>
    </div>
  );
  const isVideo = thumb?.type.startsWith("video/");
  const hasClip = Number(item.clipOut) > Number(item.clipIn || 0);
  return (
    <Sheet title={item.title || module.label} onClose={onClose}>
      <div className="stack">
        <div className="quickview-media">
          {thumb && !thumb.unsupported ? (
            isVideo ? (
              <VideoPreview media={thumb} clip={hasClip ? { in: Number(item.clipIn || 0), out: Number(item.clipOut) } : undefined} />
            ) : (
              <button type="button" className="quickview-photo" onClick={() => setFull(true)} aria-label="Agrandir la photo">
                <Thumb media={thumb} className="quickview-thumb" full />
              </button>
            )
          ) : (
            <div className="quickview-empty">
              <Camera size={28} />
              <span>Aucune référence pour l’instant</span>
            </div>
          )}
          {item.priority === "MUST HAVE" && <span className="chip red quickview-must">MUST HAVE</span>}
        </div>
        {isVideo && (
          <button className="btn small" onClick={() => setFull(true)}>
            <Maximize2 size={14} /> Plein écran
          </button>
        )}
        {(keys.length > 0 || operator) && (
          <div className="quickview-specs">
            {keys.slice(0, 3).map((k) => spec(k))}
            {operator && (
              <div>
                <i className="op-dot" style={{ background: operator.color }} />
                <span>Opérateur</span>
                <strong>{operator.name}</strong>
              </div>
            )}
            {keys.slice(3).map((k) => spec(k))}
          </div>
        )}
        {item.notes && <p className="quickview-notes">{item.notes}</p>}
        <div className="btn-row">
          <button className="btn gold" onClick={onEdit}>
            <Pencil size={15} /> Modifier
          </button>
          {item.module === "shots" && (
            <button
              className={"btn " + (done(item) ? "" : "small")}
              onClick={() => {
                patchItem(item.id, { status: done(item) ? "prévu" : "tourné" }, done(item) ? undefined : "Plan marqué tourné");
                onClose();
              }}
            >
              <Check size={15} /> {done(item) ? "Marqué tourné" : "Marquer tourné"}
            </button>
          )}
          {onTransform && (
            <button
              className="btn"
              onClick={() => {
                onTransform();
                onClose();
              }}
            >
              <Scissors size={15} /> Transformer en plan
            </button>
          )}
        </div>
      </div>
      {full && thumb && (
        <MediaViewer
          media={thumb}
          onClose={() => setFull(false)}
          clip={hasClip ? { in: Number(item.clipIn || 0), out: Number(item.clipOut) } : undefined}
          onClip={
            isVideo
              ? (range) => {
                  addItems(
                    [
                      makeItem("shots", `${item.title} · ${range.in.toFixed(1)}–${range.out.toFixed(1)} s`, {
                        referenceId: item.module === "inspirations" ? item.id : item.referenceId,
                        sourceMediaId: thumb.id,
                        clipIn: range.in,
                        clipOut: range.out,
                        framing: item.framing,
                        order: 0,
                      }),
                    ],
                    "Plan créé à partir du clip",
                  );
                }
              : undefined
          }
        />
      )}
    </Sheet>
  );
}

/** Lecture inline (sans plein écran) de la vidéo de référence, calée sur le clip marqué s'il existe. */
export function VideoPreview({ media, clip, className = "quickview-video", loop = true }: { media: MediaEntry; clip?: { in: number; out: number }; className?: string; loop?: boolean }) {
  const url = useObjectUrl(media.blob);
  return (
    <video
      className={className}
      loop={loop}
      src={url || undefined}
      controls
      playsInline
      onLoadedMetadata={(e) => {
        if (clip) e.currentTarget.currentTime = clip.in;
      }}
      onTimeUpdate={(e) => {
        if (clip && clip.out > clip.in && e.currentTarget.currentTime >= clip.out) { if(loop)e.currentTarget.currentTime=clip.in; else e.currentTarget.pause(); }
      }}
    />
  );
}

function FieldInput({ field, item, project, set }: { field: Field; item: Item; project: Project; set: (key: string, v: string | number) => void }) {
  const value = item[field.key];
  if (field.link)
    return (
      <select value={String(value ?? "")} onChange={(e) => set(field.key, e.target.value)}>
        <option value="">Non défini</option>
        {project.items
          .filter((x) => x.module === field.link && x.status !== "archivé")
          .sort((a, b) => a.order - b.order)
          .map((x) => (
            <option key={x.id} value={x.id}>
              {x.module === "stages" && x.time ? `${x.time} · ` : ""}
              {x.title}
            </option>
          ))}
      </select>
    );
  if (field.choices)
    return (
      <select value={String(value ?? field.choices[0][0])} onChange={(e) => set(field.key, e.target.value)}>
        {field.choices.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    );
  if (field.long) return <textarea value={String(value ?? "")} onChange={(e) => set(field.key, e.target.value)} />;
  const list = field.suggest ? "list-" + field.key : undefined;
  return (
    <>
      <input
        type={field.type || "text"}
        list={list}
        min={field.type === "number" ? 0 : undefined}
        step={field.type === "number" ? "any" : undefined}
        inputMode={field.type === "number" ? "decimal" : undefined}
        value={String(value ?? "")}
        onChange={(e) => set(field.key, field.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)}
      />
      {list && (
        <datalist id={list}>
          {field.suggest!.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </>
  );
}

/** Éditeur commun à tous les modules : champs du module, médias, duplication, suppression. */
export function ItemEditor({ item, onClose, extra }: { item: Item; onClose: () => void; extra?: ReactNode }) {
  const { project: p, update, removeItem, addItems } = useProject();
  const module = moduleById(item.module)!;
  const [draft, setDraft] = useState(item);
  const exists = p.items.some((i) => i.id === item.id);
  const set = (key: string, v: string | number) => setDraft((d) => ({ ...d, [key]: v }));
  const isShot = item.module === "shots";
  function save(e?: FormEvent) {
    e?.preventDefault();
    if (!draft.title.trim()) return;
    const clean: Item = { ...draft, title: draft.title.trim() };
    if (Number(clean.clipOut) && Number(clean.clipOut) <= Number(clean.clipIn || 0)) {
      alert("Le point OUT doit être après le point IN.");
      return;
    }
    update(
      {
        ...p,
        items: exists ? p.items.map((i) => (i.id === clean.id ? clean : i)) : [...p.items, { ...clean, order: clean.order || p.items.filter((i) => i.module === clean.module).length }],
      },
      exists ? "Enregistré" : "Ajouté",
    );
    onClose();
  }
  return (
    <Sheet
      title={exists ? module.label : "Ajouter · " + module.label}
      onClose={onClose}
      actions={
        exists ? (
          <>
            <button
              className="icon-btn"
              aria-label="Dupliquer"
              onClick={() => {
                const copy: Item = { ...draft, id: uid(), title: draft.title + " (copie)", order: p.items.filter((i) => i.module === draft.module).length };
                addItems([copy], "Copie créée");
                onClose();
              }}
            >
              <Copy size={18} />
            </button>
            <button
              className="icon-btn danger"
              aria-label="Supprimer"
              onClick={() => {
                removeItem(item.id, `« ${item.title} » supprimé`);
                onClose();
              }}
            >
              <Trash2 size={18} />
            </button>
          </>
        ) : null
      }
    >
      <form onSubmit={save} className="stack">
        <label className="field">
          Titre
          <input autoFocus={!exists} required maxLength={200} value={draft.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <div className="form-grid">
          {(isShot || ["checklists", "reminders", "postproduction"].includes(item.module) || exists) && (
            <label className="field">
              Statut
              <select value={draft.status} onChange={(e) => set("status", e.target.value)}>
                {[...new Set([...statuses, "archivé", draft.status])].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
          {["shots", "checklists", "inspirations", "drone", "poses"].includes(item.module) && (
            <label className="field">
              Priorité
              <select value={draft.priority} onChange={(e) => set("priority", e.target.value)}>
                {priorities.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
          {module.fields
            .filter((f) => !f.when || f.when(draft))
            .map((f) => (
              <label className={"field" + (f.long ? " span" : "")} key={f.key}>
                {f.label}
                <FieldInput field={f} item={draft} project={p} set={set} />
              </label>
            ))}
          <label className="field span">
            Notes / consignes
            <textarea value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
          </label>
        </div>
        {extra}
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn gold">
            <Check size={17} /> Enregistrer
          </button>
        </div>
      </form>
      {exists ? (
        <MediaManager
          projectId={p.id}
          itemId={item.id}
          title={item.module === "team" ? "Photo du membre" : item.module === "venues" ? "Photos & vidéos de repérage" : "Références photo & vidéo"}
          onClip={
            item.module === "inspirations" || item.module === "shots"
              ? (media, range) =>
                  addItems(
                    [
                      makeItem("shots", `${draft.title} · ${range.in.toFixed(1)}–${range.out.toFixed(1)} s`, {
                        referenceId: item.module === "inspirations" ? item.id : draft.referenceId,
                        sourceMediaId: media.id,
                        clipIn: range.in,
                        clipOut: range.out,
                        stageId: draft.stageId,
                        framing: draft.framing,
                        order: p.items.filter((i) => i.module === "shots").length,
                      }),
                    ],
                    "Plan créé à partir du clip",
                  )
              : undefined
          }
        />
      ) : (
        <p className="notice" style={{ marginTop: 16 }}>
          Enregistrez d’abord pour ajouter photos et vidéos.
        </p>
      )}
    </Sheet>
  );
}
