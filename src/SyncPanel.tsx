import { useEffect, useState } from "react";
import type { Workspace, MediaEntry } from "./types";
import { listMedia, restoreWorkspace } from "./storage";
import { validateWorkspace } from "./exports";
async function api(path: string, method = "GET", body?: unknown) {
  const r = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.error || "Serveur indisponible"), { status: r.status });
  return data;
}
const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
export default function SyncPanel({
  workspace,
  onRestore,
}: {
  workspace: Workspace;
  onRestore: (w: Workspace) => void;
}) {
  const [state, setState] = useState<{ configured: boolean; authenticated: boolean } | null>(null),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState<number | null>(null),
    [conflict, setConflict] = useState(false),
    [confirmDownload, setConfirmDownload] = useState(false);
  async function refresh() {
    try {
      setState(await api("/status"));
    } catch {
      setMessage("Serveur local arrêté. Lancez npm run server dans un terminal.");
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      if ((e as { status?: number }).status === 409) setConflict(true);
      setMessage(e instanceof Error ? e.message : "Opération impossible");
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    const remote = await api("/workspace");
    if (!Number.isSafeInteger(remote.revision) || remote.revision < 0)
      throw new Error("Révision serveur invalide.");
    if (!remote.workspace) {
      setRevision(remote.revision);
      setMessage("Le serveur ne contient encore aucun projet.");
      return;
    }
    const restored = validateWorkspace(remote.workspace);
    const manifest: unknown = await api("/media");
    if (!Array.isArray(manifest) || manifest.length > 10000) throw new Error("Liste des médias invalide.");
    const media: MediaEntry[] = [];
    const ids = new Set<string>();
    let total = 0;
    for (const entry of manifest) {
      if (!entry || typeof entry !== "object") throw new Error("Métadonnées de média invalides.");
      const m = entry as Record<string, unknown>;
      if (
        !["id", "projectId", "itemId", "name", "type"].every((key) => typeof m[key] === "string") ||
        !Number.isSafeInteger(m.size) ||
        Number(m.size) < 0 ||
        Number(m.size) > 32 * 1024 * 1024 ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(String(m.id))
      )
        throw new Error("Identifiant, taille ou métadonnées de média invalides.");
      const project = restored.projects.find((p) => p.id === m.projectId);
      if (!project || (m.itemId !== "" && !project.items.some((i) => i.id === m.itemId))) continue;
      const id = String(m.id);
      if (ids.has(id)) throw new Error("Identifiant média dupliqué.");
      ids.add(id);
      total += Number(m.size);
      if (total > 250 * 1024 * 1024)
        throw new Error("Restauration limitée à 250 Mo. Utilisez une archive adaptée.");
      const data = await api("/media/" + encodeURIComponent(id));
      if (
        !data ||
        !["id", "projectId", "itemId", "name", "type", "size"].every((key) => data[key] === m[key]) ||
        typeof data.base64 !== "string" ||
        data.base64.length > 44 * 1024 * 1024 ||
        /[^A-Za-z0-9+/=]/.test(data.base64)
      )
        throw new Error("Contenu média incohérent avec la liste du serveur.");
      let binary: string;
      try {
        binary = atob(data.base64);
        if (btoa(binary) !== data.base64) throw new Error("Base64 non canonique");
      } catch {
        throw new Error(`Le média ${String(m.name)} est endommagé.`);
      }
      if (binary.length !== m.size) throw new Error(`Taille incohérente pour ${String(m.name)}.`);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      media.push({
        id,
        projectId: String(m.projectId),
        itemId: String(m.itemId),
        name: String(m.name),
        type: String(m.type),
        size: Number(m.size),
        blob: new Blob([bytes], { type: String(m.type) }),
      });
    }
    for (const project of restored.projects)
      if (project.coverId && !media.some((m) => m.id === project.coverId && m.projectId === project.id))
        throw new Error("Une couverture référencée est absente du serveur.");
    const latest = await api("/workspace");
    if (latest.revision !== remote.revision)
      throw Object.assign(new Error("Le serveur a changé pendant le téléchargement. Recommencez."), {
        status: 409,
      });
    await restoreWorkspace(restored, media);
    onRestore(restored);
    setRevision(remote.revision);
    setConflict(false);
    setConfirmDownload(false);
    setMessage("Version distante et médias téléchargés.");
  }
  return (
    <section className="card stack">
      <h2>Compte et synchronisation locale</h2>
      <p className="muted">
        Sauvegarde sur cet ordinateur. Synchronisation manuelle ; le serveur doit rester ouvert. Serveur
        local, accès réseau optionnel configuré séparément. Aucun compte cloud. Médias limités à 32 Mo chacun.
      </p>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {!state ? (
        <button className="btn" onClick={() => void refresh()}>
          Vérifier le serveur
        </button>
      ) : !state.authenticated ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (!state.configured) await api("/setup", "POST", { username, password });
              await api("/login", "POST", { username, password });
              setPassword("");
              await refresh();
              setMessage("Connexion établie.");
            });
          }}
        >
          <label className="field">
            Identifiant
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label className="field">
            Mot de passe (12 caractères minimum à la création)
            <input
              type="password"
              autoComplete={state.configured ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={state.configured ? 1 : 12}
              required
            />
          </label>
          <button className="btn" disabled={busy}>
            {state.configured ? "Se connecter" : "Créer le compte local"}
          </button>
        </form>
      ) : (
        <div className="stack">
          <p>Connecté · Version serveur suivie : {revision ?? "non chargée"}</p>
          <button
            className="btn"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (revision === null) {
                  const remote = await api("/workspace");
                  if (remote.workspace) {
                    setConflict(true);
                    setMessage(
                      "Un espace existe déjà sur le serveur. Téléchargez-le avant de synchroniser pour éviter de perdre ses modifications.",
                    );
                    return;
                  }
                  setRevision(remote.revision);
                  await upload(remote.revision);
                } else await upload(revision);
              })
            }
          >
            Envoyer les projets et médias
          </button>
          <button className="btn" disabled={busy} onClick={() => setConfirmDownload(true)}>
            Télécharger la version serveur
          </button>
          {(conflict || confirmDownload) && (
            <div className="notice stack">
              <p>
                Le téléchargement remplacera tous les projets et modèles locaux. Exportez votre archive avant
                de continuer si vous souhaitez les conserver.
              </p>
              <button className="btn" disabled={busy} onClick={() => void run(download)}>
                Remplacer par la version distante
              </button>
              <button
                className="btn"
                disabled={busy}
                onClick={() => {
                  setConflict(false);
                  setConfirmDownload(false);
                }}
              >
                Annuler
              </button>
            </div>
          )}
          <button
            className="btn"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await api("/logout", "POST", {});
                setRevision(null);
                await refresh();
              })
            }
          >
            Se déconnecter
          </button>
        </div>
      )}
    </section>
  );
  async function upload(baseRevision: number) {
    const remote = await api("/workspace");
    if (remote.revision !== baseRevision)
      throw Object.assign(new Error("Conflit : la version serveur a changé."), { status: 409 });
    const media = await listMedia();
    for (const m of media) {
      if (m.blob.size > 32 * 1024 * 1024)
        throw new Error(`Le média ${m.name} dépasse 32 Mo. Utilisez une archive locale.`);
      const { blob, thumbnail, ...meta } = m;
      void thumbnail;
      await api("/media/" + encodeURIComponent(m.id), "PUT", { ...meta, base64: await toBase64(blob) });
    }
    const result = await api("/workspace", "PUT", { workspace, baseRevision });
    setRevision(result.revision);
    setConflict(false);
    setMessage("Projets et médias sauvegardés sur le serveur local.");
  }
}
