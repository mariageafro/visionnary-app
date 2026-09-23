import { useMemo, useState } from "react";
import { Clapperboard, Save } from "lucide-react";
import { done } from "../model";
import { estimateSections, estimateTotal, type EstimateStyle } from "../estimate";
import { useProject } from "../store";
import { Screen } from "../ui";
import { itemsOf } from "./common";

const styles: [EstimateStyle, string][] = [
  ["calme", "Calme"], ["équilibré", "Équilibré"], ["dynamique", "Dynamique"], ["fast cut", "Fast cut"], ["personnalisé", "Personnalisé"],
];

/** Estimation explicite, modifiable et indicative : elle n'altère jamais la shot-list. */
export default function Coverage() {
  const { project: p, update } = useProject();
  const settings = p.estimateSettings ?? {};
  const [filmMinutes, setFilmMinutes] = useState(p.filmMinutes ?? 8);
  const [teaserSeconds, setTeaserSeconds] = useState(p.teaserSeconds ?? 60);
  const [averageCutSeconds, setAverageCutSeconds] = useState(settings.averageCutSeconds ?? 4);
  const [marginPercent, setMarginPercent] = useState(settings.marginPercent ?? 50);
  const [style, setStyle] = useState<EstimateStyle>(settings.style ?? (p.style.toLocaleLowerCase("fr").includes("fast") ? "fast cut" : "équilibré"));
  const [bRollPercent, setBRollPercent] = useState(settings.bRollPercent ?? 15);
  const [multicam, setMulticam] = useState(settings.multicam ?? false);
  const [operators, setOperators] = useState(settings.operators ?? Math.max(1, itemsOf(p, "team").length));
  const [saved, setSaved] = useState(false);
  const shots = itemsOf(p, "shots");
  const stages = itemsOf(p, "stages");
  const availableByStage = Object.fromEntries(stages.map((stage) => [stage.id, Number(stage.duration) || 0]));
  const estimates = useMemo(() => estimateSections(shots, { filmMinutes, averageCutSeconds, style, marginPercent, bRollPercent, multicam, availableByStage }), [shots, filmMinutes, averageCutSeconds, style, marginPercent, bRollPercent, multicam, availableByStage]);
  const total = estimateTotal(filmMinutes, averageCutSeconds, style, marginPercent);
  const teaserTotal = estimateTotal(teaserSeconds / 60, averageCutSeconds, style, 0);
  const explicitMinutes = shots.reduce((sum, shot) => sum + (Number(shot.shootMinutes) > 0 ? Number(shot.shootMinutes) : 0), 0);
  const hasExplicitTimes = shots.some((shot) => Number(shot.shootMinutes) > 0);
  const saveSettings = () => {
    update({ ...p, filmMinutes, teaserSeconds, estimateSettings: { averageCutSeconds, marginPercent, style, bRollPercent, multicam, operators } }, "Paramètres d’estimation enregistrés");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };
  return (
    <Screen title="Calculer la couverture" backTo="/plus">
      <p className="muted" style={{ marginBottom: 14 }}>Estimation, à ajuster selon le style et le terrain. Aucun plan n’est supprimé ou modifié automatiquement.</p>
      <div className="choices" style={{ marginBottom: 14 }}>
        {styles.map(([value, label]) => <button key={value} type="button" className={"choice" + (style === value ? " on" : "")} aria-pressed={style === value} onClick={() => setStyle(value)}>{label}</button>)}
      </div>
      <div className="card form-grid">
        <label className="field">Film final (minutes)<input type="number" min="1" max="240" inputMode="numeric" value={filmMinutes} onChange={(e) => setFilmMinutes(Math.min(240, Math.max(1, Number(e.target.value) || 1)))} /></label>
        <label className="field">Teaser (secondes)<input type="number" min="0" max="3600" inputMode="numeric" value={teaserSeconds} onChange={(e) => setTeaserSeconds(Math.max(0, Number(e.target.value) || 0))} /></label>
        <label className="field">Durée moyenne montée (s)<input type="number" min="1" max="120" inputMode="numeric" value={averageCutSeconds} onChange={(e) => setAverageCutSeconds(Math.min(120, Math.max(1, Number(e.target.value) || 1)))} /></label>
        <label className="field">Nombre d’opérateurs<input type="number" min="1" max="30" inputMode="numeric" value={operators} onChange={(e) => setOperators(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} /></label>
        <label className="field span">Marge de sélection : {marginPercent} %<input type="range" min="0" max="300" value={marginPercent} onChange={(e) => setMarginPercent(Number(e.target.value))} /></label>
        <label className="field span">Part de B-roll : {bRollPercent} %<input type="range" min="0" max="80" value={bRollPercent} onChange={(e) => setBRollPercent(Number(e.target.value))} /></label>
        <label className="field span"><span><input type="checkbox" checked={multicam} onChange={(e) => setMulticam(e.target.checked)} /> Estimation multicam</span></label>
        <div className="form-actions span"><button className="btn gold" onClick={saveSettings}><Save size={16} />{saved ? "Enregistré" : "Enregistrer les paramètres"}</button></div>
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="section-title">Recommandation pour le film</div>
        <strong style={{ fontSize: 36 }}>{total} plans cible</strong>
        <p className="muted">{shots.length} prévus · {shots.filter(done).length} tournés · Teaser : environ {teaserTotal} plans</p>
        <div className="progress"><span style={{ width: `${total ? Math.min(100, shots.length / total * 100) : 0}%` }} /></div>
        <p className="muted">{style === "fast cut" ? "Fast cut : multipliez les axes, focales, valeurs de plan, sujets, détails, actions et réactions." : "La recommandation varie selon le rythme choisi, la durée moyenne et la marge."}</p>
      </div>
      <div className="section-title">Par section</div>
      <div className="list">
        {estimates.map((estimate) => <div className="row" key={estimate.section} style={{ alignItems: "flex-start" }}>
          <span className="row-main"><strong>{estimate.section}</strong><small>{estimate.planned} prévus · {estimate.minimum} min / {estimate.target} cible / {estimate.comfort} confort</small>
            <small>{Object.entries(estimate.distribution).filter(([, count]) => count > 0).map(([kind, count]) => `${kind} ${count}`).join(" · ")}</small>
            {estimate.shootMinutes !== null ? <small>Temps saisi : {estimate.shootMinutes} min{estimate.availableMinutes !== null ? ` / ${estimate.availableMinutes} min disponibles · ${estimate.state}` : " · disponibilité non renseignée"}</small> : <small>Temps terrain à renseigner dans les fiches plan.</small>}
          </span>
        </div>)}
        {!estimates.length && <div className="row"><Clapperboard size={20} /><span className="row-main">Ajoutez des plans pour obtenir une répartition par section.</span></div>}
      </div>
      <div className="card" style={{ marginTop: 14 }}><strong>Temps terrain saisi</strong><p className="muted">{hasExplicitTimes ? `${explicitMinutes} min cumulées sur les plans avec une durée estimée renseignée. La disponibilité des étapes est indiquée séparément.` : "Renseignez « Temps de tournage » sur les fiches plan pour calculer la charge terrain."}</p><small className="muted">Équipe prise en compte : {operators} opérateur{operators > 1 ? "s" : ""}. Le partage de charge n’est pas extrapolé automatiquement.</small></div>
    </Screen>
  );
}
