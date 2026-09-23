import { useEffect, useState } from "react";
import { AlertTriangle, Check, Clock3, MapPin, Play, Sun, Sunrise, Sunset, Users } from "lucide-react";
import type { Item, Project } from "./types";
import {
  applyReschedule,
  currentDelay,
  minutesOf,
  operatorConflicts,
  projectSun,
  proposeReschedule,
  runStages,
  type StageRun,
} from "./schedule";
import { compass, hhmm, sunAzimuth } from "./sun";
import { Sheet, navigate } from "./ui";
import "./dayrun.css";

export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

export const clock = (ms: number) => {
  const total = Math.round(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (ms < 0 ? "−" : "") + (h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`);
};
export const hm = (ms: number | null) => (ms === null ? "—:—" : hhmm(new Date(ms)));
export const signed = (minutes: number) => (minutes > 0 ? `+${minutes} min` : minutes < 0 ? `−${-minutes} min` : "à l’heure");

/** Alerte une seule fois par seuil et par étape, y compris après rechargement de la page. */
function alertOnce(key: string, message: string, notify: (s: string) => void) {
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    /* stockage de session indisponible : l'alerte reste affichée */
  }
  notify(message);
  navigator.vibrate?.([180, 80, 180]);
  if ("Notification" in window && Notification.permission === "granted") new Notification("VISIONNARY", { body: message });
}

export function SunCard({ project }: { project: Project }) {
  const sun = projectSun(project);
  if (!sun)
    return (
      <div className="card sun-card is-empty">
        <Sun size={22} />
        <div>
          <strong>Lever, coucher et golden hour</strong>
          <p className="muted">Ajoutez les coordonnées GPS d’un lieu (ex. « 48.8566, 2.3522 ») : calcul hors ligne pour la date du tournage.</p>
        </div>
        <button className="btn small" onClick={() => navigate("/m/venues")}>
          <MapPin size={14} /> Lieux
        </button>
      </div>
    );
  const t = sun.times;
  const side = t.goldenEveningStart ? compass(sunAzimuth(t.goldenEveningStart, sun.gps.lat, sun.gps.lng).azimuth) : "";
  return (
    <div className="card sun-card">
      <div className="list-head" style={{ padding: "0 0 8px" }}>
        Lumière du jour · {sun.venue.title}
        <Sun size={17} />
      </div>
      {t.polar ? (
        <p>{t.polar === "day" ? "Jour polaire : le soleil ne se couche pas." : "Nuit polaire : pas de lever de soleil."}</p>
      ) : (
        <div className="sun-grid">
          <div>
            <span>Blue hour</span>
            <strong>{hhmm(t.blueMorningStart)}</strong>
          </div>
          <div>
            <Sunrise size={15} />
            <span>Lever</span>
            <strong>{hhmm(t.sunrise)}</strong>
          </div>
          <div>
            <span>Fin golden</span>
            <strong>{hhmm(t.goldenMorningEnd)}</strong>
          </div>
          <div className="is-gold">
            <span>Golden hour</span>
            <strong>{hhmm(t.goldenEveningStart)}</strong>
          </div>
          <div>
            <Sunset size={15} />
            <span>Coucher</span>
            <strong>{hhmm(t.sunset)}</strong>
          </div>
          <div>
            <span>Fin blue hour</span>
            <strong>{hhmm(t.blueEveningEnd)}</strong>
          </div>
        </div>
      )}
      <small className="muted">Calcul astronomique indicatif (±2 min, sans relief ni météo).{side && ` Soleil du soir côté ${side}.`}</small>
    </div>
  );
}

/** Régie : étape en cours, chrono, T-5/T-2, retard et recalcul validé par le responsable. */
export default function DayRun({
  project: p,
  update,
  notify,
  compact = false,
}: {
  project: Project;
  update: (p: Project, message?: string) => void;
  notify: (s: string) => void;
  compact?: boolean;
}) {
  const now = useNow();
  const [proposal, setProposal] = useState<ReturnType<typeof proposeReschedule> | null>(null);
  const [reviewRun, setReviewRun] = useState<StageRun | null>(null);
  const [reviewChoices, setReviewChoices] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const runs = runStages(p);
  const running = runs.find((r) => r.state === "en cours");
  const next = runs.find((r) => r.state === "à venir");
  const delay = currentDelay(runs, now);
  const conflicts = operatorConflicts(p);

  const remaining = running ? running.startedAt! + minutesOf(running.item) * 60000 - now : null;
  useEffect(() => {
    if (!running || remaining === null) return;
    const id = running.item.id;
    if (remaining <= 0) alertOnce(`stage-${id}-over`, `Fin prévue de « ${running.item.title} » dépassée`, notify);
    else if (remaining <= 2 * 60000) alertOnce(`stage-${id}-t2`, `T-2 : « ${running.item.title} » se termine`, notify);
    else if (remaining <= 5 * 60000) alertOnce(`stage-${id}-t5`, `T-5 : « ${running.item.title} »`, notify);
  }, [running?.item.id, remaining !== null && Math.floor(remaining / 30000)]);

  const patch = (changes: Map<string, Partial<Item>>, message: string) =>
    update({ ...p, items: p.items.map((i) => (changes.has(i.id) ? ({ ...i, ...changes.get(i.id) } as Item) : i)) }, message);
  const stamp = () => new Date().toISOString();

  function start(run: StageRun) {
    const changes = new Map<string, Partial<Item>>();
    if (running) changes.set(running.item.id, { endedAt: stamp(), status: "terminé" });
    changes.set(run.item.id, { startedAt: stamp(), actualTime: hhmm(new Date()), status: "en cours" });
    patch(changes, `« ${run.item.title} » démarrée`);
  }
  const stageActions = (run: StageRun) => p.items.filter((item) =>
    item.stageId === run.item.id &&
    ["shots", "checklists", "reminders", "equipment", "backups", "sde"].includes(item.module) &&
    !["archivé", "sauté", "impossible"].includes(item.status) &&
    !["tourné", "excellent", "terminé", "vérifié", "livré"].includes(item.status),
  );
  function closeReview(run: StageRun, choices: Record<string, string>, notes: Record<string, string>) {
    const changes = new Map<string, Partial<Item>>();
    for (const item of stageActions(run)) {
      const choice = choices[item.id];
      if (!choice) continue;
      const status = choice === "fait" ? (item.module === "shots" ? "tourné" : "terminé")
        : choice === "non-fait" ? "prévu"
        : choice === "plus-nécessaire" ? "archivé"
        : choice;
      const note = notes[item.id]?.trim();
      changes.set(item.id, {
        status,
        ...(choice === "non-fait" && note ? { notes: [item.notes.trim(), "Fin d’étape : " + note].filter(Boolean).join("\n\n") } : {}),
      });
    }
    changes.set(run.item.id, { endedAt: stamp(), status: "terminé" });
    patch(changes, `« ${run.item.title} » terminée`);
    setReviewRun(null);
  }
  function finish(run: StageRun) {
    if (stageActions(run).length) {
      setReviewRun(run);
      setReviewChoices({});
      setReviewNotes({});
      return;
    }
    closeReview(run, {}, {});
  }

  return (
    <section className="dayrun">
      <div className={"card dayrun-live " + (running ? "is-running" : "")}>
        <div className="list-head" style={{ padding: "0 0 8px" }}>
          Régie · suivi réel
          <span className={"delay-chip " + (delay > 5 ? "late" : delay < -5 ? "early" : "")}>
            <Clock3 size={13} />
            {signed(delay)}
          </span>
        </div>
        {running ? (
          <>
            <h2>{running.item.title}</h2>
            <p className="muted">
              Démarrée à {hm(running.startedAt)} (prévu {hm(running.plannedStart)}) · {minutesOf(running.item)} min
            </p>
            <div className={"dayrun-clock " + (remaining! <= 0 ? "over" : remaining! <= 5 * 60000 ? "soon" : "")}>
              <div>
                <span>Écoulé</span>
                <strong>{clock(now - running.startedAt!)}</strong>
              </div>
              <div>
                <span>{remaining! <= 0 ? "Dépassement" : "Restant"}</span>
                <strong>{clock(remaining! <= 0 ? -remaining! : remaining!)}</strong>
              </div>
              {remaining! > 0 && remaining! <= 5 * 60000 && <b className="t-badge">{remaining! <= 2 * 60000 ? "T-2" : "T-5"}</b>}
            </div>
            <div className="btn-row">
              {next && (
                <button className="btn gold" onClick={() => start(next)}>
                  <Play size={16} /> Enchaîner : {next.item.title}
                </button>
              )}
              <button className="btn" onClick={() => finish(running)}>
                <Check size={16} /> Terminer l’étape
              </button>
            </div>
          </>
        ) : next ? (
          <>
            <h2>Prochaine étape : {next.item.title}</h2>
            <p className="muted" style={{ margin: "4px 0 12px" }}>
              Prévue à {hm(next.plannedStart)} · {minutesOf(next.item)} min
              {next.plannedStart !== null &&
                ` · ${
                  next.plannedStart <= now
                    ? "heure dépassée"
                    : next.plannedStart - now > 12 * 3600000
                      ? "le " + new Date(next.plannedStart).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
                      : "dans " + clock(next.plannedStart - now)
                }`}
            </p>
            <button className="btn gold" onClick={() => start(next)}>
              <Play size={16} /> Démarrer maintenant
            </button>
          </>
        ) : runs.length ? (
          <>
            <h2>Journée terminée.</h2>
            <p className="muted">Toutes les étapes ont été suivies.</p>
            <button className="btn gold" style={{ marginTop: 12 }} onClick={() => navigate("/fin")}>
              Récapitulatif de fin de journée
            </button>
          </>
        ) : (
          <p className="muted">Ajoutez des étapes avec une heure prévue pour suivre la journée en temps réel.</p>
        )}
        {delay >= 5 && runs.some((r) => r.state === "à venir") && (
          <div className="notice" style={{ marginTop: 12 }}>
            <AlertTriangle size={17} />
            <span>{delay} min de retard. Rien n’est décalé sans votre validation.</span>
            <button className="btn small gold" onClick={() => setProposal(proposeReschedule(runs, delay))}>
              Recalculer
            </button>
          </div>
        )}
        {delay <= -5 && runs.some((r) => r.state === "à venir") && (
          <p className="muted" style={{ marginTop: 10 }}>
            Avance de {-delay} min : les horaires des invités restent inchangés.
          </p>
        )}
      </div>

      {!compact && conflicts.length > 0 && (
        <div className="notice red" role="alert">
          <Users size={17} />
          <div>
            <strong>Conflits d’équipe</strong>
            {conflicts.map((c, n) => (
              <div key={n}>
                {c.operator.title} : « {c.a.title} » ({String(c.a.time)}) et « {c.b.title} » ({String(c.b.time)}) se chevauchent.
              </div>
            ))}
          </div>
        </div>
      )}

      {proposal && (
        <Sheet title="Recalcul proposé" onClose={() => setProposal(null)}>
          <p>
            Décalage de <strong>{signed(delay)}</strong> sur les étapes non démarrées. Validez avec le responsable ; les étapes à compresser
            restent à arbitrer.
          </p>
          <div className="list" style={{ marginTop: 12 }}>
            {proposal.map((c) => (
              <div className="row" key={c.item.id}>
                <span className="row-main">
                  <strong>{c.item.title}</strong>
                </span>
                <span className="row-trail">
                  <s>{c.from}</s> → <b>{c.to}</b>
                </span>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn" onClick={() => setProposal(null)}>
              Garder le planning
            </button>
            <button
              className="btn gold"
              onClick={() => {
                update(applyReschedule(p, proposal), "Nouveau planning validé");
                setProposal(null);
              }}
            >
              <Check size={16} /> Valider
            </button>
          </div>
        </Sheet>
      )}
      {reviewRun && (
        <Sheet title={"Fin de mission · " + reviewRun.item.title} onClose={() => setReviewRun(null)}>
          <p className="muted">Certains éléments de cette étape ne sont pas encore validés. Choisissez un état si vous le savez ; vous pouvez aussi terminer l’étape sans tout traiter.</p>
          <div className="finish-review-list">
            {stageActions(reviewRun).map((item) => (
              <article className="finish-review-item" key={item.id}>
                <strong>{item.title}</strong>
                <small>{item.module === "shots" ? "Plan" : item.module === "equipment" ? "Matériel" : item.module === "checklists" ? "Checklist" : item.module === "reminders" ? "Rappel" : "Transfert / postproduction"}</small>
                <div className="finish-review-actions">
                  {([["fait", "Fait ?"], ["non-fait", "Non fait"], ["sauté", "Sauté"], ["impossible", "Impossible"], ["plus-nécessaire", "Plus nécessaire"]] as const).map(([value, label]) => (
                    <button key={value} type="button" className={"btn small" + (reviewChoices[item.id] === value ? " gold" : "")} aria-pressed={reviewChoices[item.id] === value} onClick={() => setReviewChoices((current) => ({ ...current, [item.id]: value }))}>{label}</button>
                  ))}
                </div>
                {reviewChoices[item.id] === "non-fait" && <label className="field">Que s’est-il passé ? (facultatif)<textarea value={reviewNotes[item.id] ?? ""} onChange={(e) => setReviewNotes((current) => ({ ...current, [item.id]: e.target.value }))} /></label>}
              </article>
            ))}
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setReviewRun(null)}>Revenir à l’étape</button>
            <button type="button" className="btn gold" onClick={() => closeReview(reviewRun, reviewChoices, reviewNotes)}>Terminer l’étape</button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
