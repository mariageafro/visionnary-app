import { useState } from "react";
import {
  Archive,
  Clock3,
  Copy,
  Pencil,
  Play,
  Plus,
  Trash2,
  Star,
  Ban,
  UserCheck,
  Bell,
  Camera,
  Clapperboard,
  Focus,
  HardDrive,
  Heart,
  Images,
  ListChecks,
  MapPin,
  MessageCircle,
  Mic,
  Music2,
  NotebookPen,
  Plane,
  Radio,
  Sun,
  Zap,
  Film,
  Files,
  MoveRight,
  ClipboardList,
  Check,
  Scissors,
} from "lucide-react";
import type { Item, MediaEntry, Project } from "../types";
import { coverage, done, duplicateProject, makeItem, mediaReferenceKeys, moduleById, uid } from "../model";
import { featureItems, features, withOrder } from "../features";
import { useProject } from "../store";
import { deleteMedia, listMedia, putMedia } from "../storage";
import { MediaManager, Row, Screen, Sheet, Tabs, Thumb, navigate, useMedia } from "../ui";
import { fr, itemsOf, ItemEditor, MemberAvatar, QuickAdd, daysUntil, jLabel, nextOrder } from "./common";
import { StageTimeline } from "./Timeline";
import "./shoot.css";

type Tab = "infos" | "planning" | "plans" | "equipe" | "notes";

const sections: [string, string, typeof Clock3, string?][] = [
  ["/deroule", "Déroulé du jour J", Clock3],
  ["/m/shots", "Plans & scènes", Clapperboard],
  ["/m/inspirations", "Inspirations", Images],
  ["/m/teaser", "Teaser", Scissors],
  ["/m/venues", "Lieux & repérage", MapPin],
  ["/checklist", "Checklist", ListChecks],
  ["/rappels", "Rappels", Bell],
  ["/m/equipment", "Matériel", Camera],
  ["/scenes", "Plans de scène", Focus],
  ["/m/lighting", "Lumière", Sun],
  ["/m/audio", "Audio & synchro", Mic],
  ["/m/interviews", "Interviews", MessageCircle, "interviews"],
  ["/m/poses", "Poses", Heart, "photo"],
  ["/m/drone", "Drone", Plane, "drone"],
  ["/m/dance", "Danse & flashmob", Music2, "dance"],
  ["/m/prewedding", "Pré-wedding", Heart, "prewedding"],
  ["/m/sde", "Same-Day Edit", Zap, "sde"],
  ["/m/live", "Live", Radio, "live"],
  ["/m/transitions", "Transitions", MoveRight],
  ["/m/briefings", "Briefings", ClipboardList],
  ["/m/documents", "Documents", Files],
  ["/m/backups", "Sauvegardes", HardDrive],
  ["/m/postproduction", "Montage & livraison", Film],
  ["/notes", "Notes & idées", NotebookPen],
];

function countFor(p: Project, path: string) {
  const id = path.startsWith("/m/") ? path.slice(3) : { "/deroule": "stages", "/checklist": "checklists", "/rappels": "reminders", "/notes": "notes" }[path];
  if (path === "/scenes") return p.scenePlans?.length ?? 0;
  if (path === "/m/teaser")
    return p.items
      .filter((i) => i.module === "inspirations")
      .reduce((sum, item) => {
        try {
          const parsed: unknown = JSON.parse(String(item.segments || "[]"));
          return sum + (Array.isArray(parsed) ? parsed.length : 0);
        } catch {
          return sum;
        }
      }, 0);
  return id ? p.items.filter((i) => i.module === id && i.status !== "archivé").length : 0;
}

