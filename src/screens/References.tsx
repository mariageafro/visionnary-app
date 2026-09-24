import { useMemo, useState } from "react";
import { Check, Layers, Search, Users, X } from "lucide-react";
import type { Item } from "../types";
import { useProject } from "../store";
import { Empty, Screen, Sheet, Thumb, useMedia } from "../ui";
import { itemsOf, mediaFor, VideoPreview } from "./common";
import { REF_INTENSITIES, REF_PRIORITIES, REF_STAGES, REF_STATUSES, REF_STYLES, refProgress, refsOf } from "../refs";
import "./references-couple.css";

const statusLabel = (s: string) => REF_STATUSES.find(([k]) => k === s)?.[1] ?? s;
const prioLabel = (s: string) => REF_PRIORITIES.find(([k]) => k === s)?.[1] ?? s;
const clock = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/**
 * « Références du couple » : les plans précis des vidéos choisies par les mariés, à réaliser le jour J.
 * Chaque plan est une tâche (statut, priorité, responsable, alternative) ; la progression est globale, par étape,
 * par personne et par priorité. Distinct des inspirations générales.
 */
export default function References() {
  const { project: p, update, notify } = useProject();
  const media = useMedia(p.id);
  const team = itemsOf(p, "team");
  const all = refsOf(p);
  const [stage, setStage] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [person, setPerson] = useState("");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState("");
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [who, setWho] = useState(() => { try { return localStorage.getItem("visionnary-who") ?? ""; } catch { return ""; } });
  const chooseWho = (name: string) => { setWho(name); try { localStorage.setItem("visionnary-who", name); } catch { /* non mémorisé */ } };

  const stageNames = useMemo(() => [...REF_STAGES.filter((s) => all.some((i) => i.refStage === s)), ...[...new Set(all.map((i) => String(i.refStage)))].filter((s) => !REF_STAGES.includes(s))], [all]);
  const categories = useMemo(() => [...new Set(all.filter((i) => !stage || i.refStage === stage).map((i) => String(i.category)))].sort(), [all, stage]);
  const q = query.trim().toLowerCase();
  const shown = all.filter((i) =>
    (!stage || i.refStage === stage) && (!category || i.category === category) && (!priority || i.priority === priority) && (!status || i.status === status) && (!person || i.assignee === person) &&
    (!q || `${i.title} ${i.notes} ${i.category} ${i.subject} ${i.tags} ${i.movement} ${i.effect}`.toLowerCase().includes(q)));
  const global = refProgress(all);
  const inStage = refProgress(all.filter((i) => !stage || i.refStage === stage));
  const current = all.find((i) => i.id === viewing);

  const log = (who_: string, text: string, itemId?: string) => ({ t: new Date().toISOString(), who: who_ || "Équipe", text, itemId });
  function setField(ids: string[], patch: Record<string, string | boolean>, text: string) {
    const stamp = patch.status === "fait" ? { doneBy: who || "Équipe", doneAt: new Date().toISOString() } : patch.status ? { doneBy: "", doneAt: "" } : {};
    const entries = ids.map((id) => log(who, `${who || "Équipe"} — ${all.find((i) => i.id === id)?.title ?? ""} — ${text}`, id));
    update({ ...p, items: p.items.map((i) => (ids.includes(i.id) ? { ...i, ...patch, ...stamp } : i)), activity: [...(p.activity ?? []), ...entries].slice(-500) }, text);
  }
  const setStatusOf = (ids: string[], s: string) => setField(ids, { status: s }, statusLabel(s).toUpperCase());
  function endOfStage() {
    const left = inStage.mustLeft;
    if (!left.length) return notify(`Aucun plan Must Have en attente${stage ? ` pour « ${stage} »` : ""}`);
    window.alert(`${left.length} plan(s) Must Have pas encore validé(s)${stage ? ` — ${stage}` : ""} :\n\n${left.map((i) => "• " + i.title).join("\n")}`);
  }

  if (!all.length) {
    return (
      <Screen title="Références du couple" backTo="/plus">
        <Empty icon={<Layers size={32} />} title="Aucune référence du couple" text="Importez le manifeste de la timeline DaVinci Resolve (Fichiers & sauvegarde › Importer des références). Chaque plan des vidéos choisies par les mariés devient une tâche à réaliser." />
      </Screen>
    );
  }

  return (
    <Screen title={`Références ${p.couple || p.name}`} backTo="/plus">
      <section className="ref-hero card">
        <div>
          <small className="muted">Références choisies par le couple · à reproduire / interpréter le jour J</small>
          <h2>{p.couple || p.name}</h2>
          <p className="ref-sub">{global.total} plans détectés · {global.by["fait"] ?? 0} faits · {global.by["en cours"] ?? 0} en cours · {global.by["à faire"] ?? 0} à faire · {global.by["impossible"] ?? 0} impossibles · {global.by["non nécessaire"] ?? 0} facultatifs</p>
        </div>
        <div className={"ref-pct" + (global.pct >= 100 ? " is-complete" : "")}><b>{global.pct} %</b><small>{global.done}/{global.total}</small></div>
        <div className="ref-bar"><i style={{ width: global.pct + "%" }} /></div>
        <label className="ref-who"><Users size={14} /> Je suis
          <select value={who} onChange={(e) => chooseWho(e.target.value)}>
            <option value="">— choisir —</option>
            {team.map((m) => <option key={m.id} value={m.title}>{m.title}</option>)}
          </select>
        </label>
      </section>

      <div className="ref-stages" role="tablist" aria-label="Étapes">
        <button className={"choice" + (!stage ? " on" : "")} onClick={() => { setStage(""); setCategory(""); }}>Toutes <small>{global.done}/{global.total}</small></button>
        {stageNames.map((s) => { const pr = refProgress(all.filter((i) => i.refStage === s)); return (
          <button key={s} className={"choice" + (stage === s ? " on" : "") + (pr.total && pr.done >= pr.total ? " is-done" : "")} onClick={() => { setStage(s); setCategory(""); }}>{s} <small>{pr.done}/{pr.total}</small></button>
        ); })}
      </div>

      <section className="ref-now card">
        <div><small className="muted">{stage ? "Maintenant" : "Vue d'ensemble"}</small><h3>{stage || "Toute la journée"}</h3></div>
        <dl><div><dt>À faire</dt><dd>{inStage.total - inStage.done}</dd></div><div><dt>Faits</dt><dd>{inStage.done}</dd></div><div><dt>Must Have restants</dt><dd className={inStage.mustLeft.length ? "warn" : ""}>{inStage.mustLeft.length}</dd></div></dl>
        <button className="btn small" onClick={endOfStage}><Check size={15} /> Fin d'étape</button>
        <div className="ref-by">{REF_PRIORITIES.map(([k, l]) => { const pr = refProgress(all.filter((i) => (!stage || i.refStage === stage) && i.priority === k)); return pr.total ? <span key={k}>{l} <b>{pr.done}/{pr.total}</b></span> : null; })}</div>
      </section>

      <div className="ref-filters">
        <label className="ref-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher : robe, drone, réaction, ralenti…" /></label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie"><option value="">Toutes catégories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priorité"><option value="">Toutes priorités</option>{REF_PRIORITIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut"><option value="">Tous statuts</option>{REF_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Responsable"><option value="">Tout le monde</option>{team.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
        <button className={"btn small" + (picking ? " gold" : "")} onClick={() => { setPicking(!picking); setPicked([]); }}>Sélection</button>
      </div>

      {picking && (
        <div className="select-bar" role="status">
          <strong>{picked.length} plan{picked.length > 1 ? "s" : ""}</strong>
          <button className="btn small" onClick={() => setPicked(shown.map((i) => i.id))}>Tout sélectionner</button>
          <select disabled={!picked.length} value="" onChange={(e) => { if (e.target.value) { setStatusOf(picked, e.target.value); setPicked([]); setPicking(false); } }}><option value="">Statut…</option>{REF_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <select disabled={!picked.length} value="" onChange={(e) => { if (e.target.value) { setField(picked, { refStage: e.target.value }, `déplacé vers « ${e.target.value} »`); setPicked([]); setPicking(false); } }}><option value="">Déplacer vers…</option>{REF_STAGES.map((s) => <option key={s}>{s}</option>)}</select>
          <select disabled={!picked.length} value="" onChange={(e) => { if (e.target.value) { setField(picked, { assignee: e.target.value === "-" ? "" : e.target.value }, "assigné"); setPicked([]); setPicking(false); } }}><option value="">Assigner à…</option><option value="-">Personne</option>{team.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
          <button className="btn small" disabled={!picked.length} onClick={() => { if (window.confirm(`Retirer ${picked.length} plan(s) de ce mariage ? Ils restent dans la bibliothèque générale.`)) { setField(picked, { status: "archivé" }, "retiré du mariage"); setPicked([]); setPicking(false); } }}>Retirer</button>
          <button className="btn small" onClick={() => { setPicking(false); setPicked([]); }}>Terminer</button>
        </div>
      )}

      <div className="ref-grid">
        {shown.map((i) => {
          const thumb = mediaFor(media, i);
          const on = picked.includes(i.id);
          const who_ = team.find((m) => m.id === i.assignee)?.title;
          return (
            <article key={i.id} className={"ref-card st-" + String(i.status).replace(/\s/g, "-") + (on ? " is-on" : "")}>
              <button className="ref-media" onClick={() => (picking ? setPicked((c) => (c.includes(i.id) ? c.filter((x) => x !== i.id) : [...c, i.id])) : setViewing(i.id))} aria-label={`Ouvrir ${i.title}`}>
                {thumb ? <Thumb media={thumb} className="ref-thumb" /> : <span className="ref-empty">Aperçu à venir</span>}
                <span className={"ref-prio p-" + String(i.priority).replace(/\s/g, "-")}>{prioLabel(String(i.priority))}</span>
                {i.status === "fait" && <span className="ref-done"><Check size={16} /></span>}
                {picking && <span className={"ref-check" + (on ? " on" : "")}>{on ? <Check size={16} /> : null}</span>}
              </button>
              <div className="ref-info">
                <strong>{String(i.title).replace(/^REF \d+ — /, "")}</strong>
                <small>{String(i.refCode)} · {String(i.category)}{who_ ? ` · ${who_}` : ""}</small>
              </div>
              <div className="ref-quick">
                <button className={i.status === "fait" ? "on" : ""} onClick={() => setStatusOf([i.id], i.status === "fait" ? "à faire" : "fait")}><Check size={16} /> {i.status === "fait" ? "Fait" : "Fait ?"}</button>
                <select aria-label="Statut" value={String(i.status)} onChange={(e) => setStatusOf([i.id], e.target.value)}>{REF_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </div>
              {i.status === "fait" && i.doneBy ? <small className="ref-by-line">Validé par {String(i.doneBy)} — {new Date(String(i.doneAt)).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small> : null}
            </article>
          );
        })}
      </div>
      {!shown.length && <p className="muted">Aucun plan ne correspond à ces filtres.</p>}

      <section className="ref-history">
        <div className="section-title">Historique{person ? "" : ""}</div>
        <ul>
          {[...(p.activity ?? [])].reverse().slice(0, 12).map((a, n) => <li key={n}><time>{new Date(a.t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</time> {a.text}</li>)}
          {!(p.activity ?? []).length && <li className="muted">Aucune action pour l'instant : chaque validation apparaîtra ici avec son auteur et l'heure.</li>}
        </ul>
      </section>

      {current && <RefViewer item={current} media={media} team={team} onClose={() => setViewing("")} setStatusOf={setStatusOf} setField={setField} ids={shown.map((i) => i.id)} onNav={setViewing} clock={clock} />}
    </Screen>
  );
}

function RefViewer({ item, media, team, onClose, setStatusOf, setField, ids, onNav }: { item: Item; media: ReturnType<typeof useMedia>; team: Item[]; onClose: () => void; setStatusOf: (ids: string[], s: string) => void; setField: (ids: string[], patch: Record<string, string | boolean>, text: string) => void; ids: string[]; onNav: (id: string) => void; clock: () => string }) {
  const clip = mediaFor(media, item);
  const [slow, setSlow] = useState(false);
  const idx = ids.indexOf(item.id);
  const [notes, setNotes] = useState(String(item.userNotes ?? ""));
  const [alt, setAlt] = useState(String(item.alternative ?? ""));
  return (
    <Sheet title={String(item.title)} onClose={onClose}>
      <div className="ref-viewer">
        <div className="ref-player">
          {clip ? <div key={item.id + String(slow)} className="ref-video" data-slow={slow}><VideoPreview media={clip} className="ref-video-el" loop /></div> : <p className="muted">Aperçu indisponible.</p>}
          <div className="ref-player-tools">
            <button className="btn small" disabled={idx <= 0} onClick={() => onNav(ids[idx - 1])}>← Précédent</button>
            <button className={"btn small" + (slow ? " gold" : "")} onClick={() => { setSlow(!slow); document.querySelectorAll<HTMLVideoElement>(".ref-video-el").forEach((v) => { v.playbackRate = slow ? 1 : 0.5; }); }}>{slow ? "Vitesse normale" : "Ralenti ×0,5"}</button>
            <button className="btn small" disabled={idx < 0 || idx >= ids.length - 1} onClick={() => onNav(ids[idx + 1])}>Suivant →</button>
          </div>
        </div>
        <div className="ref-detail">
          <p className="ref-desc">{String(item.notes)}</p>
          <dl className="ref-facts">
            <div><dt>Étape</dt><dd>{String(item.refStage)}</dd></div>
            <div><dt>Catégorie</dt><dd>{String(item.category)}</dd></div>
            <div><dt>Cadrage</dt><dd>{String(item.framing || "À confirmer")}</dd></div>
            <div><dt>Mouvement</dt><dd>{String(item.movement || "À confirmer")}</dd></div>
            {item.effect ? <div><dt>Effet</dt><dd>{String(item.effect)}</dd></div> : null}
            {item.drone ? <div><dt>Drone</dt><dd>Oui</dd></div> : null}
            <div><dt>Source</dt><dd>{String(item.refVideo)} · {String(item.srcIn)}–{String(item.srcOut)}</dd></div>
            <div><dt>Analyse</dt><dd>{String(item.confidence)}</dd></div>
          </dl>
          <label>Priorité<select value={String(item.priority)} onChange={(e) => setField([item.id], { priority: e.target.value }, "priorité modifiée")}>{REF_PRIORITIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label>Responsable<select value={String(item.assignee ?? "")} onChange={(e) => setField([item.id], { assignee: e.target.value }, "assigné")}><option value="">Non assigné</option>{team.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label>
          <label>Style de montage<select value={String(item.montageStyle ?? "")} onChange={(e) => setField([item.id], { montageStyle: e.target.value }, "style modifié")}><option value="">—</option>{REF_STYLES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Intensité / rythme<select value={String(item.intensity ?? "")} onChange={(e) => setField([item.id], { intensity: e.target.value }, "rythme modifié")}><option value="">—</option>{REF_INTENSITIES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Plan B / alternative<input value={alt} onChange={(e) => setAlt(e.target.value)} onBlur={() => alt !== String(item.alternative ?? "") && setField([item.id], { alternative: alt }, "alternative notée")} placeholder="Ex. drone impossible : plan large stabilisé depuis le balcon" /></label>
          <label>Notes<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== String(item.userNotes ?? "") && setField([item.id], { userNotes: notes }, "note ajoutée")} /></label>
          <div className="ref-status-row">
            {REF_STATUSES.map(([k, l]) => <button key={k} className={"btn small" + (item.status === k ? " gold" : "")} onClick={() => setStatusOf([item.id], k)}>{l}</button>)}
          </div>
          <button className="btn gold full ref-fait" onClick={() => { setStatusOf([item.id], "fait"); if (idx >= 0 && idx < ids.length - 1) onNav(ids[idx + 1]); else onClose(); }}><Check size={18} /> FAIT{idx >= 0 && idx < ids.length - 1 ? " · suivant" : ""}</button>
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
        </div>
      </div>
    </Sheet>
  );
}
