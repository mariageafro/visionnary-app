import { useEffect, useRef, useState } from "react";
import type { Item, ModuleProps } from "./types";
import { csvCell, downloadBlob, exportEDL } from "./exports";
import "./preedit.css";
const seconds = (item: Item) => Math.min(3600, Math.max(1, Number(item.duration) || 5));
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
export default function PreEdit({ project, updateProject }: ModuleProps) {
  const [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [selected, setSelected] = useState("");
  const dragged = useRef<string | null>(null);
  const shots = project.items.filter((i) => i.module === "shots");
  const included = shots
    .filter((i) => i.included === true)
    .sort((a, b) => Number(a.timelineOrder ?? a.order) - Number(b.timelineOrder ?? b.order));
  const total = included.reduce((sum, i) => sum + seconds(i), 0);
  let cursor = 0;
  const segments = included.map((item) => {
    const start = cursor;
    cursor += seconds(item);
    return { item, start, end: cursor };
  });
  const current =
    segments.find((s) => position >= s.start && position < s.end) ??
    (position === total ? segments.at(-1) : undefined);
  const active = shots.find((i) => i.id === selected);
  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setSelected("");
  }, [project.id]);
  useEffect(() => {
    setPosition((p) => Math.min(p, total));
    if (!total) setPlaying(false);
  }, [total]);
  useEffect(() => {
    if (!playing) return;
    let id = 0,
      previous = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - previous) / 1000;
      previous = now;
      setPosition((p) => {
        if (p + elapsed >= total) {
          setPlaying(false);
          return total;
        }
        return p + elapsed;
      });
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, total]);
  const patch = (id: string, values: Partial<Item>) =>
    updateProject({ ...project, items: project.items.map((i) => (i.id === id ? { ...i, ...values } : i)) });
  const toggle = (item: Item) =>
    patch(item.id, {
      included: item.included !== true,
      timelineOrder: included.length
        ? Math.max(...included.map((i) => Number(i.timelineOrder ?? i.order))) + 1
        : 0,
    });
  const reorder = (id: string, target: number) => {
    const ordered = [...included];
    const from = ordered.findIndex((i) => i.id === id);
    if (from < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(Math.max(0, Math.min(target, ordered.length)), 0, moved);
    const order = new Map(ordered.map((i, index) => [i.id, index]));
    updateProject({
      ...project,
      items: project.items.map((i) => (order.has(i.id) ? { ...i, timelineOrder: order.get(i.id) } : i)),
    });
  };
  const sequenceProject = {
    ...project,
    items: included.map((item, index) => ({ ...item, order: index, duration: seconds(item) })),
  };
  const csv = () => {
    const rows = [
      ["Ordre", "Plan", "Début (s)", "Durée (s)", "Narration", "Musique", "Notes"],
      ...segments.map((s, index) => [
        index + 1,
        s.item.title,
        s.start,
        seconds(s.item),
        s.item.narration,
        s.item.music,
        s.item.notes,
      ]),
    ];
    downloadBlob(
      new Blob(["\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
      "visionnary-sequence.csv",
    );
  };
  return (
    <section className="preedit">
      <div className="preedit-heading">
        <div>
          <span className="preedit-eyebrow">LA SALLE DE MONTAGE · PRÉPARATION</span>
          <h2>Votre histoire prend forme.</h2>
          <p>Assemblez vos intentions, trouvez le rythme, préparez le montage.</p>
        </div>
        <div className="preedit-exports">
          <button disabled={!included.length} onClick={() => exportEDL(sequenceProject)}>
            ↓ EDL · 25 fps
          </button>
          <button disabled={!included.length} onClick={csv}>
            ↓ Séquence CSV
          </button>
        </div>
      </div>
      <div className="preedit-workspace">
        <aside className="preedit-library">
          <div className="preedit-label">
            BIBLIOTHÈQUE DE PLANS <span>{shots.length}</span>
          </div>
          {shots.length ? (
            <>
              <p>Cochez les plans à inclure dans la séquence.</p>
              {shots.map((item) => (
                <label className="preedit-source" key={item.id}>
                  <input type="checkbox" checked={item.included === true} onChange={() => toggle(item)} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.status} · {seconds(item)} s
                    </small>
                  </span>
                  <button
                    aria-label={`Modifier ${item.title}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelected(item.id);
                    }}
                  >
                    ↗
                  </button>
                </label>
              ))}
            </>
          ) : (
            <div className="preedit-empty">
              <strong>Une histoire commence par un plan.</strong>
              <p>Ajoutez des plans dans « Plans de tournage », puis sélectionnez-les ici.</p>
            </div>
          )}
        </aside>
        <div className="preedit-main">
          <div className="preedit-monitor">
            <span className="preedit-monitor-badge">LECTURE DES INTENTIONS</span>
            {current ? (
              <div className="preedit-current">
                <span>
                  PLAN {String(included.findIndex((i) => i.id === current.item.id) + 1).padStart(2, "0")} /{" "}
                  {included.length}
                </span>
                <h3>{current.item.title}</h3>
                <p>{current.item.notes || "Aucune note de réalisation pour ce plan."}</p>
                {current.item.narration && <blockquote>« {String(current.item.narration)} »</blockquote>}
                {current.item.music && <small>♫ {String(current.item.music)}</small>}
              </div>
            ) : (
              <div className="preedit-current">
                <span>VOTRE SÉQUENCE</span>
                <h3>Donnez du rythme à vos idées.</h3>
                <p>Sélectionnez des plans à gauche pour préparer votre premier enchaînement.</p>
              </div>
            )}
            <div className="preedit-monitor-footer">
              <span>
                {clock(position)} / {clock(total)}
              </span>
              <span>Simulation textuelle · Aucun rush monté</span>
            </div>
          </div>
          <div className="preedit-transport">
            <button
              disabled={!included.length}
              className="preedit-primary"
              onClick={() => {
                if (position >= total) setPosition(0);
                setPlaying(!playing);
              }}
            >
              {playing ? "Ⅱ Pause" : "▶ Lire la séquence"}
            </button>
            <button
              aria-label="Revenir au début"
              onClick={() => {
                setPlaying(false);
                setPosition(0);
              }}
            >
              ↺
            </button>
            <input
              aria-label="Position dans la séquence"
              type="range"
              min="0"
              max={total || 1}
              step=".1"
              value={position}
              disabled={!total}
              onChange={(e) => {
                setPlaying(false);
                setPosition(Number(e.target.value));
              }}
            />
            <span>
              {included.length} plans · {clock(total)}
            </span>
          </div>
          <div className="preedit-timeline">
            <div className="preedit-label">
              TIMELINE PRÉPARATOIRE <span>Glissez les plans pour changer l’ordre</span>
            </div>
            {segments.length ? (
              <div className="preedit-tracks">
                {segments.map(({ item, start }, index) => (
                  <div
                    draggable
                    key={item.id}
                    onDragStart={() => (dragged.current = item.id)}
                    onDragEnd={() => (dragged.current = null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragged.current) reorder(dragged.current, index);
                      dragged.current = null;
                    }}
                    className={`preedit-clip ${current?.item.id === item.id ? "is-current" : ""} ${selected === item.id ? "is-selected" : ""}`}
                  >
                    <button
                      className="preedit-clip-title"
                      onClick={() => {
                        setSelected(item.id);
                        setPlaying(false);
                        setPosition(start);
                      }}
                    >
                      <small>
                        {clock(start)} · {seconds(item)} s
                      </small>
                      <strong>
                        <span>{String(index + 1).padStart(2, "0")}</span> {item.title}
                      </strong>
                    </button>
                    <div className="preedit-clip-actions">
                      <button
                        aria-label={`Déplacer ${item.title} vers le début`}
                        disabled={index === 0}
                        onClick={() => reorder(item.id, index - 1)}
                      >
                        ←
                      </button>
                      <button
                        aria-label={`Déplacer ${item.title} vers la fin`}
                        disabled={index === included.length - 1}
                        onClick={() => reorder(item.id, index + 1)}
                      >
                        →
                      </button>
                      <button
                        aria-label={`Retirer ${item.title} de la séquence`}
                        onClick={() => patch(item.id, { included: false })}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="preedit-empty">
                Votre timeline est vide. Sélectionnez un ou plusieurs plans.
              </div>
            )}
          </div>
          <p className="preedit-hint">
            L’EDL contient des clips de repérage à remplacer par vos rushs dans le logiciel de montage.
            Narration et musique sont des consignes ; aucun audio n’est généré.
          </p>
        </div>
      </div>
      {active && (
        <section className="preedit-details">
          <div className="preedit-label">
            NOTES DU PLAN · {active.title}
            <button onClick={() => setSelected("")} aria-label="Fermer les notes du plan">
              ×
            </button>
          </div>
          <div className="preedit-form">
            <label>
              Durée prévue (secondes)
              <input
                type="number"
                min="1"
                max="3600"
                step="1"
                value={seconds(active)}
                onChange={(e) =>
                  patch(active.id, { duration: Math.min(3600, Math.max(1, Number(e.target.value) || 1)) })
                }
              />
            </label>
            <label>
              Direction musicale
              <input
                value={String(active.music ?? "")}
                placeholder="Piano doux, crescendo, silence…"
                onChange={(e) => patch(active.id, { music: e.target.value })}
              />
            </label>
            <label>
              Narration / voix off
              <textarea
                rows={3}
                value={String(active.narration ?? "")}
                placeholder="Texte ou intention de voix off"
                onChange={(e) => patch(active.id, { narration: e.target.value })}
              />
            </label>
            <label>
              Notes de réalisation
              <textarea
                rows={3}
                value={active.notes}
                onChange={(e) => patch(active.id, { notes: e.target.value })}
              />
            </label>
          </div>
        </section>
      )}
    </section>
  );
}
