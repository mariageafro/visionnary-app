import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Check, Clapperboard, Plus, RotateCcw } from "lucide-react";
import type { Item, MediaEntry } from "../../types";
import type { Side } from "../../model";
import { friseMoments, isMomentNow, momentState, stageFrise, toClock, type Frise as FriseData, type Moment, type Track } from "../../moments";
import { useProject } from "../../store";
import { mediaFor, MediaCard, type Operator } from "../common";

const sideNames: Record<Side, string> = { mariée: "Côté mariée", marié: "Côté marié" };
const stateNames = { "à faire": "À faire", "en cours": "En cours", fait: "Fait" } as const;
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Plans de la frise dans l'ordre où on les lit (et où on les tourne) : sert à la fiche plein écran. */
export const friseOrder = (frise: FriseData, visible: (i: Item) => boolean) => friseMoments(frise).flatMap((m) => m.shots.filter(visible));

/**
 * Frise d'une étape : côté mariée et côté marié en parallèle, chaque moment avec son horaire
 * (modifiable), son état, ses essentiels manquants et ses plans en bande horizontale.
 */
export default function Frise({
  stage,
  shots,
  visible,
  filtering,
  media,
  operators,
  transitions,
  onOpen,
  onEdit,
  onAdd,
}: {
  stage: Item;
  shots: Item[];
  visible: (i: Item) => boolean;
  filtering: boolean;
  media: MediaEntry[];
  operators: Map<string, Operator>;
  /** Transition prévue au départ de chaque plan (identifiant du plan → type). */
  transitions: Map<string, string>;
  onOpen: (shot: Item, order: Item[]) => void;
  onEdit: (shot: Item) => void;
  onAdd: (section: string) => void;
}) {
  const { project: p, update } = useProject();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  // Les horaires se calculent sur tous les plans de l'étape : filtrer un cadreur ne décale rien.
  const frise = stageFrise(p, stage, shots);
  const order = friseOrder(frise, visible);
  const setTime = (key: string, time: string) => {
    if (!time && !p.moments?.[key]) return;
    const moments = { ...p.moments };
    if (time) moments[key] = time;
    else delete moments[key];
    update({ ...p, moments }, time ? "Horaire du moment modifié" : "Horaire estimé rétabli");
  };
  const track = (t: Track | undefined, heading: string) => {
    if (!t) return null;
    const rows = t.moments.map((m) => ({ m, list: m.shots.filter(visible) })).filter((r) => !filtering || r.list.length);
    if (!rows.length) return null;
    return (
      <section key={heading} className={"track" + (t.side ? " side-" + (t.side === "mariée" ? "bride" : "groom") : "") + (t.overflow ? " is-over" : "")}>
        <header className="track-head">
          <i className="track-mark" />
          <strong>{heading}</strong>
          <small>
            {t.start !== null && t.end !== null ? `${toClock(t.start)} → ${toClock(t.end)}` : `≈ ${t.minutes} min`} · {plural(rows.reduce((n, r) => n + r.list.length, 0), "plan")}
          </small>
        </header>
        {t.overflow > 0 && (
          <p className="track-alert" role="alert">
            <AlertTriangle size={15} />
            <span>
              Fin estimée {toClock(t.end!)} : dépasse l’étape de {t.overflow} min. Avancez un moment ou allégez-le.
            </span>
          </p>
        )}
        <div className="moments">
          {rows.map(({ m, list }) => (
            <MomentRow
              key={m.key}
              moment={m}
              current={isMomentNow(m, p.date, now)}
              shots={list}
              filtered={list.length !== m.shots.length}
              media={media}
              operators={operators}
              transitions={transitions}
              onTime={(time) => setTime(m.key, time)}
              onAdd={() => onAdd(m.section)}
              onView={(shot) => onOpen(shot, order)}
              onEdit={onEdit}
            />
          ))}
        </div>
      </section>
    );
  };
  const common = frise.sides.length ? "Ensemble" : "Moments de l’étape";
  return (
    <div className="frise">
      {track(frise.before, common)}
      {frise.sides.length > 0 && <div className="frise-sides">{frise.sides.map((t) => track(t, sideNames[t.side!]))}</div>}
      {track(frise.after, "Ensemble")}
    </div>
  );
}

