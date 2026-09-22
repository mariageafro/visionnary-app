import { useState } from "react";
import { Clapperboard } from "lucide-react";
import { done } from "../model";
import { useProject } from "../store";
import { Screen } from "../ui";
import { itemsOf } from "./common";

const presets: [string, string, number, number][] = [
  // [nom, description, secondes/plan, marge %]
  ["Cinématique lent", "Peu de coupes, plans qui respirent.", 6, 40],
  ["Luxe éditorial / Vogue", "Compositions soignées, rythme posé.", 5, 50],
  ["Néoclassique", "Équilibré, classique et sobre.", 4, 40],
  ["Dynamique", "Rythme soutenu, coupes fréquentes.", 3, 60],
  ["Fast cuts", "Très découpé : détails et inserts.", 2, 90],
  ["Documentaire", "Suit l’action, peu de mise en scène.", 5, 30],
];

/** Estimation, pas une vérité : sert à vérifier qu'on a prévu assez (et pas trop) de plans. */
export default function Coverage() {
  const { project: p } = useProject();
  const [minutes, setMinutes] = useState(p.filmMinutes || 8);
  const [seconds, setSeconds] = useState(4);
  const [margin, setMargin] = useState(50);
  const shots = itemsOf(p, "shots");
  const needed = Math.ceil(((minutes * 60) / Math.max(1, seconds)) * (1 + margin / 100));
  const categories = [...new Set(shots.map((i) => String(i.framing || "Non classé")))];
  const byCategory = categories
    .map((cat) => ({ cat, list: shots.filter((s) => String(s.framing || "Non classé") === cat) }))
    .sort((a, b) => b.list.length - a.list.length);
  return (
    <Screen title="Calculer la couverture" backTo="/plus">
      <p className="muted" style={{ marginBottom: 14 }}>
        Un assistant, pas une vérité absolue : ajustez selon votre style et votre jugement sur place.
      </p>
      <div className="choices" style={{ marginBottom: 14 }}>
        {presets.map(([name, , sec, m]) => (
          <button key={name} type="button" className="choice" onClick={() => (setSeconds(sec), setMargin(m))}>
            {name}
          </button>
        ))}
      </div>
      <div className="card form-grid">
        <label className="field">
          Film final (minutes)
          <input type="number" min="1" max="240" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(Math.min(240, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
        <label className="field">
          Durée moyenne d’un plan (s)
          <input type="number" min="1" max="120" inputMode="numeric" value={seconds} onChange={(e) => setSeconds(Math.min(120, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
        <label className="field span">
          Marge de choix ({margin} %)
          <input type="range" min="0" max="300" value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
        </label>
      </div>
      <div className="card" style={{ marginTop: 14, textAlign: "center" }}>
        <span className="muted">Plans recommandés</span>
        <h2 style={{ fontSize: 44, margin: "4px 0" }}>{needed}</h2>
        <p className="muted">
          {shots.length} prévus · {shots.filter(done).length} tournés
        </p>
        <div className="progress" style={{ marginTop: 10 }}>
          <span style={{ width: `${Math.min(100, (shots.length / needed) * 100)}%`, background: shots.length >= needed ? "var(--green)" : "var(--gold-2)" }} />
        </div>
      </div>
      <div className="section-title">Répartition prévue</div>
      <div className="list">
        {byCategory.map(({ cat, list }) => (
          <div className="row" key={cat}>
            <span className="row-main">
              <strong>{cat}</strong>
            </span>
            <span className="row-trail">
              {list.filter(done).length}/{list.length}
            </span>
          </div>
        ))}
        {!shots.length && (
          <div className="row">
            <Clapperboard size={20} />
            <span className="row-main">Aucun plan pour l’instant.</span>
          </div>
        )}
      </div>
    </Screen>
  );
}
