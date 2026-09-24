import { useEffect, useState } from "react";
import { Download, FileJson, FileSpreadsheet, Film, HardDrive, Package, Printer, ShieldCheck, Upload } from "lucide-react";
import { useStore } from "../store";
import { moduleById } from "../model";
import { exportEDL, exportProjectCSV, exportProjectJSON, exportWorkspace, importWorkspace } from "../exports";
import { listMedia } from "../storage";
import { formatBytes } from "../media";
import { Screen } from "../ui";
import OfflineStatus from "../OfflineStatus";
import PackImport from "./PackImport";
import { itemsOf, titleOf } from "./common";

export default function Files() {
  const { w, project: p, replace, notify } = useStore();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [size, setSize] = useState(0);
  const [persistent, setPersistent] = useState(false);

  useEffect(() => {
    void listMedia().then((all) => setSize(all.reduce((n, m) => n + m.size, 0)));
    void navigator.storage?.persisted?.().then(setPersistent);
  }, [w]);

  async function run(label: string, fn: () => Promise<void> | void) {
    setBusy(label);
    setError("");
    try {
      await fn();
      notify("Export prêt");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <Screen title="Fichiers & sauvegarde" backTo="/plus">
      <OfflineStatus />
      <div className="card" style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <span className="pill-icon" style={{ width: 52, height: 52 }}>
          <Package size={24} />
        </span>
        <div style={{ flex: "1 1 220px" }}>
          <span className="eyebrow" style={{ fontSize: 11, letterSpacing: ".08em", color: "var(--ink-2)", textTransform: "uppercase", fontWeight: 700 }}>
            Données locales & sauvegarde
          </span>
          <h2 style={{ margin: "4px 0 6px" }}>Téléchargez pour le Jour J</h2>
          <p className="muted">Projets et médias sont déjà enregistrés sur cet appareil. Exportez un pack complet pour le sauvegarder ou le transférer.</p>
          <button className="btn gold" style={{ marginTop: 10 }} disabled={!!busy} onClick={() => run("zip", () => exportWorkspace(w))}>
            <Download size={17} /> {busy === "zip" ? "Préparation…" : "Télécharger le pack complet (ZIP)"}
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 12 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <strong style={{ fontSize: 22 }}>{formatBytes(size)}</strong>
          <p className="muted" style={{ fontSize: 12 }}>
            de médias locaux
          </p>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <strong style={{ fontSize: 22 }}>{w.projects.filter((x) => !x.library).length}</strong>
          <p className="muted" style={{ fontSize: 12 }}>
            tournage{w.projects.filter((x) => !x.library).length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <button
        className="btn full"
        style={{ marginTop: 12 }}
        onClick={async () => {
          const yes = await navigator.storage?.persist?.();
          setPersistent(!!yes);
          notify(yes ? "Stockage persistant autorisé" : "Le navigateur gère automatiquement l’autorisation de stockage");
        }}
      >
        <ShieldCheck size={16} /> {persistent ? "Stockage persistant autorisé" : "Protéger le stockage local"}
      </button>

      {error && (
        <p className="notice red" role="alert">
          {error}
        </p>
      )}

      {p && (
        <>
          <div className="section-title">Exports de préparation — {p.name}</div>
          <div className="tiles wide">
            <button className="tile dark" disabled={!!busy} onClick={() => window.print()}>
              <Printer size={22} />
              <strong>Fiche équipe · PDF</strong>
              <small>Impression / enregistrer en PDF</small>
            </button>
            <button className="tile dark" disabled={!!busy} onClick={() => run("csv", () => exportProjectCSV(p))}>
              <FileSpreadsheet size={22} />
              <strong>Shot list · CSV</strong>
              <small>Tableau à partager</small>
            </button>
            <button className="tile dark" disabled={!!busy} onClick={() => run("edl", () => exportEDL(p))}>
              <Film size={22} />
              <strong>Pré-timeline · EDL</strong>
              <small>25 fps, placeholders</small>
            </button>
            <button className="tile dark" disabled={!!busy} onClick={() => run("json", () => exportProjectJSON(p))}>
              <FileJson size={22} />
              <strong>Projet · JSON</strong>
              <small>Données sans médias</small>
            </button>
          </div>
        </>
      )}

      <div className="section-title">Restaurer ou transférer</div>
      <div className="card">
        <p className="muted">Importer un pack ZIP remplace les données locales. Un JSON de studio complet est accepté aussi, sans ses médias. Le JSON d’un projet seul est un export d’échange.</p>
        <label className="btn full" style={{ marginTop: 10 }} aria-disabled={!!busy}>
          <Upload size={17} /> Restaurer une sauvegarde
          <input
            className="sr-only"
            type="file"
            accept=".zip,.json"
            disabled={!!busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!confirm("Remplacer tous les projets et médias de cet appareil par cette sauvegarde ?")) {
                e.target.value = "";
                return;
              }
              setBusy("restore");
              setError("");
              try {
                const next = await importWorkspace(file);
                replace(next);
                notify("Sauvegarde restaurée");
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
              } finally {
                setBusy("");
                e.target.value = "";
              }
            }}
          />
        </label>
      </div>

      {p && <PackImport />}

      {p && (
        <section className="print-report">
          <h1>VISIONNARY · {p.name}</h1>
          <p>
            {p.date} · {p.venue}
          </p>
          <h2>À capturer absolument</h2>
          <p>{p.mustHave || "—"}</p>
          <h2>À éviter</h2>
          <p>{p.avoid || "—"}</p>
          <h2>Équipe</h2>
          {itemsOf(p, "team").map((m) => (
            <p key={m.id}>
              {m.title} — {String(m.role || "")} {m.phone ? `· ${m.phone}` : ""}
            </p>
          ))}
          <h2>Déroulé</h2>
          {itemsOf(p, "stages").map((s) => (
            <p key={s.id}>
              {String(s.time || "—:—")} — {s.title} {titleOf(p, s.venueId) ? `· ${titleOf(p, s.venueId)}` : ""}
            </p>
          ))}
          <h2>Plans essentiels</h2>
          {itemsOf(p, "shots")
            .filter((s) => s.priority === "MUST HAVE")
            .map((s) => (
              <p key={s.id}>
                {s.title} — {String(s.framing || "")}
              </p>
            ))}
          <h2>Checklist</h2>
          {itemsOf(p, "checklists").map((c) => (
            <p key={c.id}>
              [{c.status === "terminé" ? "x" : " "}] {c.title} ({moduleById("checklists")?.label} · {String(c.phase || "avant")})
            </p>
          ))}
        </section>
      )}
      <p className="muted no-print" style={{ marginTop: 16 }}>
        <HardDrive size={14} style={{ verticalAlign: -2 }} /> Conservez une copie ZIP avant de changer d’appareil.
      </p>
    </Screen>
  );
}
