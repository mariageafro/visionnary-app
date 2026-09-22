import { useEffect, useState, type ReactNode } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  Clapperboard,
  Copy,
  Eye,
  EyeOff,
  Group,
  IdCard,
  Lock,
  LockOpen,
  Pencil,
  Pin,
  Route,
  Trash2,
  Ungroup,
  X,
} from "lucide-react";
import type { Item, MediaEntry } from "../types";
import type { SceneElement, ScenePlan } from "./types";
import { focalPresets, lightById, lightTypes, movementById, movementsFor, roles, sensors, supports } from "./catalog";
import { cameraFov, dist, estimateFraming, frameWidth, round } from "./geometry";
import { poseAt } from "./motion";
import type { Align } from "./ops";
import { Thumb, useMediaQuery } from "../ui";
import type { Operator } from "../screens/common";

/** Champ numérique validé à la sortie (pas une modification par chiffre tapé). */
function NumField({ label, value, unit, step = 0.1, min, onCommit }: { label: string; value: number; unit?: string; step?: number; min?: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = Number(draft.replace(",", "."));
    if (Number.isFinite(v) && v !== value) onCommit(min !== undefined ? Math.max(min, v) : v);
    setDraft(null);
  };
  return (
    <label className="sd-field">
      <span>{label}</span>
      <span className="sd-num">
        <input type="number" inputMode="decimal" step={step} value={draft ?? String(round(value, 2))} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} />
        {unit && <em>{unit}</em>}
      </span>
    </label>
  );
}
/** Curseur : aperçu en direct pendant le geste, une seule validation au relâchement. */
function Range({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onPreview,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onPreview: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const [live, setLive] = useState<number | null>(null);
  const end = () => {
    if (live !== null) onCommit(live);
    setLive(null);
  };
  return (
    <label className="sd-field sd-range">
      <span>
        {label} <b>{format(live ?? value)}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={live ?? value}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLive(v);
          onPreview(v);
        }}
        onPointerUp={end}
        onKeyUp={end}
        onBlur={end}
      />
    </label>
  );
}
function TextField({ label, value, long, onCommit, placeholder }: { label: string; value: string; long?: boolean; placeholder?: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => setDraft(null), [value]);
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <label className="sd-field">
      <span>{label}</span>
      {long ? (
        <textarea rows={3} value={draft ?? value} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
      ) : (
        <input value={draft ?? value} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} />
      )}
    </label>
  );
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sd-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

export interface InspectorProps {
  plan: ScenePlan;
  selection: SceneElement[];
  team: Item[];
  operators: Map<string, Operator>;
  shots: Item[];
  media: MediaEntry[];
  drawing: boolean;
  onPatch: (ids: string[], change: Partial<SceneElement> | ((el: SceneElement) => SceneElement), message?: string) => void;
  onPreview: (ids: string[], change: Partial<SceneElement> | ((el: SceneElement) => SceneElement)) => void;
  onMovement: (el: SceneElement, type: string) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onAlign: (mode: Align) => void;
  onOrder: (where: "front" | "back") => void;
  onDrawPath: () => void;
  onPinReference: (el: SceneElement) => void;
  /** Enregistre le mouvement d'une caméra comme un plan à tourner, lié à l'étape du déroulé. */
  onCreateShot?: (el: SceneElement) => void;
  /** Ouvre la fiche plein écran d'une caméra (ce qu'on montre au cadreur). */
  onOpenCard?: (el: SceneElement) => void;
}

/**
 * Inspecteur : l'essentiel d'abord (orientation, taille, qui, quoi), le détail ensuite. Pour une
 * caméra, la valeur de plan estimée d'après la focale et la distance au sujet visé.
 */
