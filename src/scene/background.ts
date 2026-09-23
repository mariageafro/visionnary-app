import type { SceneElement } from "./types";
import { corners } from "./geometry";

/** Ajuste le cadre de la scène à une photo horizontale ou verticale sans la déformer. */
export function photoPlanSize(planWidth: number, planHeight: number, imageWidth: number, imageHeight: number) {
  if (![planWidth, planHeight, imageWidth, imageHeight].every((value) => Number.isFinite(value) && value > 0)) return undefined;
  const ratio = imageWidth / imageHeight;
  const width = ratio >= 1 ? Math.max(planWidth, 2 * ratio) : Math.max(2, planHeight * ratio);
  const height = width / ratio;
  return { width: Math.round(width * 10) / 10, height: Math.round(height * 10) / 10 };
}

export function elementsFitPhoto(elements: SceneElement[], width: number, height: number): boolean {
  return elements.every((element) => corners(element).every((point) => point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height));
}
