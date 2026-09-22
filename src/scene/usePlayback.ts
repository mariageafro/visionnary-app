import { useEffect, useRef, useState } from "react";

/** Horloge de lecture d'une scène : lecture, pause, boucle et vitesse, à 60 images par seconde. */
export function usePlayback(duration: number) {
  const [time, setTimeState] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timeRef = useRef(0);
  const setTime = (t: number) => {
    timeRef.current = t;
    setTimeState(t);
  };
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      let next = timeRef.current + ((now - last) / 1000) * speed;
      last = now;
      if (next >= duration) {
        if (loop) next %= duration;
        else {
          next = duration;
          setPlaying(false);
        }
      }
      timeRef.current = next;
      setTimeState(next);
      if (next < duration || loop) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, loop, duration]);
  const toggle = () => {
    if (!playing && timeRef.current >= duration - 0.01) setTime(0);
    setPlaying(!playing);
  };
  return { time, setTime, playing, setPlaying, toggle, loop, setLoop, speed, setSpeed, timeRef };
}
