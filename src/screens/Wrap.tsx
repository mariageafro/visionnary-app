import { CheckCircle2, Circle, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { done } from "../model";
import { useProject } from "../store";
import { exportWorkspace } from "../exports";
import { useStore } from "../store";
import { CheckBox, Screen } from "../ui";
import { itemsOf } from "./common";

/** Mode fin de journée : checklist finale + récapitulatif, pour clore le tournage sereinement. */
export default function Wrap() {
  const { project: p, update, notify } = useProject();
  const { w } = useStore();
  const after = itemsOf(p, "checklists").filter((i) => (i.phase ?? "avant") === "apres");
  const shots = itemsOf(p, "shots");
  const tourne = shots.filter(done);
  const excellent = shots.filter((s) => s.status === "excellent");
  const manquants = shots.filter((s) => !done(s) && s.status !== "sauté" && s.status !== "impossible");
  const tasks = itemsOf(p, "checklists").filter((t) => t.status !== "archivé");
  const backups = itemsOf(p, "backups");
  const essentials = shots.filter((shot) => shot.priority === "MUST HAVE");
  const skipped = shots.filter((shot) => ["sauté", "impossible"].includes(shot.status));
  const events = p.items.filter((item) => item.module === "stages" && item.category === "Événement imprévu");
  const incidents = p.items.filter((item) => item.category === "Incident" || item.kind === "incident");
  const unrecovered = itemsOf(p, "equipment").filter((item) => !["récupéré", "archivé"].includes(item.status));
  const pendingMedia = backups.filter((item) => ["à transférer", "en attente", "prévu"].includes(item.status));
  const editingNotes = itemsOf(p, "postproduction").filter((item) => item.notes || item.title);
  const report = {
    project: p.couple || p.name,
    date: p.date,
    plans: { total: shots.length, faits: tourne.length, progression: shots.length ? Math.round(tourne.length / shots.length * 100) : 0, essentiels: essentials.length, essentielsFaits: essentials.filter(done).length, progressionEssentiels: essentials.length ? Math.round(essentials.filter(done).length / essentials.length * 100) : 0, excellents: excellent.length, aRefaire: shots.filter((shot) => shot.status === "à refaire").length, sautes: skipped.length, manquants: manquants.map((shot) => shot.title) },
    evenementsAjoutes: events.map((item) => ({ titre: item.title, heure: item.time, notes: item.notes })),
    incidents: incidents.map((item) => ({ titre: item.title, notes: item.notes })),
    materielNonRecupere: unrecovered.map((item) => ({ nom: item.title, etat: item.status })),
    mediasNonTransferes: pendingMedia.map((item) => item.title),
    notesMontage: editingNotes.map((item) => ({ titre: item.title, notes: item.notes })),
  };
  const downloadReport = (format: "json" | "csv") => {
    const rows: [string, string | number][] = [
      ["Couple", report.project], ["Date", report.date], ["Plans réalisés (%)", report.plans.progression], ["Essentiels réalisés (%)", report.plans.progressionEssentiels], ["Plans prévus", shots.length], ["Plans faits", tourne.length], ["Plans excellents", excellent.length], ["Plans à refaire", report.plans.aRefaire], ["Plans sautés ou impossibles", skipped.length], ["Événements ajoutés", events.length], ["Incidents", incidents.length], ["Matériel non récupéré", unrecovered.length], ["Médias non transférés", pendingMedia.length],
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const content = format === "json" ? JSON.stringify(report, null, 2) : csv;
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `bilan-${(p.couple || p.name).toLocaleLowerCase("fr").replace(/[^a-z0-9]+/g, "-")}.${format}`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <Screen title="Fin de journée" backTo="/jourj">
      <div className="card" style={{ textAlign: "center", marginBottom: 14 }}>
        <span className="script" style={{ fontSize: 22 }}>On n’oublie rien, on fait les choses bien.</span>
      </div>

      <div className="section-title">Checklist finale</div>
      <div className="list">
        {after.length ? (
          after.map((i) => (
            <div key={i.id} className={"row" + (done(i) ? " is-done" : "")}>
              <CheckBox on={done(i)} label={i.title} onToggle={() => update({ ...p, items: p.items.map((x) => (x.id === i.id ? { ...x, status: done(i) ? "prévu" : "terminé" } : x)) })} />
              <button className="row-main" style={{ textAlign: "left" }} onClick={() => update({ ...p, items: p.items.map((x) => (x.id === i.id ? { ...x, status: done(i) ? "prévu" : "terminé" } : x)) })}>
                <strong>{i.title}</strong>
              </button>
            </div>
          ))
        ) : (
          <div className="row">Aucune tâche « Après » définie. Chargez la checklist standard dans Checklist.</div>
        )}
      </div>

      <div className="section-title">Récapitulatif</div>
      <div className="card kv">
        <div>
          <span>Plans prévus</span>
          <b>{shots.length}</b>
        </div>
        <div><span>Progression globale</span><b>{report.plans.progression} %</b></div>
        <div><span>Progression essentiels</span><b>{report.plans.progressionEssentiels} %</b></div>
        <div>
          <span>Plans tournés</span>
          <b>{tourne.length}</b>
        </div>
        <div>
          <span>Plans excellents</span>
          <b>{excellent.length}</b>
        </div>
        <div><span>Plans à refaire</span><b>{report.plans.aRefaire}</b></div>
        <div><span>Plans sautés / impossibles</span><b>{skipped.length}</b></div>
        <div>
          <span>Plans manquants</span>
          <b className={manquants.length ? "" : ""} style={{ color: manquants.length ? "var(--red)" : undefined }}>
            {manquants.length}
          </b>
        </div>
        <div>
          <span>Tâches restantes</span>
          <b>{tasks.filter((t) => !done(t)).length}</b>
        </div>
        <div>
          <span>Sauvegardes confirmées</span>
          <b>
            {backups.filter(done).length}/{backups.length}
          </b>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="section-title">Bilan à emporter</div>
        <p className="muted">{events.length} événement(s) ajouté(s) · {incidents.length} incident(s) consigné(s) · {unrecovered.length} matériel(s) à récupérer · {pendingMedia.length} transfert(s) en attente</p>
        <div className="btn-row"><button className="btn" onClick={() => downloadReport("json")}><FileJson size={16}/> Export JSON</button><button className="btn" onClick={() => downloadReport("csv")}><FileSpreadsheet size={16}/> Export CSV</button></div>
      </div>

      {manquants.length > 0 && (
        <>
          <div className="section-title">Plans manquants</div>
          <div className="list">
            {manquants.map((s) => (
              <div className="row" key={s.id}>
                <Circle size={18} color="var(--red)" />
                <span className="row-main">
                  <strong>{s.title}</strong>
                  {s.priority === "MUST HAVE" && <small style={{ color: "var(--red)" }}>Essentiel</small>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        className="btn gold full"
        style={{ marginTop: 16 }}
        onClick={async () => {
          await exportWorkspace(w);
          notify("Sauvegarde téléchargée");
        }}
      >
        <Download size={17} /> Télécharger la sauvegarde du jour
      </button>

      {after.length > 0 && after.every(done) && manquants.length === 0 && (
        <div className="notice" style={{ marginTop: 14, justifyContent: "center" }}>
          <CheckCircle2 size={18} />
          Tournage bouclé. Belle journée !
        </div>
      )}
    </Screen>
  );
}
