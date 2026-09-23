import { useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Camera,
  Clapperboard,
  Clock3,
  Copy,
  Heart,
  Images,
  Layers,
  MapPin,
  Pencil,
  Plane,
  Play,
  Plus,
  Sun,
  Users,
  Video,
} from "lucide-react";
import type { Item } from "../types";
import { done, duplicateStage, makeItem, orderSections, poseCategories, sectionOf, shotSections, stageTemplate } from "../model";
import { friseMoments, stageFrise, toClock } from "../moments";
import { runStages } from "../schedule";
import { stageItems, stageStats } from "../stageStats";
import { useProject } from "../store";
import { Empty, Screen, Sheet, Tabs, navigate, useMedia } from "../ui";
import { AddressLinks, ItemEditor, MemberAvatar, OperatorPills, QuickView, nextOrder, operatorsOf } from "./common";
import BulkAdd from "./BulkAdd";
import { DropVeil, ImportProgress, ImportSheet, useFileDrop, useImporter, type ImportTarget } from "./MediaDrop";
import MomentSplit from "./MomentSplit";
import PoseBoard from "./PoseBoard";
import StageScene from "../scene/StageScene";
import ShotViewer from "./ShotViewer";
import { stageLook } from "./stageIcons";
import Frise from "./stage/Frise";
import { ChecklistPanel, ItemGrid, LinkedRows, ShotBoard, TeamPanel, TransitionList } from "./stage/Boards";
import "./stage.css";

type Tab = "frise" | "scene" | "photo" | "video" | "drone" | "poses" | "transitions" | "references" | "team" | "checklist" | "reminders" | "lights" | "audio" | "gear" | "notes";
const importDefaults: Partial<Record<Tab, ImportTarget>> = { photo: "photo", video: "video", drone: "video", poses: "pose", references: "reference" };

/** Anneau de progression : lisible de loin, même en plein soleil. */
function Ring({ percent, label }: { percent: number; label: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`${percent} % des plans tournés`}>
      <svg viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} className="ring-track" />
        <circle cx="32" cy="32" r={r} className="ring-value" strokeDasharray={`${(percent / 100) * c} ${c}`} />
      </svg>
      <strong>{percent}%</strong>
      <small>{label}</small>
    </div>
  );
}

/**
 * Tableau de bord d'une étape : ce qui se passe, où, qui, combien de plans et de photos, ce qui
 * reste, la prochaine action — puis un onglet par facette (frise, photo, vidéo, poses, transitions…).
 */
