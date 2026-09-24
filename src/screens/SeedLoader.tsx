import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { loadAndyMaevaPlan } from "../seedOnline";
import { navigate, Screen } from "../ui";

/** Ouvre le plan vidéo Andy & Maeva : le crée à la première visite (vignettes embarquées), puis va aux références. */
export default function SeedLoader({ to = "/m/references" }: { to?: string }) {
  const { w, change } = useStore();
  const [state, setState] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    loadAndyMaevaPlan(w, (done, total) => setState({ done, total }))
      .then(({ workspace, created }) => {
        if (created) change(workspace, "Plan vidéo Andy & Maeva chargé");
        else change(workspace, "Plan vidéo Andy & Maeva ouvert");
        navigate(to);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen title="Plan vidéo Andy & Maeva">
      <p className="notice">{error ? "Chargement interrompu : " + error : state.total ? `Chargement des plans… ${state.done}/${state.total}` : "Préparation…"}</p>
    </Screen>
  );
}
