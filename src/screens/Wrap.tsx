import { CheckCircle2, Circle, Download } from "lucide-react";
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
        <div>
          <span>Plans tournés</span>
          <b>{tourne.length}</b>
        </div>
        <div>
          <span>Plans excellents</span>
          <b>{excellent.length}</b>
        </div>
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
