import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Bell, Check, ChevronRight, Images, Moon, Play, Pause, RotateCcw, Search, SkipForward, Star, Sun, Plus, Shuffle, Clapperboard } from "lucide-react";
import type { Item } from "../types";
import { done, sectionOf } from "../model";
import { dayOrder } from "../moments";
import { useProject } from "../store";
import { currentDelay, minutesOf, runStages } from "../schedule";
import { dueReminders } from "../reminders";
import { hhmm } from "../sun";
import { clock, signed, useNow } from "../DayRun";
import { CheckBox, Empty, MediaViewer, Tabs, Thumb, navigate, useMedia } from "../ui";
import { ItemEditor, itemsOf, mediaFor, MediaCard, OperatorPills, operatorsOf, QuickView, shortFocal, titleOf } from "./common";
import { addTake, readTakes, referenceFor, takeFlags, toggleFlag } from "./takes";
import "./field.css";

const skipped = (i: Item) => ["sauté", "impossible"].includes(i.status);

function useMe(projectId: string) {
  const key = "visionnary-me-" + projectId;
  const [me, setMe] = useState(() => {
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  });
  return [
    me,
    (v: string) => {
      setMe(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        /* filtre non mémorisé */
      }
    },
  ] as const;
}

/** Mode Jour J : lisible en 3 secondes, utilisable d'une main, tout hors ligne. */
export default function FieldMode() {
  const { project: p, patchItem, update, notify } = useProject();
  const now = useNow();
  const media = useMedia(p.id);
  const [me, setMe] = useMe(p.id);
  const [tab, setTab] = useState<"plans" | "checklist" | "rappels" | "poses" | "inspi">("plans");
  const [inspiQuery, setInspiQuery] = useState("");
  const [inspiViewing, setInspiViewing] = useState<Item | null>(null);
  const [inspiEditing, setInspiEditing] = useState<Item | null>(null);
  const [selected, setSelected] = useState("");
  const [viewer, setViewer] = useState(false);
  const [planB, setPlanB] = useState(false);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [mustOnly, setMustOnly] = useState(false);

  const runs = runStages(p);
  const running = runs.find((r) => r.state === "en cours");
  const nextStage = runs.find((r) => r.state === "à venir");
  const delay = currentDelay(runs, now);
  const operators = operatorsOf(p);
  // Un membre retiré de l'équipe ne doit pas filtrer tout le Jour J sur du vide.
  const meId = me && operators.has(me) ? me : "";
  const mine = (i: Item) => !meId || i.operatorId === meId;

  // Ordre de la journée (déroulé puis moments de la frise), calculé sur toute l'équipe puis filtré :
  // les horaires restent ceux de la frise, quel que soit le cadreur affiché.
  const allShots = dayOrder(p, itemsOf(p, "shots"));
  const shots = allShots.filter(mine);
  // Plans de l'étape en cours d'abord, puis le reste dans l'ordre de la journée.
  const ordered = running ? [...shots.filter((s) => s.stageId === running.item.id), ...shots.filter((s) => s.stageId !== running.item.id)] : shots;
  const open = (s: Item) => !done(s) && !skipped(s);
  // Un essentiel sauté reste manquant : il revient dans la liste des essentiels.
  const essentials = ordered.filter((s) => s.priority === "MUST HAVE" && !done(s));
  const queue = mustOnly ? essentials : ordered.filter(open);
  const shot = ordered.find((s) => s.id === selected) ?? queue[0];
  const upcoming = queue.filter((s) => s.id !== shot?.id);
  const next = upcoming[0];
  const ref = shot ? referenceFor(media, shot) : undefined;
  const takes = shot ? readTakes(shot) : [];
  const completed = shots.filter(done).length;
  const remaining = new Map<string, number>([["", allShots.filter(open).length]]);
  for (const s of allShots) if (open(s) && s.operatorId) remaining.set(String(s.operatorId), (remaining.get(String(s.operatorId)) ?? 0) + 1);
  const tasks = itemsOf(p, "checklists").filter((i) => (i.phase ?? "avant") === "jourj" && mine(i));
  const reminders = dueReminders(p).filter((r) => r.active && !done(r.item) && mine(r.item));
  const poses = itemsOf(p, "poses");
  const pose = poses.find((x) => !done(x));
  const inspirations = itemsOf(p, "inspirations").filter((i) => (i.title + " " + i.tags + " " + i.category).toLowerCase().includes(inspiQuery.toLowerCase()));

  useEffect(() => {
    setPlanB(false);
    setTimerEnd(null);
  }, [shot?.id]);
  useEffect(() => {
    if (timerEnd && now >= timerEnd) {
      setTimerEnd(null);
      notify("⏱ Temps du plan écoulé");
      navigator.vibrate?.([300, 120, 300]);
    }
  }, [now, timerEnd]);

  function mark(status: string) {
    if (!shot) return;
    patchItem(shot.id, { status }, `${shot.title} · ${status}`);
    if (status !== "à refaire") setSelected(next?.id ?? "");
    navigator.vibrate?.(40);
  }
  const nowOp = shot ? operators.get(String(shot.operatorId)) : undefined;
  const nextOp = next ? operators.get(String(next.operatorId)) : undefined;
  const nextRef = next ? referenceFor(media, next) : undefined;
  const where = (s: Item) => [titleOf(p, s.stageId), s.section ? sectionOf(s) : ""].filter(Boolean).join(" · ");
  const mode = document.documentElement.dataset.mode;
  const setMode = (m: string) => {
    document.documentElement.dataset.mode = m;
    try {
      localStorage.setItem("visionnary-mode", m);
    } catch {
      /* non mémorisé */
    }
    notify(m === "terrain" ? "Lisibilité soleil" : m === "night" ? "Mode nuit discret" : "Mode studio");
  };

  return (
    <div className="field-mode">
      <header className="field-top">
        <button className="icon-btn" aria-label="Quitter le mode Jour J" onClick={() => navigate("/tournage")}>
          <ArrowLeft size={22} />
        </button>
        <div className="field-clock">
          <span className="live-dot" />
          <strong>{new Date(now).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong>
          <span className={"delay " + (delay > 5 ? "late" : "")}>{signed(delay)}</span>
        </div>
        <button className="icon-btn" aria-label="Changer la lisibilité" onClick={() => setMode(mode === "terrain" ? "night" : mode === "night" ? "studio" : "terrain")}>
          {mode === "night" ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      {operators.size > 0 && (
        <OperatorPills
          project={p}
          value={meId}
          counts={remaining}
          label="Missions de"
          onChange={(id) => {
            setMe(id);
            setSelected("");
          }}
        />
      )}

      <button className="field-stage" onClick={() => navigate("/deroule")}>
        {running ? (
          <>
            <span className="field-stage-label">ÉTAPE EN COURS</span>
            <strong>{running.item.title}</strong>
            <span className="field-stage-time">
              {(() => {
                const left = running.startedAt! + minutesOf(running.item) * 60000 - now;
                return left > 0 ? `reste ${clock(left)}` : `dépassé ${clock(-left)}`;
              })()}
            </span>
          </>
        ) : nextStage ? (
          <>
            <span className="field-stage-label">PROCHAINE ÉTAPE</span>
            <strong>{nextStage.item.title}</strong>
            <span className="field-stage-time">{String(nextStage.item.time || "")} · démarrer ›</span>
          </>
        ) : (
          <>
            <span className="field-stage-label">DÉROULÉ</span>
            <strong>Aucune étape en cours</strong>
          </>
        )}
      </button>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          ["plans", "Plans", ordered.filter(open).length],
          ...(inspirations.length ? ([["inspi", "Inspi", inspirations.length]] as ["inspi", string, number][]) : []),
          ["checklist", "Checklist", tasks.filter((t) => !done(t)).length],
          ["rappels", "Rappels", reminders.length],
          ...(poses.length ? ([["poses", "Poses", poses.filter((x) => !done(x)).length]] as ["poses", string, number][]) : []),
        ]}
      />

      {tab === "plans" && (
        <>
          <div className="field-progress">
            <div className="field-progress-row">
              {/* Le cadreur affiché est déjà dans les pastilles : ici, juste l'avancement. */}
              <span>
                {completed}/{shots.length} tournés
              </span>
              {essentials.length > 0 || mustOnly ? (
                <button
                  className={"field-must-btn" + (mustOnly ? " on" : "")}
                  aria-pressed={mustOnly}
                  onClick={() => {
                    setMustOnly(!mustOnly);
                    setSelected("");
                  }}
                >
                  <AlertTriangle size={16} />
                  {mustOnly
                    ? "Essentiels seulement · tout revoir"
                    : `${essentials.length} essentiel${essentials.length > 1 ? "s" : ""} manquant${essentials.length > 1 ? "s" : ""}`}
                </button>
              ) : (
                shots.length > 0 && (
                  <span className="field-must-ok">
                    <Check size={15} strokeWidth={3} /> Essentiels faits
                  </span>
                )
              )}
            </div>
            <div className="progress dark">
              <span style={{ width: `${shots.length ? (completed / shots.length) * 100 : 0}%` }} />
            </div>
          </div>

          {shot ? (
            <>
              <div className="field-label now">
                <b>{running ? "MAINTENANT" : "PREMIER PLAN À PRÉPARER"}</b>
                <span>{where(shot)}</span>
              </div>
              {!running && (
                <p className="muted field-not-started">Le tournage n’a pas encore démarré · appuyez sur « démarrer » ci-dessus quand vous êtes prêt.</p>
              )}
              <section className="field-shot">
                <div className="field-ref" onClick={() => ref && setViewer(true)}>
                  {ref ? (
                    <Thumb media={ref} className="field-ref-img" full />
                  ) : (
                    <div className="field-ref-empty">
                      <Clapperboard size={40} />
                      <span>Pas de référence · ajoutez-en une dans la fiche du plan</span>
                    </div>
                  )}
                  {shot.priority === "MUST HAVE" && <span className="chip red field-must">MUST HAVE</span>}
                  {shot.clipOut ? (
                    <span className="chip dark field-clip">
                      Clip {String(shot.clipIn ?? 0)}–{String(shot.clipOut)} s
                    </span>
                  ) : null}
                </div>
                <div className="field-shot-body">
                  {shot.status !== "prévu" && shot.status !== "prêt" && <small className="field-kicker">Statut : {shot.status}</small>}
                  <h2>{shot.title}</h2>
                  {planB ? (
                    <p className="field-planb">
                      <b>PLAN B</b> {String(shot.planB)}
                    </p>
                  ) : (
                    <>
                      <div className="field-specs">
                        <div>
                          <span>Cadrage</span>
                          <strong>{String(shot.framing || "—")}</strong>
                        </div>
                        <div>
                          <span>Focale</span>
                          <strong>{shortFocal(shot.focal) || "—"}</strong>
                        </div>
                        <div>
                          <span>Mouvement</span>
                          <strong>{String(shot.movement || "—")}</strong>
                        </div>
                        <div>
                          <span>Opérateur</span>
                          <strong className="field-op">
                            {nowOp ? (
                              <>
                                <i style={{ background: nowOp.color }} />
                                {nowOp.name}
                              </>
                            ) : (
                              "Équipe"
                            )}
                          </strong>
                        </div>
                      </div>
                      {[shot.angle, shot.camera, shot.subject, shot.light].some(Boolean) && (
                        <div className="field-more">
                          {(
                            [
                              ["Angle", shot.angle],
                              ["Caméra", shot.camera],
                              ["Sujet", shot.subject],
                              ["Lumière", shot.light],
                            ] as const
                          )
                            .filter(([, v]) => v)
                            .map(([label, v]) => (
                              <span key={label}>
                                <b>{label}</b> {String(v)}
                              </span>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                  {shot.notes && !planB && <p className="field-notes">{shot.notes}</p>}
                  <div className="field-mini">
                    {shot.planB ? (
                      <button className={"btn small" + (planB ? " gold" : "")} onClick={() => setPlanB(!planB)}>
                        <Shuffle size={15} /> Plan B
                      </button>
                    ) : null}
                    <button
                      className="btn small"
                      onClick={() => setTimerEnd(timerEnd ? null : Date.now() + (Number(shot.shootMinutes) || 3) * 60000)}
                    >
                      {timerEnd ? <Pause size={15} /> : <Play size={15} />}
                      {timerEnd ? clock(timerEnd - now) : `${Number(shot.shootMinutes) || 3} min`}
                    </button>
                    <button className="btn small" onClick={() => patchItem(shot.id, addTake(shot), `Prise ${(takes.at(-1)?.n ?? 0) + 1} notée`)}>
                      <Plus size={15} /> Prise
                    </button>
                  </div>
                  {takes.length > 0 && (
                    <div className="field-takes">
                      {takes.slice(-3).map((t) => (
                        <div key={t.n} className="field-take">
                          <b>T{t.n}</b>
                          {takeFlags.map((f) => (
                            <button
                              key={f}
                              className={"chip " + (t.flags.includes(f) ? (f === "OK" || f === "Favorite" ? "green" : "red") : "outline")}
                              onClick={() => patchItem(shot.id, toggleFlag(shot, t.n, f))}
                            >
                              {f}
                            </button>
                          ))}
                          <button
                            className={"chip " + (Number(shot.bestTake) === t.n ? "gold" : "outline")}
                            onClick={() => patchItem(shot.id, { bestTake: t.n }, `Best take : T${t.n}`)}
                          >
                            <Star size={12} /> Best
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <div className="field-label">
                <b>ENSUITE</b>
                {next && <span>{where(next)}</span>}
              </div>
              {next ? (
                <button className="field-next" onClick={() => setSelected(next.id)}>
                  {nextRef ? (
                    <Thumb media={nextRef} className="field-next-thumb" />
                  ) : (
                    <span className="field-next-thumb empty">
                      <Clapperboard size={22} />
                    </span>
                  )}
                  <span className="field-next-body">
                    <strong>{next.title}</strong>
                    <small>{[next.framing, shortFocal(next.focal), next.movement].filter(Boolean).join(" · ") || "Repères à préciser"}</small>
                    {nextOp && (
                      <small className="field-op">
                        <i style={{ background: nextOp.color }} />
                        {nextOp.name}
                      </small>
                    )}
                  </span>
                  {next.priority === "MUST HAVE" && <span className="chip red">MUST</span>}
                  <ChevronRight size={20} />
                </button>
              ) : (
                <p className="field-last">{mustOnly ? "Dernier essentiel de la liste." : "Plus rien après celui-ci. 🎬"}</p>
              )}

              {upcoming.length > 1 && (
                <div className="field-queue">
                  <div className="field-label">
                    <b>PUIS</b>
                  </div>
                  {upcoming.slice(1, 5).map((s) => (
                    <button key={s.id} className="dark-row" onClick={() => setSelected(s.id)}>
                      <span className="row-main">
                        <strong>{s.title}</strong>
                        <small>{[s.framing, shortFocal(s.focal), operators.get(String(s.operatorId))?.name].filter(Boolean).join(" · ")}</small>
                      </span>
                      {s.priority === "MUST HAVE" && <span className="dot red" />}
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              )}

              <nav className="field-actions" aria-label="Valider le plan">
                <button className="fa-done" onClick={() => mark("tourné")}>
                  <Check size={28} strokeWidth={3} />
                  FAIT
                </button>
                <button onClick={() => mark("excellent")}>
                  <Star size={24} />
                  EXCELLENT
                </button>
                <button onClick={() => mark("à refaire")}>
                  <RotateCcw size={24} />
                  À REFAIRE
                </button>
                <button onClick={() => mark("sauté")}>
                  <SkipForward size={24} />
                  SAUTER
                </button>
              </nav>
              {viewer && ref && (
                <MediaViewer
                  media={ref}
                  onClose={() => setViewer(false)}
                  clip={shot.clipOut ? { in: Number(shot.clipIn ?? 0), out: Number(shot.clipOut) } : undefined}
                />
              )}
            </>
          ) : (
            <div className="card field-done">
              <Check size={40} />
              <h2>{mustOnly ? "Aucun essentiel manquant" : shots.length ? "Tous les plans sont faits" : "Aucun plan"}</h2>
              <p className="muted">
                {mustOnly
                  ? "Tous les plans MUST HAVE sont tournés."
                  : shots.length
                    ? `${completed}/${shots.length} tournés. Vérifiez les plans « à refaire » ou passez au récapitulatif.`
                    : meId
                      ? "Aucun plan attribué à ce membre."
                      : "Préparez la shot list dans Plans & scènes."}
              </p>
              <div className="btn-row" style={{ justifyContent: "center" }}>
                {mustOnly && (
                  <button className="btn" onClick={() => setMustOnly(false)}>
                    Voir tous les plans
                  </button>
                )}
                {!mustOnly && shots.some((s) => s.status === "à refaire" || skipped(s)) && (
                  <button className="btn" onClick={() => setSelected(shots.find((s) => s.status === "à refaire" || skipped(s))!.id)}>
                    Revoir les plans sautés
                  </button>
                )}
                <button className="btn gold" onClick={() => navigate("/fin")}>
                  Fin de journée
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "checklist" && (
        <div className="list field-list">
          {tasks.map((t) => (
            <div key={t.id} className={"row" + (done(t) ? " is-done" : "")} onClick={() => patchItem(t.id, { status: done(t) ? "prévu" : "terminé" })}>
              <CheckBox on={done(t)} label={t.title} onToggle={() => patchItem(t.id, { status: done(t) ? "prévu" : "terminé" })} />
              <span className="row-main">
                <strong>{t.title}</strong>
                {t.category && <small>{String(t.category)}</small>}
              </span>
            </div>
          ))}
          {!tasks.length && <div className="row">Aucune tâche « Jour J »{me ? " pour ce membre" : ""}.</div>}
        </div>
      )}

      {tab === "rappels" && (
        <div className="list field-list">
          {reminders.map((r) => (
            <div key={r.item.id} className="row" onClick={() => patchItem(r.item.id, { status: "terminé" }, "Rappel traité")}>
              <Bell size={22} color={r.due && r.due <= now ? "var(--red)" : "var(--gold-2)"} />
              <span className="row-main">
                <strong>
                  {r.due ? hhmm(new Date(r.due)) + " · " : ""}
                  {r.item.title}
                </strong>
                <small>{r.reason}</small>
              </span>
              <CheckBox on={false} label={"Fait : " + r.item.title} onToggle={() => patchItem(r.item.id, { status: "terminé" }, "Rappel traité")} />
            </div>
          ))}
          {!reminders.length && <div className="row">Aucun rappel en attente.</div>}
        </div>
      )}

      {tab === "inspi" &&
        (inspirations.length ? (
          <>
            <div className="search" style={{ marginBottom: 12 }}>
              <Search size={16} />
              <input placeholder="Chercher une inspiration…" aria-label="Rechercher une inspiration" value={inspiQuery} onChange={(e) => setInspiQuery(e.target.value)} />
            </div>
            <div className="insp-grid">
              {inspirations.map((i) => (
                <MediaCard
                  key={i.id}
                  item={i}
                  thumb={mediaFor(media, i)}
                  subtitle={String(i.category || "")}
                  icon={<Images size={26} />}
                  onView={() => setInspiViewing(i)}
                  onEdit={() => setInspiEditing(i)}
                />
              ))}
            </div>
          </>
        ) : (
          <Empty icon={<Images size={32} />} title="Aucune inspiration" text="Ajoutez vos références avant le tournage pour les retrouver ici en un geste." />
        ))}

      {tab === "poses" &&
        (pose ? (
          <section className="card field-pose">
            <PoseCard pose={pose} projectId={p.id} />
            <button className="btn gold full" style={{ marginTop: 14 }} onClick={() => update({ ...p, items: p.items.map((i) => (i.id === pose.id ? { ...i, status: "terminé" } : i)) }, "Pose suivante")}>
              POSE SUIVANTE <ChevronRight size={20} />
            </button>
          </section>
        ) : (
          <div className="card field-done">
            <Check size={36} />
            <h2>Toutes les poses sont faites</h2>
            <button className="btn" onClick={() => update({ ...p, items: p.items.map((i) => (i.module === "poses" ? { ...i, status: "prévu" } : i)) })}>
              Recommencer la série
            </button>
          </div>
        ))}

      {inspiViewing && (
        <QuickView
          item={inspiViewing}
          media={media}
          onClose={() => setInspiViewing(null)}
          onEdit={() => {
            setInspiEditing(inspiViewing);
            setInspiViewing(null);
          }}
        />
      )}
      {inspiEditing && <ItemEditor item={inspiEditing} onClose={() => setInspiEditing(null)} />}
    </div>
  );
}

function PoseCard({ pose, projectId }: { pose: Item; projectId: string }) {
  const media = useMedia(projectId, pose.id).find((m) => m.type.startsWith("image/"));
  return (
    <>
      {media && <Thumb media={media} className="field-pose-img" />}
      <small className="field-kicker" style={{ color: "var(--ink-2)" }}>
        {String(pose.category ?? "Pose")}
      </small>
      <h2>{pose.title}</h2>
      {pose.instruction && <p className="field-say">« {String(pose.instruction)} »</p>}
      <p className="muted">{[pose.framing, pose.focal, pose.hands, pose.light].filter(Boolean).join(" · ")}</p>
    </>
  );
}