/** Un moment de la frise : horaire (modifiable), nom, état, essentiels manquants, puis ses plans en bande. */
function MomentRow({
  moment,
  current,
  shots,
  filtered,
  media,
  operators,
  transitions,
  onTime,
  onAdd,
  onView,
  onEdit,
}: {
  moment: Moment;
  current: boolean;
  shots: Item[];
  filtered: boolean;
  media: MediaEntry[];
  operators: Map<string, Operator>;
  transitions: Map<string, string>;
  onTime: (time: string) => void;
  onAdd: () => void;
  onView: (shot: Item) => void;
  onEdit: (shot: Item) => void;
}) {
  const state = momentState(shots);
  const count = filtered ? `${shots.length} sur ${moment.shots.length} plans` : plural(shots.length, "plan");
  let badge: ReactNode = `${stateNames[state.label]} · ${state.done}/${state.total}`;
  if (state.label === "fait")
    badge = (
      <>
        <Check size={13} strokeWidth={3} /> Fait{state.done !== state.total ? ` · ${state.done}/${state.total}` : ""}
      </>
    );
  return (
    <section className={"moment state-" + state.label.replace(" ", "-") + (moment.manual ? " is-manual" : "") + (current ? " is-now" : "")} aria-current={current ? "time" : undefined}>
      {current && <p className="moment-now"><span aria-hidden="true" /> Maintenant <small>Selon le planning</small></p>}
      <header className="moment-head">
        <MomentTime value={moment.start === null ? "" : toClock(moment.start)} label={"Horaire du moment " + moment.label} onCommit={onTime} />
        <div className="moment-title">
          <strong>{moment.label}</strong>
          <small>
            {count} · ≈ {moment.minutes} min
          </small>
        </div>
        <span className={"moment-state " + state.label.replace(" ", "-")}>{badge}</span>
      </header>
      {moment.manual && (
        <button className="moment-reset" onClick={() => onTime("")}>
          <RotateCcw size={12} /> Horaire fixé à la main
          {moment.estimated !== null ? ` · estimé ${toClock(moment.estimated)}` : ""} — rétablir
        </button>
      )}
      {state.missing.length > 0 && (
        <p className="moment-missing">
          <AlertTriangle size={14} />
          <span>
            <b>
              {state.missing.length} essentiel{state.missing.length > 1 ? "s" : ""} manquant{state.missing.length > 1 ? "s" : ""}
            </b>{" "}
            · {state.missing.map((s) => s.title).join(" · ")}
          </span>
        </p>
      )}
      <div className="moment-strip">
        {shots.map((shot) => (
          <MediaCard
            key={shot.id}
            item={shot}
            thumb={mediaFor(media, shot)}
            icon={<Clapperboard size={26} />}
            operator={operators.get(String(shot.operatorId))}
            transition={transitions.get(shot.id)}
            onView={() => onView(shot)}
            onEdit={() => onEdit(shot)}
          />
        ))}
        <button className="moment-add" onClick={onAdd} aria-label={"Ajouter un plan à « " + moment.label + " »"}>
          <Plus size={22} />
          Plan
        </button>
      </div>
    </section>
  );
}

/**
 * Horaire d'un moment : sélecteur natif (roue sur iPhone), enregistré à la sortie du champ
 * pour ne pas créer une modification par chiffre tapé. Vider le champ rétablit l'estimation.
 */
function MomentTime({ value, label, onCommit }: { value: string; label: string; onCommit: (time: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <input
      type="time"
      className="moment-time"
      aria-label={label}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}
