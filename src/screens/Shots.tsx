import { useState } from "react";
import { Camera, Check, Clapperboard, Film, ListPlus, Plane, Plus, Search, Sparkles, Video, RotateCcw, SlidersHorizontal, Play, Pause } from "lucide-react";
import type { Item } from "../types";
import { done, makeItem, orderSections, sectionOf, shotSections } from "../model";
import { isDroneShot, isPhotoShot, isVideoShot } from "../stageStats";
import { withOrder } from "../features";
import { linkShotsToStages, professionalShotList, shotListCount } from "../shotlist";
import { useProject } from "../store";
import { Empty, Screen, Sheet, Tabs, useMedia } from "../ui";
import { ItemEditor, itemsOf, mediaFor, MediaCard, nextOrder, operatorsOf } from "./common";
import { matchesShotSearch } from "../shotSearch";
import "./shots.css";
import BulkAdd from "./BulkAdd";
import { DropVeil, ImportProgress, ImportSheet, PickFiles, useFileDrop, useImporter, type ImportTarget } from "./MediaDrop";
import MomentSplit from "./MomentSplit";
import ShotViewer from "./ShotViewer";

type Kind = "all" | "video" | "photo" | "drone";
const kindTest: Record<Kind, (i: Item) => boolean> = { all: () => true, video: isVideoShot, photo: isPhotoShot, drone: isDroneShot };

/**
 * Plans & scènes : la shot list groupée chapitre par chapitre, comme le déroulé du film —
 * on ouvre l'écran et on sait exactement quoi tourner, dans quel ordre, sans se perdre.
 */
