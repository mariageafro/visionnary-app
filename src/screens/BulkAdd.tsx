import { useState } from "react";
import { Camera, Check, Clapperboard, Plane, Video } from "lucide-react";
import type { Item } from "../types";
import { makeItem, priorities } from "../model";
import type { ShotKind } from "../stageStats";
import { useProject } from "../store";
import { Sheet } from "../ui";
import { itemsOf, nextOrder } from "./common";

const kinds: [ShotKind, string, typeof Camera][] = [
  ["video", "Vidéo", Video],
  ["photo", "Photo", Camera],
  ["drone", "Drone", Plane],
  ["both", "Vidéo et photo", Clapperboard],
];
const examples: Record<ShotKind, string> = {
  photo: "Robe sur cintre\nChaussures\nBijoux\nParfum\nInvitation\nBouquet",
  video: "Plan large de la chambre\nMains de la maquilleuse\nDernier regard dans le miroir",
  drone: "Establishing du domaine\nTop shot de la cour\nReveal du lieu",
  both: "Mariée à la fenêtre\nMère et mariée\nDemoiselles d’honneur",
};

/** Découpe une liste collée : une ligne = un plan, puces et numéros retirés, lignes vides ignorées. */
export function parseTitles(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 200);
}

/**
 * Ajouter beaucoup de plans d'un coup : type, moment, une liste (un plan par ligne) ou un nombre.
 * Tous naissent rattachés à l'étape, prêts à recevoir leur référence.
 */
export default function BulkAdd({
  stageId,
  sections,
  section: initialSection = "",
  kind: initialKind = "video",
  operatorId = "",
  onClose,
}: {
  stageId?: string;
  sections: string[];
  section?: string;
  kind?: ShotKind;
  operatorId?: string;
  onClose: () => void;
}) {
  const { project: p, addItems } = useProject();
  const [kind, setKind] = useState<ShotKind>(initialKind);
  const [section, setSection] = useState(initialSection);
  const [text, setText] = useState("");
  const [count, setCount] = useState(5);
  const [priority, setPriority] = useState("IMPORTANT");
  const [operator, setOperator] = useState(operatorId);
  const team = itemsOf(p, "team");
  const titles = parseTitles(text);
  const noun = kind === "photo" ? "Photo" : kind === "drone" ? "Plan drone" : "Plan";
  const total = titles.length || count;
  function create() {
    const start = nextOrder(p, "shots");
    const existing = p.items.filter((i) => i.module === "shots" && i.stageId === stageId && (i.media ?? "") === (kind === "both" ? "" : kind)).length;
    const list = titles.length ? titles : Array.from({ length: count }, (_, n) => `${noun} ${existing + n + 1}${section ? " · " + section.replace(/^.*·\s*/, "") : ""}`);
    const items: Item[] = list.map((title, n) =>
      makeItem("shots", title, {
        order: start + n,
        priority,
        ...(kind === "both" ? {} : { media: kind }),
        ...(stageId ? { stageId } : {}),
        ...(section ? { section } : {}),
        ...(operator ? { operatorId: operator } : {}),
      }),
    );
    addItems(items, `${items.length} plan${items.length > 1 ? "s" : ""} ajouté${items.length > 1 ? "s" : ""}`);
    onClose();
  }
  return (
    <Sheet title="Ajouter des plans" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (total > 0) create();
        }}
      >
        <div className="field">
          Type
          <div className="choices">
            {kinds.map(([id, label, Icon]) => (
              <button key={id} type="button" className={"choice" + (kind === id ? " on" : "")} aria-pressed={kind === id} onClick={() => setKind(id)}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          Moment
          <input list="bulk-sections" value={section} placeholder="Ex. Mariée · Détails & accessoires" onChange={(e) => setSection(e.target.value)} />
          <datalist id="bulk-sections">
            {sections.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="field">
          Un plan par ligne (collez votre liste)
          <textarea rows={6} value={text} placeholder={examples[kind]} onChange={(e) => setText(e.target.value)} />
        </label>
        {!titles.length && (
          <label className="field bulk-count">
            … ou créer des plans numérotés
            <span>
              <button type="button" className="btn small" aria-label="Moins" onClick={() => setCount(Math.max(1, count - 1))}>
                −
              </button>
              <input type="number" min={1} max={100} inputMode="numeric" value={count} onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
              <button type="button" className="btn small" aria-label="Plus" onClick={() => setCount(Math.min(100, count + 1))}>
                +
              </button>
            </span>
          </label>
        )}
        <div className="form-grid">
          <label className="field">
            Priorité
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {priorities.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          {team.length > 0 && (
            <label className="field">
              {kind === "photo" ? "Photographe" : "Opérateur"}
              <select value={operator} onChange={(e) => setOperator(e.target.value)}>
                <option value="">Non défini</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn gold" disabled={!total}>
            <Check size={16} /> Ajouter {total} plan{total > 1 ? "s" : ""}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