export default function Shoot({ tab: initial }: { tab?: string }) {
  const { project: p, w, change, update } = useProject();
  const [tab, setTab] = useState<Tab>((["infos", "planning", "plans", "equipe", "notes"].includes(initial ?? "") ? initial : "infos") as Tab);
  const [edit, setEdit] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [all, setAll] = useState(false);
  const cover = useMedia(p.id, p.id).find((m) => m.id === p.coverId);
  const c = coverage(p);
  const days = daysUntil(p.date);
  const shots = itemsOf(p, "shots");
  const team = itemsOf(p, "team");
  const notes = itemsOf(p, "notes");
  const shown = sections.filter(([path, , , feature]) => all || !feature || p.features?.includes(feature) || countFor(p, path) > 0);

  return (
    <Screen
      title="Détails du tournage"
      backTo="/tournages"
      actions={
        <button className="icon-btn gold" aria-label="Modifier le tournage" onClick={() => setEdit(true)}>
          <Pencil size={18} />
        </button>
      }
    >
      <div className="shoot-cover">
        {cover ? <Thumb media={cover} className="shoot-cover-img" /> : <img className="shoot-cover-img" src="couple.jpg" alt="" />}
        <div className="shoot-cover-shade" />
        <div className="shoot-cover-text">
          {p.features?.includes("démo") && <span className="chip dark">Démonstration · données fictives</span>}
          <h2>{p.name}</h2>
          <p>
            {fr(p.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" })} · {p.venue || "Lieu à définir"}
          </p>
        </div>
        {days !== null && <span className="chip gold shoot-j">{jLabel(days)}</span>}
      </div>

      <div className="grid-2" style={{ margin: "12px 0 16px" }}>
        <button className="btn gold" onClick={() => navigate("/jourj")}>
          <Play size={17} fill="currentColor" /> Mode Jour J
        </button>
        <button className="btn" onClick={() => navigate("/deroule")}>
          <Clock3 size={17} /> Déroulé
        </button>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ["infos", "Infos"],
          ["planning", "Planning"],
          ["plans", "Plans", shots.length],
          ["equipe", "Équipe", team.length],
          ["notes", "Notes", notes.length],
        ]}
      />

      {tab === "infos" && (
        <div className="stack">
          <div className="card kv">
            <div>
              <span>Nombre d’invités</span>
              <b>{p.guests || "—"}</b>
            </div>
            <div>
              <span>Cérémonie</span>
              <b>{p.ceremony || "—"}</b>
            </div>
            <div>
              <span>Lieu de réception</span>
              <b>{p.reception || p.venue || "—"}</b>
            </div>
            <div>
              <span>Wedding planner</span>
              <b>{p.planner || "—"}</b>
            </div>
            <div>
              <span>Services</span>
              <b>{p.services || "—"}</b>
            </div>
            <div>
              <span>Style</span>
              <b>{p.style}</b>
            </div>
            <div>
              <span>Budget</span>
              <b>{p.budget || "—"}</b>
            </div>
            <div>
              <span>Statut</span>
              <b>
                <span className={"chip " + (p.status === "terminé" ? "green" : "gold")}>{p.status}</span>
              </b>
            </div>
          </div>
          <div className="must-grid">
            <div className="card must">
              <Star size={17} />
              <strong>À capturer absolument</strong>
              <p>{p.mustHave || "À préciser avec le couple."}</p>
            </div>
            <div className="card must">
              <Ban size={17} />
              <strong>À éviter</strong>
              <p>{p.avoid || "—"}</p>
            </div>
            <div className="card must">
              <UserCheck size={17} />
              <strong>Personnes & moments prioritaires</strong>
              <p>{p.priorities || "—"}</p>
            </div>
          </div>
          <div className="section-title">
            Préparation
            <button onClick={() => setAll(!all)}>{all ? "Seulement l’utile" : "Tout afficher"}</button>
          </div>
          <div className="tiles wide">
            {shown.map(([path, label, Icon]) => (
              <a key={path} className="tile dark" href={"#" + path}>
                <Icon size={20} />
                <strong>{label}</strong>
                <small>{countFor(p, path) || "—"}</small>
              </a>
            ))}
          </div>
          <div className="section-title">Tournage</div>
          <div className="btn-row">
            <button
              className="btn small"
              onClick={async () => {
                const copy = duplicateProject(p);
                // duplicateProject garde les mêmes identifiants de médias (pratique pour un modèle
                // à réutiliser) : on duplique ici les fichiers eux-mêmes pour ce nouveau tournage,
                // puis on fait pointer la copie sur ces nouveaux fichiers.
                const itemIds = new Map(p.items.map((item, n) => [item.id, copy.items[n].id]));
                const originalMedia = await listMedia(p.id);
                const mediaIds = new Map<string, string>();
                for (const entry of originalMedia) {
                  const newId = uid();
                  mediaIds.set(entry.id, newId);
                  const next: MediaEntry = { ...entry, id: newId, projectId: copy.id, itemId: itemIds.get(entry.itemId) ?? entry.itemId };
                  await putMedia(next);
                }
                const remapMedia = (id?: string) => (id ? mediaIds.get(id) : undefined);
                const items = copy.items.map((item) => {
                  const next = { ...item };
                  for (const key of mediaReferenceKeys) if (next[key]) { const mapped = remapMedia(String(next[key])); if (mapped) next[key] = mapped; else delete next[key]; }
                  return next;
                });
                const scenePlans = copy.scenePlans?.map((plan) => ({
                  ...plan,
                  background: plan.background && remapMedia(plan.background.mediaId) ? { ...plan.background, mediaId: remapMedia(plan.background.mediaId)! } : undefined,
                  model3dId: remapMedia(plan.model3dId),
                  elements: plan.elements.map((el) => (el.referenceId ? { ...el, referenceId: remapMedia(el.referenceId) } : el)),
                }));
                const withMedia = { ...copy, items, scenePlans };
                change({ ...w, projects: [...w.projects, withMedia], activeProjectId: withMedia.id }, "Copie créée avec ses médias, progression remise à zéro");
              }}
            >
              <Copy size={15} /> Dupliquer
            </button>
            <button className="btn small" onClick={() => update({ ...p, status: p.status === "archivé" ? "en préparation" : "archivé" }, p.status === "archivé" ? "Désarchivé" : "Archivé")}>
              <Archive size={15} /> {p.status === "archivé" ? "Désarchiver" : "Archiver"}
            </button>
            <button
              className="btn small danger"
              onClick={async () => {
                if (!confirm(`Supprimer définitivement « ${p.name} » et ses médias de cet appareil ? Exportez une sauvegarde avant si besoin.`)) return;
                for (const m of await listMedia(p.id)) await deleteMedia(m.id);
                const rest = w.projects.filter((x) => x.id !== p.id);
                change({ ...w, projects: rest, activeProjectId: rest[0]?.id ?? "" }, "Tournage supprimé");
                navigate("/tournages");
              }}
            >
              <Trash2 size={15} /> Supprimer
            </button>
          </div>
        </div>
      )}

      {tab === "planning" && (
        <div className="card">
          <StageTimeline project={p} />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn gold" onClick={() => setEditing(makeItem("stages", "", { order: nextOrder(p, "stages"), duration: 30 }))}>
              <Plus size={16} /> Ajouter une étape
            </button>
            <button className="btn" onClick={() => navigate("/deroule")}>
              Régie & vue liste
            </button>
          </div>
        </div>
      )}

      {tab === "plans" && (
        <div className="stack">
          <div className="card">
            <div className="list-head" style={{ padding: "0 0 8px" }}>
              Couverture
              <span>
                {c.completed}/{c.total} · {c.percent} %
              </span>
            </div>
            <div className="progress">
              <span style={{ width: c.percent + "%" }} />
            </div>
            {c.critical > 0 && <p className="muted" style={{ marginTop: 8 }}>{c.critical} plan(s) essentiel(s) restant(s)</p>}
          </div>
          <div className="list">
            {shots.slice(0, 12).map((s) => (
              <Row
                key={s.id}
                done={done(s)}
                title={s.title}
                sub={[s.framing, moduleById("stages") && p.items.find((i) => i.id === s.stageId)?.title].filter(Boolean).join(" · ")}
                trail={s.priority === "MUST HAVE" ? <span className="chip red">MUST</span> : <span className="chip outline">{s.status}</span>}
                onClick={() => setEditing(s)}
              />
            ))}
          </div>
          <a className="btn full" href="#/m/shots">
            Tous les plans ({shots.length})
          </a>
        </div>
      )}

      {tab === "equipe" && (
        <div className="stack">
          <div className="list">
            {team.map((m) => (
              <Row key={m.id} lead={<MemberAvatar member={m} projectId={p.id} />} title={m.title} sub={String(m.role || "Rôle à définir")} chevron onClick={() => setEditing(m)} />
            ))}
            <QuickAdd placeholder="Ajouter un membre (prénom)" onAdd={(title) => update({ ...p, items: [...p.items, makeItem("team", title, { order: nextOrder(p, "team") })] }, "Membre ajouté")} />
          </div>
          <a className="btn full" href="#/equipe">
            Missions & rôles
          </a>
        </div>
      )}

      {tab === "notes" && (
        <div className="list">
          <QuickAdd placeholder="Écrire une note…" onAdd={(title) => update({ ...p, items: [...p.items, makeItem("notes", title, { category: "Note", order: nextOrder(p, "notes") })] }, "Note ajoutée")} />
          {notes.map((n) => (
            <Row key={n.id} title={n.title} sub={[n.category, n.notes].filter(Boolean).join(" · ")} onClick={() => setEditing(n)} />
          ))}
        </div>
      )}

      {edit && (
        <ShootEditor
          project={p}
          onClose={() => setEdit(false)}
          onSave={(next) => {
            update(next, "Tournage mis à jour");
            setEdit(false);
          }}
        />
      )}
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </Screen>
  );
}

