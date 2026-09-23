import { useState } from "react";
import { CalendarPlus, ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { Item, Project } from "../types";
import { makeItem } from "../model";
import { useProject } from "../store";
import { runStages } from "../schedule";
import DayRun, { SunCard, hm, signed } from "../DayRun";
import { navigate, Screen, Tabs } from "../ui";
import { ItemEditor, titleOf } from "./common";
import { stageLook } from "./stageIcons";
import "./timeline.css";

/**
 * Frise du jour : heure, pictogramme coloré, étape. Réutilisée dans la fiche tournage.
 * Un tap ouvre l'écran complet de l'étape (pas une fenêtre) : tous ses plans, groupés par personne.
 */
export function StageTimeline({ project: p }: { project: Project }) {
  const runs = runStages(p);
  if (!runs.length) return <p className="muted">Aucune étape. Ajoutez la première ci-dessous.</p>;
  return (
    <ol className="stage-line">
      {runs.map((r) => {
        const { Icon, color } = stageLook(r.item.title, r.item);
        const shots = p.items.filter((i) => i.module === "shots" && i.stageId === r.item.id);
        return (
          <li key={r.item.id} className={"state-" + r.state.replace(" ", "-")}>
            <button onClick={() => navigate("/etape/" + r.item.id)}>
              <time>
                {String(r.item.time || "—:—")}
                {r.item.originalTime && r.item.originalTime !== r.item.time && <s>{String(r.item.originalTime)}</s>}
              </time>
              <span className="stage-icon" style={{ background: color }}>
                <Icon size={18} />
              </span>
              <span className="stage-text">
                <strong>{r.item.title}</strong>
                <small>
                  {[titleOf(p, r.item.venueId) || r.item.scene, r.item.duration ? `${r.item.duration} min` : "", shots.length ? `${shots.length} plans` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
                {r.startedAt && (
                  <small className={"stage-real " + ((r.startDelay ?? 0) > 5 ? "late" : "")}>
                    Réel {hm(r.startedAt)} · {signed(r.startDelay ?? 0)}
                    {r.state === "en cours" ? " · en cours" : ""}
                  </small>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function Timeline() {
  const { project: p, update, notify } = useProject();
  const [tab, setTab] = useState<"timeline" | "list" | "regie">("timeline");
  const [editing, setEditing] = useState<Item | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const stages = p.items.filter((i) => i.module === "stages" && i.status !== "archivé").sort((a, b) => a.order - b.order);
  const add = () => setEditing(makeItem("stages", "", { order: stages.length, duration: 30, time: String(stages.at(-1)?.time ?? "") }));
  const addUnexpectedEvent = () => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setEditing(makeItem("stages", eventTitle.trim(), { category: "Événement imprévu", time, duration: 15, priority: "IMPORTANT", order: stages.length }));
    setEventTitle("");
  };
  function move(i: Item, d: number) {
    const idx = stages.findIndex((s) => s.id === i.id);
    const target = stages[idx + d];
    if (!target) return;
    update({ ...p, items: p.items.map((x) => (x.id === i.id ? { ...x, order: target.order } : x.id === target.id ? { ...x, order: i.order } : x)) });
  }
  function sortByTime() {
    const sorted = [...stages].sort((a, b) => String(a.time || "99").localeCompare(String(b.time || "99")));
    const order = new Map(sorted.map((s, n) => [s.id, n]));
    update({ ...p, items: p.items.map((x) => (order.has(x.id) ? { ...x, order: order.get(x.id)! } : x)) }, "Étapes triées par heure");
  }
  return (
    <Screen title="Déroulé du jour J" backTo="/tournage">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ["timeline", "Timeline"],
          ["list", "Vue liste"],
          ["regie", "Régie"],
        ]}
      />
      <div className="card" style={{ margin: "12px 0", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label className="field" style={{ flex: "1 1 220px", margin: 0 }}>Événement imprévu<input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Discours surprise, animation…" onKeyDown={(e) => { if (e.key === "Enter" && eventTitle.trim()) addUnexpectedEvent(); }} /></label>
        <button className="btn gold" onClick={addUnexpectedEvent} disabled={!eventTitle.trim()}><CalendarPlus size={16} /> Ajouter maintenant</button>
      </div>
      {tab === "timeline" && <StageTimeline project={p} />}
      {tab === "list" && (
        <>
          <div className="list">
            {stages.map((s, n) => (
              <div className="row" key={s.id}>
                <span className="date-block">
                  <b style={{ fontSize: 16 }}>{String(s.time || "—:—")}</b>
                  <small>{s.duration ? `${s.duration} min` : ""}</small>
                </span>
                <button className="row-main" style={{ textAlign: "left" }} onClick={() => setEditing(s)}>
                  <strong>{s.title}</strong>
                  <small>
                    {titleOf(p, s.venueId) || "Lieu —"} · {titleOf(p, s.operatorId) || "Responsable —"}
                  </small>
                </button>
                <span className="row-trail">
                  <button className="icon-btn" aria-label={"Monter " + s.title} disabled={!n} onClick={() => move(s, -1)}>
                    <ChevronUp size={18} />
                  </button>
                  <button className="icon-btn" aria-label={"Descendre " + s.title} disabled={n === stages.length - 1} onClick={() => move(s, 1)}>
                    <ChevronDown size={18} />
                  </button>
                </span>
              </div>
            ))}
          </div>
          <button className="btn small" style={{ marginTop: 10 }} onClick={sortByTime}>
            Trier par heure
          </button>
        </>
      )}
      {tab === "regie" && (
        <div className="stack">
          <DayRun project={p} update={update} notify={notify} />
          <SunCard project={p} />
        </div>
      )}
      <div className="fab-bar">
        <button className="btn gold full" onClick={add}>
          <Plus size={18} /> Ajouter une étape
        </button>
      </div>
      {editing && <ItemEditor item={editing} onClose={() => setEditing(null)} />}
    </Screen>
  );
}
