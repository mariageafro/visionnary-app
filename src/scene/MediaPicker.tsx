import { useState } from "react";
import { Upload } from "lucide-react";
import type { MediaEntry } from "../types";
import { importMedia } from "../media";
import { useProject } from "../store";
import { Empty, Sheet, Thumb, mediaChanged } from "../ui";
import { PickFiles } from "../screens/MediaDrop";

/**
 * Choisir une image ou une vidéo du tournage (références des plans, inspirations, repérage) ou en
 * importer une nouvelle, rangée avec le plan de scène.
 */
export default function MediaPicker({
  title,
  ownerId,
  media,
  videos = true,
  onPick,
  onClose,
}: {
  title: string;
  /** Le plan de scène : propriétaire des fichiers importés ici (inclus dans les sauvegardes). */
  ownerId: string;
  media: MediaEntry[];
  videos?: boolean;
  onPick: (m: MediaEntry) => void;
  onClose: () => void;
}) {
  const { project: p } = useProject();
  const [busy, setBusy] = useState("");
  const usable = media.filter((m) => !m.unsupported && (m.type.startsWith("image/") || (videos && m.type.startsWith("video/"))));
  const own = (m: MediaEntry) => p.items.find((i) => i.id === m.itemId)?.title ?? (m.itemId === ownerId ? "Ce plan de scène" : "Tournage");
  async function upload(files: File[]) {
    let last: MediaEntry | undefined;
    for (const [n, file] of files.entries()) {
      setBusy(`Import ${n + 1}/${files.length}…`);
      last = await importMedia(file, p.id, ownerId);
    }
    setBusy("");
    mediaChanged();
    if (last && !last.unsupported) onPick(last);
  }
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <PickFiles className="btn gold" label={busy || "Importer depuis l’appareil"} onFiles={(files) => void upload(files)} />
      </div>
      {usable.length ? (
        <div className="sd-picker">
          {usable.map((m) => (
            <button key={m.id} type="button" className="sd-pick" onClick={() => onPick(m)} title={m.name}>
              <Thumb media={m} />
              <small>{own(m)}</small>
            </button>
          ))}
        </div>
      ) : (
        <Empty icon={<Upload size={28} />} title="Aucune image dans ce tournage" text="Importez une photo du lieu, une frame ou une vidéo de référence." />
      )}
    </Sheet>
  );
}
