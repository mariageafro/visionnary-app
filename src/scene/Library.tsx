import { useState } from "react";
import { Search } from "lucide-react";
import { assets, lightTypes, roles, type AssetDef } from "./catalog";

/** Ce qu'on ajoute : un objet de la bibliothèque, une personne (rôle) ou une lumière (type). */
export type LibraryPick = { asset: AssetDef } | { role: string } | { light: string };
const groups = ["Personnes", "Caméras", "Lumières", "Architecture", "Zones", "Mobilier", "Assises", "Foules", "Décor", "Drone & son", "Annotations"];

/**
 * Bibliothèque du Scene Designer : on glisse un élément sur le plan (ordinateur, tablette) ou on
 * le touche pour l'ajouter au centre de la vue (téléphone).
 */
export default function Library({ onPick }: { onPick: (pick: LibraryPick) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const match = (label: string) => !q || label.toLowerCase().includes(q);
  const drag = (key: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("application/x-visionnary-asset", key);
      e.dataTransfer.effectAllowed = "copy";
    },
  });
  return (
    <div className="sd-library">
      <div className="search sd-search">
        <Search size={15} />
        <input placeholder="Chercher un élément…" aria-label="Chercher dans la bibliothèque" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {groups.map((group) => {
        const items =
          group === "Personnes"
            ? roles.filter((r) => match(r.label)).map((r) => ({ key: "role:" + r.id, label: r.label, color: r.color, mark: r.mark, pick: { role: r.id } as LibraryPick }))
            : group === "Lumières"
              ? lightTypes.filter((l) => match(l.label)).map((l) => ({ key: "light:" + l.id, label: l.label, color: l.subtractive ? "#333" : "#f6db77", mark: "", pick: { light: l.id } as LibraryPick }))
              : assets.filter((a) => a.group === group && match(a.label)).map((a) => ({ key: "asset:" + a.id, label: a.label, color: a.color, mark: "", pick: { asset: a } as LibraryPick }));
        if (!items.length) return null;
        return (
          <section key={group}>
            <h3>{group}</h3>
            <div className="sd-lib-grid">
              {items.map((it) => (
                <button key={it.key} type="button" className="sd-lib-item" title={it.label} onClick={() => onPick(it.pick)} {...drag(it.key)}>
                  <i style={{ background: it.color }}>{it.mark}</i>
                  <span>{it.label}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