export default function Inspector(props: InspectorProps) {
  const { plan, selection, team, operators, shots, media } = props;
  const touch = useMediaQuery("(pointer: coarse)");
  if (!selection.length)
    return (
      <div className="sd-inspector-empty">
        <Pencil size={22} />
        <p>Touchez un élément du plan pour le régler. Ajoutez des personnes, caméras et lumières depuis la bibliothèque.</p>
        <p className="muted">
          {touch
            ? "Astuces : pincez pour zoomer · glissez le vide pour vous déplacer · outil « Sélection multiple » pour en prendre plusieurs · double-tap sur une caméra pour sa fiche."
            : "Astuces : Maj + glisser pour sélectionner plusieurs éléments · double-clic sur le vide pour recadrer, sur une caméra pour sa fiche · ⌘Z pour annuler."}
        </p>
      </div>
    );
  if (selection.length > 1) {
    const grouped = selection.every((el) => el.groupId && el.groupId === selection[0].groupId);
    return (
      <div className="sd-inspector">
        <Section title={`${selection.length} éléments sélectionnés`}>
          <div className="sd-tools">
            {(
              [
                ["left", AlignStartVertical, "Aligner à gauche"],
                ["center", AlignCenterVertical, "Centrer horizontalement"],
                ["right", AlignEndVertical, "Aligner à droite"],
                ["top", AlignStartHorizontal, "Aligner en haut"],
                ["middle", AlignCenterHorizontal, "Centrer verticalement"],
                ["bottom", AlignEndHorizontal, "Aligner en bas"],
              ] as [Align, typeof Copy, string][]
            ).map(([mode, Icon, label]) => (
              <button key={mode} className="icon-btn" aria-label={label} title={label} onClick={() => props.onAlign(mode)}>
                <Icon size={17} />
              </button>
            ))}
          </div>
          <div className="sd-tools">
            <button className="btn small" onClick={grouped ? props.onUngroup : props.onGroup}>
              {grouped ? <Ungroup size={15} /> : <Group size={15} />} {grouped ? "Dégrouper" : "Grouper"}
            </button>
            <button className="btn small" onClick={props.onDuplicate}>
              <Copy size={15} /> Dupliquer
            </button>
            <button className="btn small" onClick={() => props.onPatch(selection.map((s) => s.id), { locked: !selection.every((s) => s.locked) }, "Verrouillage modifié")}>
              <Lock size={15} /> {selection.every((s) => s.locked) ? "Déverrouiller" : "Verrouiller"}
            </button>
            <button className="btn small danger" onClick={props.onRemove}>
              <Trash2 size={15} /> Supprimer
            </button>
          </div>
        </Section>
      </div>
    );
  }
  const el = selection[0];
  const ids = [el.id];
  const patch = (change: Partial<SceneElement>, message?: string) => props.onPatch(ids, change, message);
  const preview = (change: Partial<SceneElement>) => props.onPreview(ids, change);
  const find = (id: string) => plan.elements.find((e) => e.id === id);
  const targets = plan.elements.filter((e) => e.id !== el.id && ["person", "crowd", "object", "zone", "camera", "drone"].includes(e.kind));
  const sized = ["zone", "wall", "object", "rows", "crowd"].includes(el.kind);
  const mover = ["camera", "person", "drone"].includes(el.kind);
  const def = movementById(el.motion?.type);
  const target = el.targetId ? find(el.targetId) : undefined;
  const reach = target ? dist(el, poseAt(target, el.motion?.start ?? 0, find)) : 0;
  const framing = target ? estimateFraming(frameWidth(reach, cameraFov(el))) : null;
  const reference = el.referenceId ? media.find((m) => m.id === el.referenceId) : undefined;
  const pills = (value: string | undefined, onPick: (id: string) => void) => (
    <div className="op-pills sd-pills">
      {team.map((m) => (
        <button key={m.id} type="button" className={"op-pill" + (value === m.id ? " on" : "")} aria-pressed={value === m.id} onClick={() => onPick(value === m.id ? "" : m.id)}>
          <i style={{ background: operators.get(m.id)?.color }} />
          {m.title}
        </button>
      ))}
      {!team.length && <span className="muted">Ajoutez l’équipe dans « Équipe » pour affecter quelqu’un.</span>}
    </div>
  );

  return (
    <div className="sd-inspector">
      <div className="sd-head">
        <TextField label={el.kind === "camera" ? "Caméra" : "Nom"} value={el.kind === "camera" ? el.tag ?? el.name : el.name} onCommit={(v) => patch(el.kind === "camera" ? { tag: v, name: v } : { name: v }, "Renommé")} />
        <div className="sd-tools">
          <button className="icon-btn" aria-label={el.locked ? "Déverrouiller" : "Verrouiller"} title={el.locked ? "Déverrouiller" : "Verrouiller"} onClick={() => patch({ locked: !el.locked })}>
            {el.locked ? <Lock size={17} /> : <LockOpen size={17} />}
          </button>
          <button className="icon-btn" aria-label={el.hidden ? "Afficher" : "Masquer"} title={el.hidden ? "Afficher" : "Masquer"} onClick={() => patch({ hidden: !el.hidden })}>
            {el.hidden ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
          <button className="icon-btn" aria-label="Premier plan" title="Premier plan" onClick={() => props.onOrder("front")}>
            <ArrowUpToLine size={17} />
          </button>
          <button className="icon-btn" aria-label="Arrière-plan" title="Arrière-plan" onClick={() => props.onOrder("back")}>
            <ArrowDownToLine size={17} />
          </button>
          <button className="icon-btn" aria-label="Dupliquer" title="Dupliquer (⌘D)" onClick={props.onDuplicate}>
            <Copy size={17} />
          </button>
          <button className="icon-btn danger" aria-label="Supprimer" title="Supprimer (Suppr)" onClick={props.onRemove}>
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {el.kind === "camera" && props.onOpenCard && (
        <button type="button" className="btn gold sd-card-btn" onClick={() => props.onOpenCard!(el)}>
          <IdCard size={17} /> Fiche caméra plein écran
        </button>
      )}
      {el.kind === "camera" && (
        <Section title="Qui filme">
          {pills(el.operatorId, (id) => patch({ operatorId: id || undefined }, id ? "Opérateur affecté" : "Opérateur retiré"))}
        </Section>
      )}

      {el.kind === "camera" && (
        <Section title="Cadrage">
          {framing ? (
            <p className="sd-estimate">
              <b>{framing.label}</b> <em>{framing.code}</em> · cadre de {round(frameWidth(reach, cameraFov(el)), 2)} m à {round(reach, 1)} m de {target!.name}
            </p>
          ) : (
            <p className="muted sd-hint">Choisissez le sujet visé : la valeur de plan s’estime d’après la focale et la distance.</p>
          )}
          <Range label="Focale" value={el.focal ?? 35} min={10} max={200} format={(v) => `${v} mm`} onPreview={(v) => preview({ focal: v })} onCommit={(v) => patch({ focal: v }, "Focale modifiée")} />
          <div className="sd-chips">
            {focalPresets.map((f) => (
              <button key={f} type="button" className={"chip" + (el.focal === f ? " gold" : " outline")} onClick={() => patch({ focal: f }, `${f} mm`)}>
                {f}
              </button>
            ))}
          </div>
          <label className="sd-field">
            <span>Sujet visé</span>
            <select value={el.targetId ?? ""} onChange={(e) => patch({ targetId: e.target.value || undefined }, "Sujet visé modifié")}>
              <option value="">Aucun</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.kind === "camera" ? t.tag : t.name}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Mission" long value={el.mission ?? ""} placeholder="Ex. gros plan mariée pendant les vœux" onCommit={(v) => patch({ mission: v }, "Mission enregistrée")} />
        </Section>
      )}

      {el.kind === "camera" && (
        <Section title="Référence à reproduire">
          {reference ? (
            <button type="button" className="sd-ref" onClick={() => props.onPinReference(el)}>
              <Thumb media={reference} />
              <span>Changer la référence</span>
            </button>
          ) : (
            <button type="button" className="btn small" onClick={() => props.onPinReference(el)}>
              <Pin size={15} /> Épingler une photo, une frame ou une vidéo
            </button>
          )}
          {reference && (
            <button type="button" className="btn small ghost" onClick={() => patch({ referenceId: undefined }, "Référence retirée")}>
              <X size={14} /> Retirer
            </button>
          )}
          {props.onCreateShot && (
            <button type="button" className="btn small" onClick={() => props.onCreateShot!(el)}>
              <Clapperboard size={15} /> Enregistrer ce mouvement comme un plan à tourner
            </button>
          )}
          {shots.length > 0 && (
            <details className="sd-details">
              <summary>Plans de la shot list liés ({el.shotIds?.length ?? 0})</summary>
              <div className="sd-shots">
                {shots.map((s) => {
                  const on = el.shotIds?.includes(s.id) ?? false;
                  return (
                    <label key={s.id} className="sd-check">
                      <input type="checkbox" checked={on} onChange={() => patch({ shotIds: on ? (el.shotIds ?? []).filter((x) => x !== s.id) : [...(el.shotIds ?? []), s.id] }, on ? "Plan délié" : "Plan lié")} />
                      <span>{s.title}</span>
                    </label>
                  );
                })}
              </div>
            </details>
          )}
        </Section>
      )}

      {el.kind === "camera" && (
        <Section title="Matériel">
          <TextField label="Boîtier" value={el.model ?? ""} placeholder="Ex. Sony A7S III" onCommit={(v) => patch({ model: v }, "Boîtier enregistré")} />
          <label className="sd-field">
            <span>Capteur</span>
            <select value={el.sensor ?? "ff"} onChange={(e) => patch({ sensor: e.target.value }, "Capteur modifié")}>
              {sensors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="sd-field">
            <span>Support</span>
            <select value={el.support ?? "trepied"} onChange={(e) => patch({ support: e.target.value }, "Support modifié")}>
              {supports.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <NumField label="Hauteur de l’objectif" unit="m" value={el.height ?? 1.5} min={0} onCommit={(v) => patch({ height: v }, "Hauteur modifiée")} />
        </Section>
      )}

      {el.kind === "drone" && (
        <Section title="Drone">
          {pills(el.operatorId, (id) => patch({ operatorId: id || undefined }, id ? "Pilote affecté" : "Pilote retiré"))}
          <Range label="Altitude" value={el.altitude ?? 25} min={2} max={120} format={(v) => `${v} m`} onPreview={(v) => preview({ altitude: v })} onCommit={(v) => patch({ altitude: v }, "Altitude modifiée")} />
          <label className="sd-field">
            <span>Sujet suivi</span>
            <select value={el.targetId ?? ""} onChange={(e) => patch({ targetId: e.target.value || undefined }, "Sujet modifié")}>
              <option value="">Aucun</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Mission" long value={el.mission ?? ""} placeholder="Ex. sortie de l’église vue du ciel" onCommit={(v) => patch({ mission: v }, "Mission enregistrée")} />
        </Section>
      )}

      {el.kind === "light" && (
        <Section title="Lumière">
          <label className="sd-field">
            <span>Type</span>
            <select
              value={el.asset ?? "led"}
              onChange={(e) => {
                const l = lightById(e.target.value);
                patch({ asset: l.id, beam: l.beam, reach: l.reach }, "Type de lumière modifié");
              }}
            >
              {lightTypes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <Range label="Puissance" value={el.power ?? 80} min={0} max={100} format={(v) => `${v} %`} onPreview={(v) => preview({ power: v })} onCommit={(v) => patch({ power: v }, "Puissance modifiée")} />
          <Range label="Température" value={el.temperature ?? 5600} min={2700} max={6500} step={100} format={(v) => `${v} K`} onPreview={(v) => preview({ temperature: v })} onCommit={(v) => patch({ temperature: v }, "Température modifiée")} />
          <Range label="Ouverture du faisceau" value={el.beam ?? 60} min={10} max={300} format={(v) => `${v}°`} onPreview={(v) => preview({ beam: v })} onCommit={(v) => patch({ beam: v }, "Faisceau modifié")} />
          <Range label="Portée" value={el.reach ?? 4} min={0.5} max={15} step={0.5} format={(v) => `${v} m`} onPreview={(v) => preview({ reach: v })} onCommit={(v) => patch({ reach: v }, "Portée modifiée")} />
          <NumField label="Hauteur" unit="m" value={el.height ?? 2} min={0} onCommit={(v) => patch({ height: v }, "Hauteur modifiée")} />
        </Section>
      )}

      {el.kind === "person" && (
        <Section title="Rôle">
          <div className="sd-roles">
            {roles.map((r) => (
              <button key={r.id} type="button" className={"sd-role" + (el.role === r.id ? " on" : "")} aria-pressed={el.role === r.id} onClick={() => patch({ role: r.id, name: el.name === roles.find((x) => x.id === el.role)?.label ? r.label : el.name }, "Rôle modifié")}>
                <i style={{ background: r.color }} />
                {r.label}
              </button>
            ))}
          </div>
          {(el.role === "photographe" || el.role === "videaste") && (
            <>
              <span className="sd-sub">Membre de l’équipe</span>
              {pills(el.memberId, (id) => patch({ memberId: id || undefined, ...(id ? { name: team.find((m) => m.id === id)?.title ?? el.name } : {}) }, "Membre affecté"))}
            </>
          )}
        </Section>
      )}

      {el.kind === "note" && (
        <Section title="Annotation">
          <TextField label="Texte" long value={el.text ?? ""} onCommit={(v) => patch({ text: v }, "Annotation modifiée")} />
        </Section>
      )}

      <Section title="Position">
        <Range label="Orientation" value={Math.round(el.rotation)} min={-180} max={180} format={(v) => `${v}°`} onPreview={(v) => preview({ rotation: v })} onCommit={(v) => patch({ rotation: v }, "Orientation modifiée")} />
        <div className="sd-row">
          <NumField label="X" unit="m" value={el.x} onCommit={(v) => patch({ x: v })} />
          <NumField label="Y" unit="m" value={el.y} onCommit={(v) => patch({ y: v })} />
        </div>
        {sized && (
          <div className="sd-row">
            <NumField label="Largeur" unit="m" value={el.w ?? 1} min={0.1} onCommit={(v) => patch({ w: v }, "Taille modifiée")} />
            <NumField label="Profondeur" unit="m" value={el.h ?? 1} min={0.1} onCommit={(v) => patch({ h: v }, "Taille modifiée")} />
          </div>
        )}
        {(el.kind === "object" || el.kind === "zone" || el.kind === "crowd") && (
          <div className="sd-chips">
            <button type="button" className={"chip" + (el.shape !== "ellipse" ? " gold" : " outline")} onClick={() => patch({ shape: "rect" })}>
              Rectangle
            </button>
            <button type="button" className={"chip" + (el.shape === "ellipse" ? " gold" : " outline")} onClick={() => patch({ shape: "ellipse" })}>
              Ovale
            </button>
          </div>
        )}
        {el.kind === "rows" && (
          <div className="sd-row">
            <NumField label="Rangs" step={1} value={el.rows ?? 6} min={1} onCommit={(v) => patch({ rows: Math.round(v), h: Math.round(v) * 0.9 }, "Rangées modifiées")} />
            <NumField label="Chaises par rang" step={1} value={el.cols ?? 5} min={1} onCommit={(v) => patch({ cols: Math.round(v), w: Math.round(v) * 0.55 }, "Rangées modifiées")} />
          </div>
        )}
        {el.kind === "crowd" && (
          <>
            <NumField label="Nombre de personnes" step={1} value={el.count ?? 20} min={1} onCommit={(v) => patch({ count: Math.min(400, Math.round(v)) }, "Foule modifiée")} />
            <div className="sd-chips">
              {[10, 50, 100, 200].map((n) => (
                <button key={n} type="button" className={"chip" + (el.count === n ? " gold" : " outline")} onClick={() => patch({ count: n }, `${n} invités`)}>
                  {n}
                </button>
              ))}
            </div>
          </>
        )}
      </Section>

      {mover && (
        <Section title="Mouvement">
          <label className="sd-field">
            <span>Type</span>
            <select value={el.motion?.type ?? "none"} onChange={(e) => props.onMovement(el, e.target.value)}>
              <option value="none">Aucun</option>
              {movementsFor(el.kind).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          {def && <p className="muted sd-hint">{def.hint}</p>}
          {el.motion && def && (
            <>
              {def.target && (
                <label className="sd-field">
                  <span>{el.kind === "camera" || el.kind === "drone" ? "Sujet" : "Suit"}</span>
                  <select value={el.motion.targetId ?? ""} onChange={(e) => patch({ motion: { ...el.motion!, targetId: e.target.value || undefined } }, "Sujet du mouvement modifié")}>
                    <option value="">Aucun</option>
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.kind === "camera" ? t.tag : t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {def.distance !== undefined && (
                <Range label="Distance" value={el.motion.distance ?? def.distance} min={0.2} max={el.kind === "drone" ? 80 : 10} step={0.1} format={(v) => `${v} m`} onPreview={(v) => preview({ motion: { ...el.motion!, distance: v } })} onCommit={(v) => patch({ motion: { ...el.motion!, distance: v } }, "Distance modifiée")} />
              )}
              {def.sweep !== undefined && (
                <Range label="Amplitude" value={el.motion.sweep ?? def.sweep} min={-360} max={360} step={5} format={(v) => `${v}°`} onPreview={(v) => preview({ motion: { ...el.motion!, sweep: v } })} onCommit={(v) => patch({ motion: { ...el.motion!, sweep: v } }, "Amplitude modifiée")} />
              )}
              {def.rise !== undefined && (
                <Range label="Variation d’altitude" value={el.motion.rise ?? def.rise} min={-60} max={60} step={0.5} format={(v) => `${v > 0 ? "+" : ""}${v} m`} onPreview={(v) => preview({ motion: { ...el.motion!, rise: v } })} onCommit={(v) => patch({ motion: { ...el.motion!, rise: v } }, "Altitude modifiée")} />
              )}
              <div className="sd-row">
                <NumField label="Début" unit="s" value={el.motion.start} min={0} onCommit={(v) => patch({ motion: { ...el.motion!, start: v } }, "Début modifié")} />
                <NumField label="Durée" unit="s" value={el.motion.duration} min={0.2} onCommit={(v) => patch({ motion: { ...el.motion!, duration: v } }, "Durée modifiée")} />
              </div>
              <div className="sd-chips">
                <button type="button" className={"chip" + (el.motion.easing !== "linear" ? " gold" : " outline")} onClick={() => patch({ motion: { ...el.motion!, easing: "smooth" } })}>
                  Doux
                </button>
                <button type="button" className={"chip" + (el.motion.easing === "linear" ? " gold" : " outline")} onClick={() => patch({ motion: { ...el.motion!, easing: "linear" } })}>
                  Constant
                </button>
              </div>
              {def.path && (
                <div className="sd-path">
                  <button type="button" className={"btn small" + (props.drawing ? " gold" : "")} onClick={props.onDrawPath}>
                    <Route size={15} /> {props.drawing ? "Terminer la trajectoire" : "Dessiner la trajectoire"}
                  </button>
                  <span className="muted">
                    {el.motion.path?.length ?? 0} point{(el.motion.path?.length ?? 0) > 1 ? "s" : ""}
                  </span>
                  {!!el.motion.path?.length && (
                    <button type="button" className="btn small ghost" onClick={() => patch({ motion: { ...el.motion!, path: [] } }, "Trajectoire effacée")}>
                      Effacer
                    </button>
                  )}
                </div>
              )}
              {props.drawing && <p className="sd-hint gold">Touchez le plan pour ajouter les points de passage, dans l’ordre. Glissez un point pour l’ajuster.</p>}
            </>
          )}
        </Section>
      )}

      <Section title="Notes">
        <TextField label="Consignes" long value={el.notes ?? ""} placeholder="Ex. rester derrière le pilier pendant les vœux" onCommit={(v) => patch({ notes: v }, "Notes enregistrées")} />
      </Section>
    </div>
  );
}
