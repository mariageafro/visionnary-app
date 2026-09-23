import type { Item } from "../types";
import { done } from "../model";

export function sdeProgress(shots: Item[], hasLocalMedia: (shot: Item) => boolean, musicReady: boolean, editReady: boolean) {
  const essential = shots.filter((shot) => shot.sde === "indispensable" && shot.status !== "archivé");
  const captured = essential.filter(done);
  const withMedia = essential.filter(hasLocalMedia);
  const missing = essential.filter((shot) => !done(shot) || !hasLocalMedia(shot));
  const canStart = essential.length > 0 && captured.length === essential.length && withMedia.length === essential.length && musicReady;
  return { essential, captured, withMedia, missing, musicReady, editReady: editReady && canStart, canStart };
}