export default function Shots() {
  const { project: p, update } = useProject();
  const [filter, setFilter] = useState<"all" | "todo" | "must" | "done">("all");
  const [kind, setKind] = useState<Kind>("all");
  const [motion, setMotion] = useState(false);
  const [query, setQuery] = useState("");
  const [stageId, setStageId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewer, setViewer] = useState<{ ids: string[]; start: number } | null>(null);
  const [confirmLoad, setConfirmLoad] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [pending, setPending] = useState<{ files: File[]; target: ImportTarget } | null>(null);
  const media = useMedia(p.id);
  const importer = useImporter();
  const dragging = useFileDrop((files) => setPending({ files, target: kind === "video" || kind === "drone" ? "video" : "photo" }));
  const all = itemsOf(p, "shots", true);
  const operators = operatorsOf(p);
  const stages = itemsOf(p, "stages");
  const active = all.filter((i) => i.status !== "archivé");
  const scoped = active.filter((i) =>
    (stageId === "unassigned" ? !i.stageId : !stageId || i.stageId === stageId) &&
    (operatorId === "unassigned" ? !i.operatorId : !operatorId || i.operatorId === operatorId) &&
    matchesShotSearch(i, query, p.items),
  );
  const typed = scoped.filter(kindTest[kind]);
  const statusTests = {
    all: () => true,
    todo: (i: Item) => !done(i),
    must: (i: Item) => i.priority === "MUST HAVE",
    done,
  };
  const items = typed.filter(statusTests[filter]);
  const orderedSections = orderSections(items.map(sectionOf));
  const filtered = !!(query || stageId || operatorId || kind !== "all" || filter !== "all");
  const resetFilters = () => { setQuery(""); setStageId(""); setOperatorId(""); setKind("all"); setFilter("all"); };
  // Ordre de lecture de l'écran (chapitre par chapitre) : la fiche plein écran le suit.
  const order = orderedSections.flatMap((section) => items.filter((i) => sectionOf(i) === section));
  const transitions = new Map(
    p.items.filter((i) => i.module === "transitions" && i.fromId && i.status !== "archivé").map((t) => [String(t.fromId), String(t.movement || "Transition")]),
  );
  const kinds: [Kind, string, typeof Camera, number][] = [
    ["all", "Tous types", Clapperboard, scoped.length],
    ["video", "Vidéo", Video, scoped.filter(isVideoShot).length],
    ["photo", "Photo", Camera, scoped.filter(isPhotoShot).length],
    ["drone", "Drone", Plane, scoped.filter(isDroneShot).length],
  ];
  const loadShotList = () => {
    const stages = p.items.filter((i) => i.module === "stages");
    const linked = linkShotsToStages(professionalShotList(), stages);
    update(
      { ...p, items: [...p.items, ...withOrder(linked, p.items)] },
      `${shotListCount} plans ajoutés, prêts à tourner`,
    );
    setConfirmLoad(false);
  };
  return (
    <Screen
      title="Plans & scènes"
      backTo="/tournage"
      actions={
        <>
          <button
            className="icon-btn gold"
            aria-label="Ajouter un plan"
            onClick={() => setEditing(makeItem("shots", "", { order: nextOrder(p, "shots"), ...(kind !== "all" ? { media: kind } : {}) }))}
          >
            <Plus size={20} />
          </button>
        </>
      }
    >
      {active.length > 0 ? (
        <div className="card shotlist-progress">
          <div className="section-title" style={{ margin: 0 }}>
            Couverture
            <span>
              {active.filter(done).length}/{active.length} tournés
            </span>
          </div>
          <div className="progress" style={{ marginTop: 8 }}>
            <span
              style={{
                width: `${active.length ? (active.filter(done).length / active.length) * 100 : 0}%`,
              }}
            />
          </div>
          {active.some((i) => i.priority === "MUST HAVE" && !done(i)) && (
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              {active.filter((i) => i.priority === "MUST HAVE" && !done(i)).length} plan(s) essentiel(s)
              restant(s).
            </p>
          )}
        </div>
      ) : (
        <div className="notice" style={{ marginBottom: 14 }}>
          <Sparkles size={18} />
          <span>
            Commencez par la shot-list complète : {shotListCount} plans de réalisateur, déjà cadrés,
            mouvementés et rangés du premier « bonjour » au dernier « au revoir ». Modifiable ensuite
            librement.
          </span>
          <button className="btn small gold" onClick={() => setConfirmLoad(true)}>
            Charger
          </button>
        </div>
      )}

      <MomentSplit shots={active} />
      <div className="shot-toolbar">
      <div className="search">
        <Search size={16} />
        <input
          placeholder="Plan, cadrage, étape, cadreur…"
          aria-label="Rechercher"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

        <PickFiles className="btn gold" label="Importer" onFiles={(files) => setPending({ files, target: kind === "video" ? "video" : "photo" })} />
      </div>
      <div className="shot-gallery-options">
        <details className="shot-filter-panel">
          <summary><SlidersHorizontal size={16} /> Filtres{filtered ? " actifs" : ""}</summary>
      <div className="choices kind-choices">
        {kinds.map(([id, label, Icon, n]) => (
          <button key={id} type="button" className={"choice" + (kind === id ? " on" : "")} aria-pressed={kind === id} onClick={() => setKind(id)}>
            <Icon size={15} /> {label} <small>{n}</small>
          </button>
        ))}

      </div>
      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          ["all", "Tous", typed.length],
          ["todo", "À faire", typed.filter(statusTests.todo).length],
          ["must", "Essentiels", typed.filter(statusTests.must).length],
          ["done", "Faits", typed.filter(done).length],
        ]}
      />
      <div className="shot-filters">
        <label className="field">Étape
          <select aria-label="Étape" value={stageId} onChange={(e) => setStageId(e.target.value)}>
            <option value="">Toutes les étapes</option>
            <option value="unassigned">Sans étape</option>
            {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.title}</option>)}
          </select>
        </label>
        <label className="field">Cadreur
          <select aria-label="Cadreur" value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
            <option value="">Toute l’équipe</option>
            <option value="unassigned">Sans affectation</option>
            {itemsOf(p, "team").map((member) => <option key={member.id} value={member.id}>{member.title}</option>)}
          </select>
        </label>
      </div>
          <div className="shot-extra-actions">
            <button className="btn small" onClick={() => setBulk(true)}><ListPlus size={16} /> Ajouter plusieurs plans</button>
            <button className="btn small" onClick={() => setConfirmLoad(true)}><Sparkles size={16} /> Trame de mariage</button>
          </div>
        </details>
        <button className="btn small shot-motion" aria-pressed={motion} onClick={() => setMotion(!motion)}>{motion ? <Pause size={15} /> : <Play size={15} />}{motion ? "Figer" : "Animer"}</button>
      </div>
      <div className="shot-results">
        <span role="status">{items.length} plan{items.length > 1 ? "s" : ""} affiché{items.length > 1 ? "s" : ""} sur {active.length}</span>
        {filtered && <button className="btn small" onClick={resetFilters}><RotateCcw size={14} /> Tout afficher</button>}
      </div>

      {items.length ? (
        orderedSections.map((section) => {
          const list = items.filter((i) => sectionOf(i) === section);
          if (!list.length) return null;
          return (
            <section key={section}>
              <div className="section-title">
                {section}
                <span>
                  {list.filter(done).length}/{list.length}
                </span>
              </div>
              <div className="insp-grid">
                {list.map((i) => (
                  <MediaCard
                    key={i.id}
                    item={i}
                    animate={motion}
                    thumb={mediaFor(media, i)}
                    icon={<Clapperboard size={26} />}
                    operator={operators.get(String(i.operatorId))}
                    transition={transitions.get(i.id)}
                    onView={() => setViewer({ ids: order.map((x) => x.id), start: Math.max(0, order.findIndex((x) => x.id === i.id)) })}
                    onEdit={() => setEditing(i)}
                  />
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <Empty
          icon={<Clapperboard size={32} />}
          title={active.length ? "Aucun plan ne correspond" : "Votre shot list commence ici"}
          text={active.length ? "Essayez une autre recherche ou retirez les filtres pour retrouver vos plans." : "Chargez la trame complète ou ajoutez vos plans un par un."}
          action={active.length ? <button className="btn gold" onClick={resetFilters}><RotateCcw size={17} /> Effacer les filtres</button> :
            <button className="btn gold" onClick={() => setConfirmLoad(true)}>
              <Film size={17} /> Charger la shot-list complète
            </button>
          }
        />
      )}

      {confirmLoad && (
        <Sheet title="Charger la shot-list complète ?" onClose={() => setConfirmLoad(false)}>
          <p className="muted">
            {shotListCount} plans professionnels s’ajoutent à ceux déjà présents, chapitre par chapitre :
            préparatifs, portraits, cortège, famille, cérémonie, cocktail, interviews, réception, ouverture de
            bal, transitions. Rien n’est supprimé.
          </p>
          <div className="form-actions">
            <button className="btn" onClick={() => setConfirmLoad(false)}>
              Annuler
            </button>
            <button className="btn gold" onClick={loadShotList}>
              <Check size={16} /> Charger les {shotListCount} plans
            </button>
          </div>
        </Sheet>
      )}

      {viewer && <ShotViewer ids={viewer.ids} start={viewer.start} context="Plans & scènes" onClose={() => setViewer(null)} />}
      {bulk && <BulkAdd sections={orderSections([...all.map(sectionOf), ...shotSections])} kind={kind === "all" ? "video" : kind} onClose={() => setBulk(false)} />}
      <DropVeil show={dragging} text="Chaque fichier devient un plan illustré." />
      <ImportProgress jobs={importer.jobs} />
      {pending && (
        <ImportSheet
          files={pending.files}
          target={pending.target}
          targets={["photo", "video", "reference"]}
          sections={orderSections([...all.map(sectionOf), ...shotSections])}
          onClose={() => setPending(null)}
          onConfirm={(target, section) => {
            const existing = target === "reference" ? itemsOf(p, "inspirations").length : active.filter((s) => (s.media ?? "") === target).length;
            void importer.run(pending.files, target, target !== "reference" && section ? { section } : {}, existing);
            setPending(null);
          }}
        />
      )}
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </Screen>
  );
}