export default function Stage({ id }: { id: string }) {
  const { project: p, w, addItems, change, notify } = useProject();
  const stage = p.items.find((i) => i.id === id && i.module === "stages");
  const [tab, setTab] = useState<Tab>("frise");
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewing, setViewing] = useState<Item | null>(null);
  const [viewer, setViewer] = useState<{ ids: string[]; start: number; context: string } | null>(null);
  const [bulk, setBulk] = useState<{ kind: "video" | "photo" | "drone" | "both"; section: string } | null>(null);
  const [pending, setPending] = useState<{ files: File[]; target: ImportTarget } | null>(null);
  const [operator, setOperator] = useState("");
  const [newSection, setNewSection] = useState<{ title: string; parentId: string } | null>(null);
  const media = useMedia(p.id);
  const importer = useImporter();
  const dragging = useFileDrop((files) => setPending({ files, target: importDefaults[tab] ?? "photo" }), !!stage);

  if (!stage)
    return (
      <Screen title="Étape introuvable" backTo="/deroule">
        <Empty title="Cette étape n’existe plus" text="Retrouvez les étapes disponibles dans le déroulé." />
      </Screen>
    );

  const items = stageItems(p, id);
  const stats = stageStats(items);
  const operators = operatorsOf(p);
  const visible = (i: Item) => !operator || (operator === "unassigned" ? !i.operatorId : i.operatorId === operator);
  const shots = items.shots;
  const transitions = new Map(items.transitions.filter((t) => t.fromId).map((t) => [String(t.fromId), String(t.movement || "Transition")]));
  const configuredSections = p.shotSections ?? [];
  const sectionChoices = orderSections([...shots.map(sectionOf), ...configuredSections.map((s) => s.title), ...shotSections]);
  const saveNewSection = () => {
    if (!newSection?.title.trim()) return;
    const parent = configuredSections.find((s) => s.id === newSection.parentId);
    const title = parent ? `${parent.title} · ${newSection.title.trim()}` : newSection.title.trim();
    if (configuredSections.some((s) => s.title === title) || sectionChoices.includes(title)) return;
    change({ ...w, projects: w.projects.map((project) => project.id === p.id ? { ...p, shotSections: [...configuredSections, { id: crypto.randomUUID(), title, order: configuredSections.length, ...(parent ? { parentId: parent.id } : {}) }] } : project) }, `Section « ${title} » créée`);
    setNewSection(null);
  };
  const { Icon, color } = stageLook(stage.title, stage);
  const venue = p.items.find((i) => i.id === stage.venueId);
  const frise = stageFrise(p, stage, shots);
  const nextMoment = friseMoments(frise).find((m) => m.shots.some((s) => !done(s) && !["sauté", "impossible"].includes(s.status)));
  const nextShot = nextMoment?.shots.find((s) => !done(s) && !["sauté", "impossible"].includes(s.status));
  const run = runStages(p).find((r) => r.item.id === id);
  const now = Date.now();
  const status = !run
    ? ""
    : run.state === "terminée"
      ? "Étape terminée"
      : run.state === "en cours"
        ? `En cours depuis ${new Date(run.startedAt!).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}${run.startDelay ? ` · ${run.startDelay > 0 ? "+" : ""}${run.startDelay} min` : ""}`
        : run.plannedStart !== null && now > run.plannedStart
          ? `Pas encore démarrée · ${Math.round((now - run.plannedStart) / 60000)} min de retard`
          : "";
  const crew = [...new Set([stage.operatorId, ...shots.map((s) => s.operatorId), ...items.poses.map((s) => s.operatorId)].filter(Boolean).map(String))]
    .map((mid) => p.items.find((i) => i.id === mid && i.module === "team"))
    .filter((m): m is Item => !!m);
  const remaining = new Map<string, number>([["", shots.filter((s) => !done(s)).length]]);
  for (const s of shots) if (!done(s)) remaining.set(String(s.operatorId || "unassigned"), (remaining.get(String(s.operatorId || "unassigned")) ?? 0) + 1);

  const open = (shot: Item, order: Item[], context: string) => setViewer({ ids: order.map((s) => s.id), start: Math.max(0, order.findIndex((s) => s.id === shot.id)), context });
  const addShot = (section?: string) =>
    setEditing(
      makeItem("shots", "", {
        stageId: id,
        order: nextOrder(p, "shots"),
        ...(section && section !== "Autres plans" ? { section } : {}),
        ...(operator && operator !== "unassigned" ? { operatorId: operator } : {}),
        ...(tab === "photo" ? { media: "photo" } : tab === "video" ? { media: "video" } : tab === "drone" ? { media: "drone" } : {}),
      }),
    );
  const importFiles = (files: File[], target: ImportTarget) => setPending({ files, target });
  const existingFor = (target: ImportTarget) =>
    target === "pose" ? items.poses.length : target === "reference" ? items.references.length : shots.filter((s) => (s.media ?? "") === target).length;
  const duplicate = () => {
    const visuals = new Map<string, string>();
    for (const m of media) if (!m.unsupported && /^(image|video)\//.test(m.type) && !visuals.has(m.itemId)) visuals.set(m.itemId, m.id);
    const copies = duplicateStage(p, id, visuals);
    addItems(copies, `Étape dupliquée avec ${copies.length - 1} élément(s)`);
    navigate("/etape/" + copies[0].id);
  };
  const saveTemplate = () => {
    const preset = stageTemplate(p, id);
    if (!preset) return;
    change({ ...w, presets: [...w.presets, preset] });
    notify(`Template « ${preset.name} » enregistré dans Presets & templates`);
  };

  const n = (value: number, one: string, many: string) => (value > 1 ? many : one);
  const missing = stats.essentials.total - stats.essentials.done;
  type Counter = [Tab, typeof Camera, string, string, boolean?];
  const essentials: Counter = ["frise", AlertTriangle, `${missing}`, n(missing, "essentiel à faire", "essentiels à faire"), missing > 0];
  // Des essentiels manquent : ce compteur passe en tête (visible sans faire défiler sur téléphone).
  const counters: Counter[] = [
    ...(missing > 0 ? [essentials] : []),
    ["video", Video, `${stats.video.done}/${stats.video.total}`, "vidéo"],
    ["photo", Camera, `${stats.photo.done}/${stats.photo.total}`, "photo"],
    ["poses", Heart, `${stats.poses.total}`, n(stats.poses.total, "pose", "poses")],
    ...(missing > 0 ? [] : [essentials]),
    ["transitions", ArrowRightLeft, `${stats.transitions}`, n(stats.transitions, "transition", "transitions")],
    ["lights", Sun, `${stats.lights}`, n(stats.lights, "lumière", "lumières")],
    ...(stats.drone.total ? ([["drone", Plane, `${stats.drone.done}/${stats.drone.total}`, "drone"]] as Counter[]) : []),
  ];
  const tabs: [Tab, string, number?][] = [
    ["frise", "Frise", stats.shots.total],
    ["scene", "Scène", (p.scenePlans ?? []).filter((s) => s.stageId === id).length],
    ["photo", "Photo", stats.photo.total],
    ["video", "Vidéo", stats.video.total],
    ["poses", "Poses", stats.poses.total],
    ["transitions", "Transitions", stats.transitions],
    ["references", "Références", stats.references],
    ["team", "Équipe", crew.length],
    ["checklist", "Checklist", stats.tasks.total],
    ["reminders", "Rappels", items.reminders.length],
    ["lights", "Lumières", stats.lights],
    ["audio", "Audio", items.audio.length],
    ["drone", "Drone", stats.drone.total],
    ["gear", "Matériel", items.gear.length],
    ["notes", "Notes", items.notes.length],
  ];
  const filterable = tab === "frise" || tab === "photo" || tab === "video" || tab === "drone";

  return (
    <Screen
      title={stage.title}
      backTo="/deroule"
      actions={
        <>
          <button className="icon-btn" aria-label="Enregistrer l’étape comme template" title="Enregistrer comme template" onClick={saveTemplate}>
            <Layers size={19} />
          </button>
          <button className="icon-btn" aria-label="Dupliquer l’étape avec ses plans" title="Dupliquer avec ses plans" onClick={duplicate}>
            <Copy size={19} />
          </button>
          <button className="icon-btn gold" aria-label="Modifier l’étape" onClick={() => setEditing(stage)}>
            <Pencil size={19} />
          </button>
        </>
      }
    >
      <section className="stage-hero" style={{ ["--stage" as string]: color }}>
        <div className="stage-hero-main">
          <span className="stage-hero-icon">
            <Icon size={24} />
          </span>
          <div className="stage-hero-text">
            <strong className="stage-hero-time">
              <Clock3 size={15} />
              <span className="stage-hero-range">{frise.stageStart !== null ? `${toClock(frise.stageStart)} → ${toClock(frise.stageEnd!)}` : "Horaire à définir"}</span>
              <span>{String(stage.duration || 30)} min</span>
            </strong>
            <span className="stage-hero-place">
              <MapPin size={14} />
              <span>{venue ? `${venue.title}${venue.address ? " · " + String(venue.address) : ""}` : "Lieu à définir"}</span>
              {venue?.address && <AddressLinks address={String(venue.address)} />}
            </span>
          </div>
          <Ring percent={stats.percent} label={`${stats.shots.done}/${stats.shots.total}`} />
        </div>
        {crew.length > 0 && (
          <div className="stage-hero-crew">
            {crew.slice(0, 6).map((m) => (
              <span key={m.id} className="crew-chip" style={{ ["--op" as string]: operators.get(m.id)?.color }}>
                <MemberAvatar member={m} projectId={p.id} />
                {m.title}
              </span>
            ))}
            {crew.length > 6 && <span className="crew-more">+{crew.length - 6}</span>}
          </div>
        )}
        {(status || nextShot) && (
          <div className="stage-hero-next">
            {status && <span className={"stage-run" + (/retard|\+/.test(status) ? " late" : "")}>{status}</span>}
            {nextShot && (
              <button type="button" onClick={() => open(nextShot, [nextShot, ...friseMoments(frise).flatMap((m) => m.shots).filter((s) => s.id !== nextShot.id && !done(s))], "Prochains plans")}>
                <b>Prochain</b> {nextShot.title}
                {nextMoment?.start !== null && nextMoment?.start !== undefined && <em> · {toClock(nextMoment.start)}</em>}
                {operators.get(String(nextShot.operatorId)) && <em> · {operators.get(String(nextShot.operatorId))!.name}</em>}
              </button>
            )}
          </div>
        )}
        <div className="stage-counters">
          {counters.map(([target, CIcon, value, label, alert]) => (
            <button key={label} type="button" className={"counter" + (tab === target ? " on" : "") + (alert ? " alert" : "")} onClick={() => setTab(target)}>
              <CIcon size={15} />
              <b>{value}</b>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="stage-hero-actions">
          <button className="btn gold" onClick={() => setBulk({ kind: tab === "photo" ? "photo" : tab === "drone" ? "drone" : "video", section: "" })}>
            <Plus size={17} /> Ajouter<span className="hide-narrow"> des plans</span>
          </button>
          <button className="btn" onClick={() => navigate("/jourj")}>
            <Play size={16} /> <span className="hide-narrow">Mode </span>Jour J
          </button>
        </div>
        {stage.planB && <p className="stage-planb">Plan B : {String(stage.planB)}</p>}
      </section>

      <Tabs value={tab} onChange={setTab} options={tabs} />

      {filterable && operators.size > 0 && shots.length > 0 && <OperatorPills project={p} value={operator} onChange={setOperator} counts={remaining} unassigned label="Plans de" />}

      {tab === "frise" && (
        <>
          <div className="stage-hero-actions"><button className="btn small" onClick={() => setNewSection({ title: "", parentId: "" })}><Plus size={15}/> Nouvelle section de plans</button></div>
          <MomentSplit shots={shots} />
          {stage.notes && <p className="stage-notes">{stage.notes}</p>}
          {shots.length ? (
            <Frise
              stage={stage}
              shots={shots}
              visible={visible}
              filtering={!!operator}
              media={media}
              operators={operators}
              transitions={transitions}
              onOpen={(shot, order) => open(shot, order, stage.title)}
              onEdit={setEditing}
              onAdd={(section) => addShot(section)}
            />
          ) : (
            <Empty
              icon={<Clapperboard size={32} />}
              title="Aucun plan pour cette étape"
              text="Ajoutez une liste de plans d’un coup, ou déposez des photos n’importe où sur cet écran : chaque image devient un plan illustré."
              action={
                <button className="btn gold" onClick={() => setBulk({ kind: "video", section: "" })}>
                  <Plus size={17} /> Ajouter des plans
                </button>
              }
            />
          )}
          {operator && shots.length > 0 && !shots.some(visible) && (
            <Empty icon={<Users size={30} />} title="Aucun plan pour ce filtre" text="Choisissez « Toute l’équipe » pour revoir tous les plans de l’étape." />
          )}
        </>
      )}

      {tab === "scene" && <StageScene stageId={id} />}

      {(tab === "photo" || tab === "video" || tab === "drone") && (
        <ShotBoard
          kind={tab}
          shots={shots}
          visible={visible}
          media={media}
          operators={operators}
          transitions={transitions}
          onOpen={(shot, order) => open(shot, order, `${stage.title} · ${tab === "photo" ? "Photo" : tab === "video" ? "Vidéo" : "Drone"}`)}
          onEdit={setEditing}
          onBulk={() => setBulk({ kind: tab, section: "" })}
          onImport={importFiles}
        >
          {tab === "drone" && (
            <>
              <div className="section-title">Missions drone</div>
              <LinkedRows module="drone" items={items.drone} stageId={id} empty="Aucune mission drone rattachée à cette étape." />
            </>
          )}
        </ShotBoard>
      )}

      {tab === "poses" && <PoseBoard stageId={id} embedded />}

      {tab === "references" && (
        <ItemGrid
          items={items.references}
          media={media}
          icon={<Images size={26} />}
          countLabel="références"
          addLabel="Ajouter une référence"
          importLabel="Importer des références"
          target="reference"
          onView={setViewing}
          onEdit={setEditing}
          onAdd={() => setEditing(makeItem("inspirations", "", { stageId: id, order: nextOrder(p, "inspirations") }))}
          onImport={importFiles}
          empty="Photos, vidéos ou captures d’inspiration pour cette étape : elles restent disponibles hors ligne."
        />
      )}

      {tab === "transitions" && (
        <TransitionList
          transitions={items.transitions}
          stageId={id}
          media={media}
          onEditShot={(shotId) => {
            const order = friseMoments(frise).flatMap((m) => m.shots);
            const shot = order.find((s) => s.id === shotId);
            if (shot) open(shot, order, stage.title);
          }}
        />
      )}

      {tab === "team" && (
        <TeamPanel
          stage={stage}
          shots={shots}
          poses={items.poses}
          onFilter={(mid) => {
            setOperator(mid);
            setTab("frise");
          }}
        />
      )}
      {tab === "checklist" && <ChecklistPanel tasks={items.tasks} stageId={id} />}
      {tab === "reminders" && (
        <LinkedRows module="reminders" items={items.reminders} stageId={id} defaults={{ trigger: "before-start", offset: 10 }} empty="Ex. « Installer le micro du marié » 10 min avant le début de l’étape." />
      )}
      {tab === "lights" && <LinkedRows module="lighting" items={items.lights} stageId={id} empty="Fenêtre, LED, réflecteur… : préparez la lumière de cette étape." />}
      {tab === "audio" && <LinkedRows module="audio" items={items.audio} stageId={id} empty="Micros, enregistreurs, secours : rien ne doit manquer au son." />}
      {tab === "gear" && <LinkedRows module="equipment" items={items.gear} stageId={id} empty="Le matériel propre à cette étape (objectif, lumière, stabilisateur…)." />}
      {tab === "notes" && <LinkedRows module="notes" items={items.notes} stageId={id} defaults={{ category: "Note" }} empty="Une idée, une consigne, un détail à ne pas oublier." />}

      <DropVeil show={dragging} text="Chaque fichier devient un élément illustré de cette étape." />
      <ImportProgress jobs={importer.jobs} />
      {pending && (
        <ImportSheet
          files={pending.files}
          target={pending.target}
          sections={sectionChoices}
          categories={poseCategories}
          onClose={() => setPending(null)}
          onConfirm={(target, section, category) => {
            const extra: Partial<Item> = { stageId: id };
            if ((target === "photo" || target === "video") && section) extra.section = section;
            if ((target === "pose" || target === "reference") && category) extra.category = category;
            if (operator && operator !== "unassigned") extra.operatorId = operator;
            void importer.run(pending.files, target, extra, existingFor(target));
            setPending(null);
            if (target === "photo" || target === "video") setTab(target);
            else if (target === "pose") setTab("poses");
            else setTab("references");
          }}
        />
      )}
      {bulk && (
        <BulkAdd
          stageId={id}
          sections={sectionChoices}
          section={bulk.section}
          kind={bulk.kind}
          operatorId={operator && operator !== "unassigned" ? operator : ""}
          onClose={() => setBulk(null)}
        />
      )}
      {viewer && <ShotViewer ids={viewer.ids} start={viewer.start} context={viewer.context} onClose={() => setViewer(null)} />}
      {newSection && <Sheet title={newSection.parentId ? "Nouvelle sous-section" : "Nouvelle section"} onClose={() => setNewSection(null)}>
        <div className="stack">
          <label className="field">Nom<input autoFocus value={newSection.title} onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}/></label>
          <label className="field">Sous-section de<select value={newSection.parentId} onChange={(e) => setNewSection({ ...newSection, parentId: e.target.value })}><option value="">Aucune · section principale</option>{configuredSections.filter((s) => !s.parentId).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
          <div className="form-actions"><button className="btn" onClick={() => setNewSection(null)}>Annuler</button><button className="btn gold" disabled={!newSection.title.trim()} onClick={saveNewSection}>Créer</button></div>
        </div>
      </Sheet>}
      {editing && <ItemEditor key={editing.id} item={editing} onClose={() => setEditing(null)} />}
      {viewing && (
        <QuickView
          item={p.items.find((i) => i.id === viewing.id) || viewing}
          media={media}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      )}
    </Screen>
  );
}
