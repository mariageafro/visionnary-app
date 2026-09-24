import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { Item, MediaEntry } from "../types";
import { progressOf } from "../progress";

/** Barre d'avancement d'une section : pourcentage de prises faites, section « bouclée » en vert, rappel de ce qui reste. */
export default function SectionProgress({ items, media, sequence = "poses", unit = "photos" }: { items: Item[]; media: MediaEntry[]; sequence?: string; unit?: string }) {
  const [open, setOpen] = useState(false);
  const { total, taken, pct, pending, items: seq, left } = progressOf(items, media);
  if (!total) return null;
  const complete = taken >= total;
  const tone = complete ? "is-complete" : pct >= 70 ? "is-high" : pct >= 35 ? "is-mid" : "is-low";
  return (
    <div className={"section-progress " + tone}>
      <div className="sp-row">
        <div className="sp-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Avancement : ${pct} %`}>
          <i style={{ width: pct + "%" }} />
        </div>
        <strong className="sp-pct">{complete ? <><CheckCircle2 size={15} /> Bouclée</> : `${pct} %`}</strong>
        <span className="sp-count">{seq.done}/{seq.total} {sequence}{total !== seq.total ? ` · ${taken}/${total} ${unit}` : ""}</span>
        {!complete && <button type="button" className="sp-rest" aria-expanded={open} onClick={() => setOpen(!open)}>Reste {pending.length} {sequence}{total - taken !== pending.length ? ` · ${total - taken} ${unit}` : ""}</button>}
      </div>
      {open && !complete && (
        <ul className="sp-list">
          {pending.map((item) => <li key={item.id}>{item.title || "Sans titre"}{(left.get(item.id)?.total ?? 1) > 1 ? ` — ${left.get(item.id)!.taken}/${left.get(item.id)!.total} ${unit}` : ""}</li>)}
        </ul>
      )}
    </div>
  );
}
