import { useState } from "react";
import { Check, Clapperboard, Images, Scissors } from "lucide-react";
import type { Item } from "../types";
import { done } from "../model";
import { useProject } from "../store";
import { Empty, MediaViewer, Screen, Thumb, navigate, useMedia } from "../ui";
import { itemsOf, mediaFor } from "./common";

type Segment = { id: string; title: string; clipIn: number; clipOut: number; type: string; framing: string; movement: string; transition: string; subject: string; stageId: string; effect: string; notes: string; shotId?: string };
export const segmentsOf = (item: Item): Segment[] => {
  try {
    const parsed: unknown = JSON.parse(String(item.segments || "[]"));
    return Array.isArray(parsed) ? parsed.filter((entry): entry is Segment => !!entry && typeof entry === "object" && typeof entry.id === "string") : [];
  } catch { return []; }
};

/**
 * Teaser : le plan de tournage du teaser en un seul endroit — chaque inspiration vidéo découpée
 * en segments (dans Inspirations → « Découper en segments »), avec le plan à tourner créé pour
 * chaque segment et son état (tourné ou non). Rien de nouveau ici techniquement : ce qui manquait
 * était un endroit unique pour voir « où en est le teaser », plutôt que de rouvrir chaque inspiration.
 */
export default function Teaser() {
  const { project: p } = useProject();
  const media = useMedia(p.id);
  const [viewingId, setViewingId] = useState("");
  const inspirations = itemsOf(p, "inspirations").map((item) => ({ item, segments: segmentsOf(item) })).filter((entry) => entry.segments.length > 0);
  const shots = itemsOf(p, "shots");
  const shotFor = (segment: Segment) => shots.find((s) => s.id === segment.shotId);
  const totalSegments = inspirations.reduce((sum, entry) => sum + entry.segments.length, 0);
  const shotSegments = inspirations.flatMap((entry) => entry.segments.filter((s) => s.shotId));
  const doneSegments = shotSegments.filter((s) => { const shot = shotFor(s); return shot && done(shot); });
  const viewing = viewingId ? media.find((m) => m.id === viewingId) : undefined;

  return (
    <Screen title="Teaser" backTo="/tournage">
      <p className="muted" style={{ marginBottom: 12 }}>
        Découpez vos vidéos d’inspiration en segments (dans Inspirations), créez le plan à tourner
        pour chacun, puis reproduisez le même découpage le jour J pour un teaser au montage identique.
      </p>
      {totalSegments > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="kv">
            <div><span>Segments découpés</span><b>{totalSegments}</b></div>
            <div><span>Plans créés depuis un segment</span><b>{shotSegments.length}/{totalSegments}</b></div>
            <div><span>Tournés</span><b>{doneSegments.length}/{shotSegments.length}</b></div>
          </div>
        </div>
      )}
      {inspirations.length ? (
        inspirations.map(({ item, segments }) => {
          const ref = mediaFor(media, item);
          return (
            <section key={item.id} className="card stack" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {ref && (
                  <button type="button" className="icon-btn" aria-label={"Voir " + item.title} onClick={() => setViewingId(ref.id)}>
                    <Thumb media={ref} />
                  </button>
                )}
                <div style={{ flex: 1 }}>
                  <strong>{item.title || "Inspiration"}</strong>
                  <p className="muted" style={{ margin: "2px 0 0" }}>{segments.length} segment{segments.length > 1 ? "s" : ""}</p>
                </div>
                <button className="btn small" onClick={() => navigate("/m/inspirations")}>
                  <Scissors size={15} /> Modifier le découpage
                </button>
              </div>
              <div className="list">
                {segments.map((segment) => {
                  const shot = shotFor(segment);
                  return (
                    <div className="row" key={segment.id}>
                      <span className="row-main">
                        <strong>{segment.title || "Segment"}</strong>
                        <small>{[segment.type, segment.framing, segment.movement, segment.effect].filter(Boolean).join(" · ") || "Détails à préciser"}</small>
                      </span>
                      <span className="row-trail">
                        {shot ? (
                          <span className={"chip " + (done(shot) ? "gold" : "outline")}>{done(shot) ? <><Check size={13} /> Tourné</> : "À tourner"}</span>
                        ) : (
                          <span className="chip outline">Pas encore de plan</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      ) : (
        <Empty
          icon={<Clapperboard size={32} />}
          title="Aucun teaser découpé pour l’instant"
          text="Dans Inspirations, ajoutez une vidéo de teaser qui vous plaît puis « Découper en segments » : chaque segment devient un plan à reproduire le jour J."
          action={
            <button className="btn gold" onClick={() => navigate("/m/inspirations")}>
              <Images size={17} /> Aller à Inspirations
            </button>
          }
        />
      )}
      {viewing && <MediaViewer media={viewing} onClose={() => setViewingId("")} />}
    </Screen>
  );
}
