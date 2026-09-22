import { useState } from "react";
import { Copy, Download, Layers, Plus, Trash2, Upload } from "lucide-react";
import type { Item, Preset } from "../types";
import { cloneItems, uid } from "../model";
import { withOrder } from "../features";
import { useStore } from "../store";
import { downloadBlob } from "../exports";
import { Empty, Screen, Sheet } from "../ui";

export default function PresetsScreen() {
  const { w, project: p, change, update } = useStore();
  const [editing, setEditing] = useState<Preset | null>(null);
  const [error, setError] = useState("");
  return (
    <Screen
      title="Presets & templates"
      backTo="/plus"
      actions={
        p && (
          <button
            className="icon-btn gold"
            aria-label="Enregistrer ce tournage en template"
            onClick={() =>
              setEditing({
                id: uid(),
                name: p.name + " — template",
                description: "Votre préparation réutilisable",
                items: cloneItems(p.items).map((i) => {
                  const copy: Item = { ...i, status: "prévu" };
                  delete copy.mediaId;
                  delete copy.startedAt;
                  delete copy.endedAt;
                  return copy;
                }),
                custom: true,
              })
            }
          >
            <Layers size={19} />
          </button>
        )
      }
    >
      <div className="notice" style={{ marginBottom: 14 }}>
        <Layers size={18} />
        Vos méthodes deviennent des raccourcis. Un preset ajoute des éléments au tournage actif ; il ne remplace rien.
      </div>
      <label className="btn full" style={{ marginBottom: 14 }}>
        <Upload size={16} /> Importer un preset (.json)
        <input
          className="sr-only"
          type="file"
          accept=".json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError("");
            try {
              if (file.size > 5e6) throw new Error("Fichier trop volumineux");
              const data = JSON.parse(await file.text());
              if (typeof data.name !== "string" || !Array.isArray(data.items)) throw new Error("Format de preset invalide");
              change({ ...w, presets: [...w.presets, { id: uid(), name: data.name, description: String(data.description ?? ""), items: cloneItems(data.items), custom: true }] }, "Preset importé");
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p className="notice red" role="alert">
          {error}
        </p>
      )}
      {w.presets.length ? (
        <div className="stack">
          {w.presets.map((preset) => (
            <div className="card" key={preset.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <span className="chip" style={{ marginBottom: 6 }}>
                    {preset.kind === "étape" ? "Template d’étape" : preset.custom ? "Votre signature" : "Collection studio"} · {preset.items.length} éléments
                  </span>
                  <h3 style={{ marginTop: 4 }}>{preset.name}</h3>
                  <p className="muted">{preset.description}</p>
                </div>
              </div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button
                  className="btn gold small"
                  disabled={!p}
                  onClick={() => {
                    if (!p) return;
                    update({ ...p, items: [...p.items, ...withOrder(cloneItems(preset.items), p.items)] }, preset.kind === "étape" ? `Étape « ${preset.name} » ajoutée au déroulé` : "Preset ajouté au tournage");
                  }}
                >
                  <Plus size={15} /> Appliquer
                </button>
                <button
                  className="icon-btn"
                  aria-label={"Exporter " + preset.name}
                  onClick={() => downloadBlob(new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" }), "preset-visionnary.json")}
                >
                  <Download size={16} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={"Dupliquer " + preset.name}
                  onClick={() => change({ ...w, presets: [...w.presets, { ...preset, id: uid(), name: preset.name + " — copie", items: cloneItems(preset.items), custom: true }] }, "Copie créée")}
                >
                  <Copy size={16} />
                </button>
                <button
                  className="icon-btn danger"
                  aria-label={"Supprimer " + preset.name}
                  onClick={() => {
                    if (confirm(`Supprimer « ${preset.name} » de la bibliothèque ?`)) change({ ...w, presets: w.presets.filter((x) => x.id !== preset.id) }, "Preset supprimé");
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="Aucun preset" text="Enregistrez un tournage en template ou importez-en un." />
      )}
      {editing && (
        <Sheet title="Personnaliser le template" onClose={() => setEditing(null)}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editing) return;
              change({ ...w, presets: w.presets.some((x) => x.id === editing.id) ? w.presets.map((x) => (x.id === editing.id ? editing : x)) : [...w.presets, editing] }, "Template enregistré");
              setEditing(null);
            }}
          >
            <label className="field">
              Nom
              <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className="field">
              Description
              <textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </label>
            <p className="muted">{editing.items.length} éléments seront inclus dans ce template.</p>
            <div className="form-actions">
              <button className="btn" type="button" onClick={() => setEditing(null)}>
                Annuler
              </button>
              <button className="btn gold" type="submit">
                Enregistrer le template
              </button>
            </div>
          </form>
        </Sheet>
      )}
    </Screen>
  );
}
