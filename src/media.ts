// Import des médias : une miniature légère est créée une fois pour que les listes restent fluides
// même avec des photos de 20 Mo ou des vidéos 4K. L'original reste intact pour l'affichage plein écran.
import type { MediaEntry } from "./types";
import { putMedia } from "./storage";

export const MAX_MEDIA_BYTES = 500 * 1024 * 1024;
const THUMB = 480;

function canvasBlob(source: CanvasImageSource, width: number, height: number): Promise<Blob | undefined> {
  const scale = Math.min(1, THUMB / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(undefined);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? undefined), "image/jpeg", 0.78));
}

/** Décodage par une balise image : marche sur les anciennes tablettes où createImageBitmap n'existe pas. */
function imageInfoFallback(file: Blob): Promise<{ width: number; height: number; thumbnail?: Blob }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const info = { width: img.naturalWidth, height: img.naturalHeight, thumbnail: undefined as Blob | undefined };
      try { info.thumbnail = await canvasBlob(img, img.naturalWidth, img.naturalHeight); } catch { /* sans miniature */ }
      URL.revokeObjectURL(url);
      resolve(info);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image non lisible par ce navigateur")); };
    img.src = url;
  });
}

async function imageInfo(file: Blob) {
  if (typeof createImageBitmap !== "function") return imageInfoFallback(file);
  try {
    const bitmap = await createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height, thumbnail: await canvasBlob(bitmap, bitmap.width, bitmap.height) };
    } finally {
      bitmap.close?.();
    }
  } catch {
    return imageInfoFallback(file);
  }
}

function videoInfo(file: Blob): Promise<{ width: number; height: number; duration: number; thumbnail?: Blob }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const cleanup = () => {
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Lecture vidéo trop longue"));
    }, 15000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.onerror = () => {
      cleanup();
      reject(new Error("Format vidéo non lisible par ce navigateur"));
    };
    video.onloadedmetadata = () => {
      // Une image un peu après le début évite les noirs de début de clip.
      video.currentTime = Math.min(1, (video.duration || 0) / 3);
    };
    video.onseeked = async () => {
      const info = { width: video.videoWidth, height: video.videoHeight, duration: video.duration };
      const thumbnail = info.width ? await canvasBlob(video, info.width, info.height) : undefined;
      cleanup();
      resolve({ ...info, thumbnail });
    };
    video.src = url;
  });
}

const HEIC = /\.(heic|heif)$/i;

/** Type MIME fiable même quand le système ne le fournit pas (HEIC, MOV sur certains navigateurs). */
export function mediaType(file: File) {
  if (file.type) return file.type;
  if (HEIC.test(file.name)) return "image/heic";
  if (/\.mov$/i.test(file.name)) return "video/quicktime";
  if (/\.mp4$/i.test(file.name)) return "video/mp4";
  if (/\.gif$/i.test(file.name)) return "image/gif";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.webm$/i.test(file.name)) return "video/webm";
  return "application/octet-stream";
}

export async function importMedia(file: File, projectId: string, itemId: string): Promise<MediaEntry> {
  if (file.size > MAX_MEDIA_BYTES) throw new Error(`« ${file.name} » dépasse 500 Mo. Importez une version allégée pour la référence.`);
  const type = mediaType(file);
  const entry: MediaEntry = { id: crypto.randomUUID(), projectId, itemId, name: file.name, type, size: file.size, blob: file };
  try {
    if (type.startsWith("image/")) Object.assign(entry, await imageInfo(file));
    else if (type.startsWith("video/")) Object.assign(entry, await videoInfo(file));
  } catch {
    // Le fichier est conservé (sauvegarde, export) même si ce navigateur ne sait pas l'afficher.
    entry.unsupported = true;
  }
  await putMedia(entry);
  return entry;
}

export function unsupportedHint(m: MediaEntry) {
  if (/heic|heif/i.test(m.type) || HEIC.test(m.name))
    return "Photo HEIC d’iPhone : non affichable ici. Exportez-la en JPEG (Photos › Exporter) ou importez-la depuis Safari sur iPhone.";
  if (m.type.startsWith("video/")) return "Vidéo non lisible dans ce navigateur (codec). Fichier conservé pour la sauvegarde.";
  return "Aperçu indisponible. Fichier conservé.";
}

export const formatBytes = (n: number) =>
  n === 0 ? "0 Ko" : n >= 1e9 ? (n / 1e9).toFixed(1).replace(".", ",") + " Go" : n >= 1e6 ? Math.round(n / 1e6) + " Mo" : Math.max(1, Math.round(n / 1e3)) + " Ko";
