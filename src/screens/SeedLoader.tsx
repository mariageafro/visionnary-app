import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { loadAndyMaevaPlan } from "../seedOnline";
import { navigate, Screen } from "../ui";

/** Ouvre le plan vidéo Andy & Maeva : le crée à la première visite (vignettes embarquées), puis va aux références. */
export default function SeedLoader({ part = "video" }: { part?: "photo" | "video" }) {
  const { w, change } = useStore();
  const [state, setState] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    loadAndyMaevaPlan(w, part, (done, total) => setState({ done, total }))
      .then(({ workspace, created }) => {
        change(workspace, created ? "Plan Andy & Maeva chargé" : "Plan Andy & Maeva ouvert");
        navigate(part === "photo" ? "/m/poses" : "/m/references");
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen title="Andy & Maeva">
      <p className="notice" role="status">{error ? "Chargement interrompu : " + error : state.total ? `Chargement de la galerie… ${state.done}/${state.total} (une seule fois, ne quittez pas la page)` : "Préparation…"}</p>
      {state.total > 0 && !error && <progress max={state.total} value={state.done} style={{ width: "100%" }} />}
      {error && (
        <div className="btn-row">
          <button className="btn gold" onClick={() => location.reload()}>Réessayer</button>
          <button className="btn" onClick={() => { try { indexedDB.deleteDatabase("visionnary-local"); } catch { /* ignoré */ } location.reload(); }}>Tout recharger à zéro</button>
        </div>
      )}
      <p className="muted" style={{ fontSize: 12 }}>{typeof navigator !== "undefined" ? navigator.userAgent : ""}</p>
    </Screen>
  );
}
