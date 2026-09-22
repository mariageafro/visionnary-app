import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import type { MediaEntry } from "../types";
import { makeItem } from "../model";
import { useProject } from "../store";
import { continuityWarnings } from "../continuity";
import { Empty, MediaViewer, Row, Screen, Sheet, Tabs, Thumb, useMedia } from "../ui";
import { itemsOf, nextOrder } from "./common";

// [valeur de plan, usage, focale conseillée, cadre relatif du sujet (hauteur en % de l'image)]
const library: [string, string, string, number][] = [
  ["Plan d’ensemble", "Situer le lieu et l’ambiance. Ouvre ou clôt une séquence.", "16-24 mm", 12],
  ["Plan large", "Le couple dans son décor, action générale.", "24-35 mm", 30],
  ["Plan américain", "Mi-cuisses : gestes et attitude, idéal pour les marches.", "35-50 mm", 62],
  ["Plan taille", "Échanges, discours, réactions à deux.", "50 mm", 80],
  ["Plan rapproché", "Émotion et détails du visage, poitrine incluse.", "85 mm", 110],
  ["Gros plan", "Alliances, mains, regards, larmes.", "85-135 mm", 170],
  ["Détail / insert", "Bijoux, tissu, décor : matière pour les fast cuts.", "Macro 100 mm", 260],
  ["Plan de coupe", "Ambiance, invités, décor : sauve le montage.", "Au choix", 40],
  ["Réaction", "Les proches pendant les vœux ou les discours.", "70-200 mm", 120],
  ["Plan drone", "Lieu et extérieur vus du ciel, si autorisé.", "Drone", 6],
];

const advice = [
  "Règle des 180° : gardez la caméra du même côté de l’axe entre le couple et l’officiant.",
  "Direction du regard : un personnage qui regarde à droite doit être « répondu » par un regard à gauche.",
  "Raccord de mouvement : coupez pendant le geste, pas avant ni après.",
  "Variez les valeurs : large → taille → gros plan, jamais deux valeurs identiques à la suite sur le même sujet.",
  "Avant-plan : un élément flou devant l’objectif donne de la profondeur et une transition naturelle.",
  "Plan de sécurité : un master fixe tourne pendant tout moment impossible à refaire.",
  "Fast cuts : prévoyez 3 fois plus de détails et d’inserts de 1 à 2 secondes.",
];

function Silhouette({ scale }: { scale: number }) {
  // Pictogramme : plus la valeur de plan est serrée, plus le sujet remplit le cadre.
  // La tête reste au tiers supérieur ; le corps sort du cadre quand le plan se resserre.
  const s = Math.min(260, scale) / 100;
  return (
    <svg viewBox="0 0 100 100" className="thumb" style={{ width: 64, aspectRatio: "1", background: "#1d1b17" }} aria-hidden>
      <g transform={`translate(50 34) scale(${s}) translate(0 78)`}>
        <circle cx="0" cy="-78" r="11" fill="#e6c27f" />
        <path d="M-18 -64 Q0 -70 18 -64 L22 -20 L12 -20 L10 20 L-10 20 L-12 -20 L-22 -20 Z" fill="#e6c27f" opacity=".85" />
      </g>
    </svg>
  );
}

export default function Framing() {
  const { project: p, update } = useProject();
  const [tab, setTab] = useState<"plans" | "examples" | "advice">("plans");
  const [open, setOpen] = useState<(typeof library)[number] | null>(null);
  const [viewer, setViewer] = useState<MediaEntry | null>(null);
  const media = useMedia(p.id);
  const framed = [...itemsOf(p, "shots"), ...itemsOf(p, "inspirations"), ...itemsOf(p, "poses")];
  const examplesFor = (framing: string) => {
    const ids = new Set(framed.filter((i) => String(i.framing ?? "").toLowerCase().startsWith(framing.toLowerCase().slice(0, 6))).map((i) => i.id));
    return media.filter((m) => ids.has(m.itemId) && !m.unsupported);
  };
  const warnings = continuityWarnings(p);
  const allExamples = media.filter((m) => framed.some((i) => i.id === m.itemId) && !m.unsupported);
  return (
    <Screen title="Aides au cadrage" backTo="/plus">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ["plans", "Plans"],
          ["examples", "Exemples", allExamples.length],
          ["advice", "Conseils", warnings.length || undefined],
        ]}
      />
      {tab === "plans" && (
        <div className="list">
          {library.map((entry) => {
            const example = examplesFor(entry[0])[0];
            return (
              <Row
                key={entry[0]}
                lead={example ? <Thumb media={example} /> : <Silhouette scale={entry[3]} />}
                title={entry[0]}
                sub={entry[1]}
                chevron
                onClick={() => setOpen(entry)}
              />
            );
          })}
        </div>
      )}
      {tab === "examples" &&
        (allExamples.length ? (
          <div className="media-grid">
            {allExamples.map((m) => (
              <div className="media-cell" key={m.id}>
                <Thumb media={m} onClick={() => setViewer(m)} />
                <small>{framed.find((i) => i.id === m.itemId)?.title}</small>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Pas encore d’exemples" text="Ajoutez des photos ou vidéos à vos plans et inspirations : elles apparaissent ici, classées par valeur de plan." />
        ))}
      {tab === "advice" && (
        <div className="stack">
          {warnings.map((w) => (
            <div className="notice red" key={w.a.id + w.b.id}>
              <AlertTriangle size={17} />
              {w.message}
            </div>
          ))}
          <div className="list">
            {advice.map((a) => (
              <Row key={a} title={a.split(" : ")[0]} sub={a.split(" : ").slice(1).join(" : ")} />
            ))}
          </div>
        </div>
      )}
      {open && (
        <Sheet title={open[0]} onClose={() => setOpen(null)}>
          <div className="stack">
            <p>{open[1]}</p>
            <div className="kv">
              <div>
                <span>Focale conseillée</span>
                <b>{open[2]}</b>
              </div>
              <div>
                <span>Plans de ce type dans le tournage</span>
                <b>{itemsOf(p, "shots").filter((s) => s.framing === open[0]).length}</b>
              </div>
            </div>
            {examplesFor(open[0]).length > 0 && (
              <div className="media-grid">
                {examplesFor(open[0]).map((m) => (
                  <Thumb key={m.id} media={m} onClick={() => setViewer(m)} />
                ))}
              </div>
            )}
            <button
              className="btn gold full"
              onClick={() => {
                update({ ...p, items: [...p.items, makeItem("shots", open[0], { framing: open[0], order: nextOrder(p, "shots") })] }, "Plan ajouté à la shot list");
                setOpen(null);
              }}
            >
              <Plus size={17} /> Ajouter un plan de ce type
            </button>
          </div>
        </Sheet>
      )}
      {viewer && <MediaViewer media={viewer} onClose={() => setViewer(null)} />}
    </Screen>
  );
}
