import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, RotateCw, Volume2, VolumeX, Rewind, Gauge } from "lucide-react";
import type { MediaEntry } from "../types";
import { mediaChanged, useObjectUrl } from "../ui";
import { putMedia } from "../storage";

/**
 * Lecteur de référence : lecture en boucle, play/pause, son, ralenti, retour au début, plein écran, et pivotement de l'image
 * (mélange de vidéos verticales et horizontales, ou vidéos filmées couchées). Le pivotement est mémorisé sur le fichier.
 */
export default function RotatableVideo({ media }: { media: MediaEntry }) {
  const url = useObjectUrl(media.blob);
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [rot, setRot] = useState(media.view?.r ?? 0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [slow, setSlow] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0, k: 1 });
  useEffect(() => setRot(media.view?.r ?? 0), [media.id, media.view?.r]);

  const fit = () => {
    const b = box.current;
    const v = video.current;
    if (!b || !v || !v.videoWidth) return;
    const turned = rot % 180 !== 0;
    const s = Math.min(b.clientWidth / (turned ? v.videoHeight : v.videoWidth), b.clientHeight / (turned ? v.videoWidth : v.videoHeight));
    setSize({ w: v.videoWidth * s, h: v.videoHeight * s, k: 1 });
  };
  useEffect(() => {
    fit();
    const on = () => fit();
    window.addEventListener("resize", on);
    document.addEventListener("fullscreenchange", on);
    return () => {
      window.removeEventListener("resize", on);
      document.removeEventListener("fullscreenchange", on);
    };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  async function turn() {
    const next = (rot + 90) % 360;
    setRot(next);
    try {
      await putMedia({ ...media, view: { z: media.view?.z ?? 1, x: media.view?.x ?? 50, y: media.view?.y ?? 50, r: next } });
      mediaChanged();
    } catch { /* la rotation reste appliquée à l'écran */ }
  }
  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play(); else v.pause();
  };
  return (
    <div className="rv">
      <div className="rv-box" ref={box} onClick={toggle}>
        <video
          ref={video}
          src={url || undefined}
          loop
          muted={muted}
          autoPlay
          playsInline
          onLoadedMetadata={fit}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          style={{ width: size.w || undefined, height: size.h || undefined, transform: `translate(-50%,-50%) rotate(${rot}deg)` }}
        />
      </div>
      <div className="rv-tools">
        <button className="btn small" onClick={toggle} aria-label={playing ? "Pause" : "Lecture"}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
        <button className="btn small" onClick={() => { if (video.current) video.current.currentTime = 0; }} aria-label="Retour au début"><Rewind size={15} /></button>
        <button className={"btn small" + (slow ? " gold" : "")} onClick={() => { const n = !slow; setSlow(n); if (video.current) video.current.playbackRate = n ? 0.5 : 1; }} aria-pressed={slow}><Gauge size={15} /> {slow ? "×0,5" : "×1"}</button>
        <button className="btn small" onClick={() => setMuted(!muted)} aria-label={muted ? "Activer le son" : "Couper le son"}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
        <button className="btn small gold" onClick={() => void turn()} aria-label="Pivoter la vidéo"><RotateCw size={15} /> Pivoter</button>
        <button className="btn small" onClick={() => { const b = box.current; if (b) void (document.fullscreenElement ? document.exitFullscreen() : b.requestFullscreen?.()); }} aria-label="Plein écran"><Maximize size={15} /></button>
      </div>
    </div>
  );
}
