import SceneDisplay, { cleanScene } from "./SceneDisplay";
import { useRef, useState } from "react";
import { Camera, Map as MapIcon, Maximize, Pause, Pencil, Play, Plus, RotateCcw } from "lucide-react";
import type { SceneElement } from "./types";
import { sceneLength } from "./motion";
import { useScenePlans } from "./store";
import { usePlayback } from "./usePlayback";
import SceneCanvas, { type CanvasHandle } from "./SceneCanvas";
import CameraCard from "./CameraCard";
import { TemplatePicker, planSummary } from "./ScenesList";
import { timecode } from "./Timeline";
import { useProject } from "../store";
import { Empty, navigate, useMedia } from "../ui";
import { itemsOf, operatorsOf } from "../screens/common";
import "./scene.css";

/**
 * Le plan de scène d'une étape, en lecture : on appuie sur PLAY pour voir la scène s'animer,
 * on touche une caméra pour voir le cadrage attendu. L'éditeur complet s'ouvre d'un bouton.
 */
export default function StageScene({ stageId }: { stageId: string }) {
  const { project: p } = useProject();
  const { plans } = useScenePlans();
  const [display, setDisplay] = useState(cleanScene);
  const media = useMedia(p.id);
  const mine = plans.filter((s) => s.stageId === stageId);
  const [index, setIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [card, setCard] = useState<SceneElement | null>(null);
  const canvas = useRef<CanvasHandle>(null);
  const plan = mine[Math.min(index, mine.length - 1)];
  const duration = plan ? Math.max(plan.duration, sceneLength(plan.elements)) : 1;
  const play = usePlayback(duration);
  const operators = operatorsOf(p);
  const shots = itemsOf(p, "shots").filter((s) => s.stageId === stageId);

  if (!plan)
    return (
      <>
        <Empty
          icon={<MapIcon size={32} />}
          title="Pas encore de plan de scène"
          text="Le lieu vu du dessus : où sont les mariés, l’officiant, les invités, où se placent CAM A, B, C, D, ce que chacune cadre et comment elle bouge."
          action={
            <button className="btn gold" onClick={() => setCreating(true)}>
              <Plus size={17} /> Créer le plan de scène
            </button>
          }
        />
        {creating && <TemplatePicker stageId={stageId} onClose={() => setCreating(false)} />}
      </>
    );

  const s = planSummary(plan);
  const cams = plan.elements.filter((e) => e.kind === "camera" || e.kind === "drone");
  const cue = [...plan.cues].sort((a, b) => a.t - b.t).filter((c) => c.t <= play.time + 0.05).at(-1);
  return (
    <div className="sd-preview">
      <div className="sd-preview-head">
        {mine.length > 1 ? (
          <select aria-label="Plan affiché" value={plan.id} onChange={(e) => setIndex(mine.findIndex((x) => x.id === e.target.value))}>
            {mine.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        ) : (
          <strong>{plan.name}</strong>
        )}
        <small>
          {s.cameras} caméra{s.cameras > 1 ? "s" : ""} · {s.people} personne{s.people > 1 ? "s" : ""} · {s.lights} lumière{s.lights > 1 ? "s" : ""}
        </small>
        <div className="btn-row">
          <button className="btn small" onClick={() => setCreating(true)}>
            <Plus size={15} /> Autre plan
          </button>
          <button className="btn small gold" onClick={() => navigate("/scene/" + plan.id)}>
            <Pencil size={15} /> Ouvrir l’éditeur
          </button>
        </div>
      </div>
      <SceneDisplay value={display} onChange={setDisplay}/>
      <div className="sd-preview-canvas">
        <SceneCanvas
          display={display}
          ref={canvas}
          plan={plan}
          time={play.time}
          selection={[]}
          editable={false}
          tool="select"
          snapOn={false}
          media={media}
          operatorColor={(oid) => (oid ? operators.get(oid)?.color : undefined)}
          onSelect={(ids) => {
            const el = plan.elements.find((e) => e.id === ids[0]);
            if (el?.kind === "camera" || el?.kind === "drone") setCard(el);
          }}
          onDraft={() => {}}
          onCommit={() => {}}
          onOpen={(el) => (el.kind === "camera" || el.kind === "drone") && setCard(el)}
        />
        <button className="sd-preview-fit" aria-label="Tout voir" onClick={() => canvas.current?.fit()}>
          <Maximize size={16} />
        </button>
        {cue && <p className="sd-preview-cue">{cue.text}</p>}
      </div>
      <div className="sd-preview-controls">
        <button className="sd-play" aria-label={play.playing ? "Pause" : "Lecture"} onClick={play.toggle}>
          {play.playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <button className="icon-btn" aria-label="Revenir au début" onClick={() => (play.setPlaying(false), play.setTime(0))}>
          <RotateCcw size={18} />
        </button>
        <input
          type="range"
          aria-label="Position dans la scène"
          min={0}
          max={duration}
          step={0.05}
          value={play.time}
          onChange={(e) => {
            play.setPlaying(false);
            play.setTime(Number(e.target.value));
          }}
        />
        <span className="sd-time">{timecode(play.time)}</span>
      </div>
      {cams.length > 0 && (
        <div className="sd-cam-chips">
          {cams.map((c) => {
            const op = operators.get(String(c.operatorId));
            return (
              <button key={c.id} type="button" className="sd-cam-chip" onClick={() => setCard(c)}>
                <Camera size={16} />
                <strong>{c.kind === "drone" ? c.name : c.tag}</strong>
                <span>
                  {c.focal ?? 35} mm{op ? ` · ${op.name}` : ""}
                </span>
                {op && <i style={{ background: op.color }} />}
              </button>
            );
          })}
        </div>
      )}
      {creating && <TemplatePicker stageId={stageId} onClose={() => setCreating(false)} />}
      {card && <CameraCard el={card} plan={plan} media={media} operator={operators.get(String(card.operatorId))} shots={shots} onClose={() => setCard(null)} />}
    </div>
  );
}
