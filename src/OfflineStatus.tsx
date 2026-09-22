import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, WifiOff } from "lucide-react";

/** Un statut positif exige une installation terminée, pas seulement la présence de données IndexedDB. */
export default function OfflineStatus() {
  const [status, setStatus] = useState("Vérification du cache…");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  async function check() {
    if (import.meta.env.DEV) {
      setStatus(
        "Aperçu de développement : données conservées, mais ouverture sans réseau non garantie. Utilisez la version construite pour préparer le Jour J.",
      );
      return;
    }
    if (!("serviceWorker" in navigator)) {
      setStatus(
        "Cache hors ligne indisponible dans ce navigateur ou sur cette adresse. Ouvrez l’application en HTTPS.",
      );
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    const active = registration?.active;
    const cached = await caches.match("/index.html");
    setReady(!!active && !!cached);
    setStatus(
      active && cached
        ? "Application disponible hors ligne sur cet appareil. Les médias importés restent dans votre stockage local."
        : "Préparation du cache en cours. Gardez cette page ouverte avec le réseau avant de partir.",
    );
  }
  useEffect(() => {
    void check().catch(() => setStatus("Vérification du cache indisponible."));
    const timer = setInterval(
      () => void check().catch(() => setStatus("Vérification du cache indisponible.")),
      3000,
    );
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="notice" role="status">
      {ready ? <CheckCircle2 size={20} /> : <WifiOff size={20} />}
      <span>{status}</span>
      {!import.meta.env.DEV && (
        <button
          className="btn small"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await navigator.serviceWorker.getRegistration().then((r) => r?.update());
              await check();
            } catch {
              setStatus("Vérification impossible sans connexion. Les données locales sont conservées.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={15} />
          Vérifier
        </button>
      )}
    </div>
  );
}