function ShootEditor({ project, onClose, onSave }: { project: Project; onClose: () => void; onSave: (p: Project) => void }) {
  const [p, setP] = useState(project);
  const text = (key: keyof Project, label: string, type = "text", span = false) => (
    <label className={"field" + (span ? " span" : "")}>
      {label}
      <input
        type={type}
        value={String(p[key] ?? "")}
        onChange={(e) => setP({ ...p, [key]: type === "number" ? Number(e.target.value) || 0 : e.target.value })}
      />
    </label>
  );
  const area = (key: keyof Project, label: string) => (
    <label className="field span">
      {label}
      <textarea value={String(p[key] ?? "")} onChange={(e) => setP({ ...p, [key]: e.target.value })} />
    </label>
  );
  const added = (p.features ?? []).filter((f) => !(project.features ?? []).includes(f));
  return (
    <Sheet title="Modifier le tournage" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!p.name.trim()) return;
          // Une option ajoutée après coup apporte ses éléments (sans dupliquer les étapes de base).
          onSave({ ...p, name: p.name.trim(), items: [...p.items, ...withOrder(featureItems(added), p.items)] });
        }}
      >
        <div className="form-grid">
          {text("name", "Nom du tournage", "text", true)}
          {text("couple", "Couple")}
          {text("date", "Date", "date")}
          {text("venue", "Lieu principal")}
          {text("guests", "Nombre d’invités", "number")}
          {text("ceremony", "Cérémonie (heure, lieu)")}
          {text("reception", "Lieu de réception")}
          {text("planner", "Wedding planner")}
          {text("services", "Services")}
          {text("budget", "Budget")}
          <label className="field">
            Statut
            <select value={p.status} onChange={(e) => setP({ ...p, status: e.target.value })}>
              {["en préparation", "jour J", "montage", "terminé", "archivé"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {text("style", "Style")}
          {area("mustHave", "À capturer absolument")}
          {area("avoid", "À éviter")}
          {area("priorities", "Personnes & moments prioritaires, traditions")}
          <div className="field span">
            Programme
            <div className="choices">
              {features.map((f) => {
                const on = p.features?.includes(f.id);
                return (
                  <button
                    type="button"
                    key={f.id}
                    className={"choice" + (on ? " on" : "")}
                    onClick={() => setP({ ...p, features: on ? (p.features ?? []).filter((x) => x !== f.id) : [...(p.features ?? []), f.id] })}
                  >
                    {on && <Check size={14} />}
                    {f.label}
                  </button>
                );
              })}
            </div>
            {added.length > 0 && <small>Les étapes, plans et checklists des options ajoutées seront créés.</small>}
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn gold">
            <Check size={16} /> Enregistrer
          </button>
        </div>
      </form>
      <MediaManager projectId={p.id} itemId={p.id} title="Photo de couverture" coverId={p.coverId} onCover={(id) => setP({ ...p, coverId: id })} />
    </Sheet>
  );
}
