import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Item, Project, Workspace } from "./types";
import { done, presetLibrary } from "./model";
import { loadWorkspace, saveWorkspace } from "./storage";

export interface Toast {
  text: string;
  undo?: boolean;
  /** Propose « Rétablir » (après une annulation). */
  redo?: boolean;
}
interface Store {
  w: Workspace;
  project?: Project;
  /** Modification annulable du studio complet. */
  change: (next: Workspace, message?: string) => void;
  update: (p: Project, message?: string) => void;
  patchItem: (id: string, values: Partial<Item>, message?: string) => void;
  addItems: (items: Item[], message?: string) => void;
  removeItem: (id: string, message?: string) => void;
  setActive: (id: string) => void;
  /** Remplace tout (restauration) sans historique. */
  replace: (next: Workspace) => void;
  undo: () => void;
  canUndo: boolean;
  /** Rétablit la dernière modification annulée. */
  redo: () => void;
  canRedo: boolean;
  notify: (text: string, undo?: boolean) => void;
  toast: Toast | null;
  saveState: string;
  error: string;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const store = useContext(Ctx);
  if (!store) throw new Error("Store absent");
  return store;
};
/** Projet actif garanti : les écrans qui en dépendent sont protégés par le shell. */
export const useProject = () => {
  const store = useStore();
  return { ...store, project: store.project! };
};

export const emptyWorkspace = (): Workspace => ({
  schemaVersion: 1,
  projects: [],
  presets: presetLibrary(),
  activeProjectId: "",
  revision: 0,
  updatedAt: new Date().toISOString(),
});

/** Horodate les passages à « fait » : sert aux rappels « après une tâche cochée ». */
function stampDone(previous: Project | undefined, next: Project): Project {
  if (!previous) return next;
  const before = new Map(previous.items.map((i) => [i.id, i]));
  let changed = false;
  const items = next.items.map((item) => {
    const old = before.get(item.id);
    if (done(item) && (!old || !done(old)) && !item.doneAt) {
      changed = true;
      return { ...item, doneAt: new Date().toISOString() };
    }
    if (!done(item) && item.doneAt) {
      changed = true;
      const copy = { ...item };
      delete copy.doneAt;
      return copy;
    }
    return item;
  });
  return changed ? { ...next, items } : next;
}

export function StoreProvider({ children }: { children: (state: { ready: boolean; error: string }) => ReactNode }) {
  const [w, setW] = useState<Workspace>();
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("Chargement…");
  const [toast, setToast] = useState<Toast | null>(null);
  const [past, setPast] = useState<Workspace[]>([]);
  const [future, setFuture] = useState<Workspace[]>([]);
  const current = useRef<Workspace | undefined>(undefined);
  const queue = useRef(Promise.resolve());
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    loadWorkspace()
      .then((data) => {
        const next = data ?? emptyWorkspace();
        current.current = next;
        setW(next);
        setSaveState("Enregistré sur cet appareil");
      })
      .catch((e) => setError("Stockage local indisponible : " + e));
  }, []);

  function persist(next: Workspace) {
    current.current = next;
    setW(next);
    setSaveState("Enregistrement…");
    queue.current = queue.current
      .catch(() => {})
      .then(() => saveWorkspace(next))
      .then(() => setSaveState("Enregistré sur cet appareil"))
      .catch((e) => {
        setSaveState("Échec d’enregistrement");
        setError("Enregistrement impossible. Exportez une sauvegarde : " + e);
      });
  }
  // Un message avec action (Annuler / Rétablir) reste plus longtemps pour laisser le temps d'agir.
  function showToast(next: Toast) {
    setToast(next);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), next.undo || next.redo ? 7000 : 3500);
  }
  function notify(text: string, undo = false) {
    showToast({ text, undo });
  }
  function change(next: Workspace, message?: string) {
    const base = current.current;
    if (base) setPast((p) => [...p.slice(-29), base]);
    setFuture([]);
    persist({ ...next, revision: next.revision + 1, updatedAt: new Date().toISOString() });
    if (message) notify(message);
  }
  function update(p: Project, message?: string) {
    const base = current.current!;
    const previous = base.projects.find((x) => x.id === p.id);
    const next = stampDone(previous, { ...p, updatedAt: new Date().toISOString() });
    change({ ...base, projects: base.projects.map((x) => (x.id === p.id ? next : x)) }, message);
  }
  const active = () => {
    const base = current.current!;
    return base.projects.find((x) => x.id === base.activeProjectId && !x.library) ?? base.projects.find((x) => !x.library) ?? base.projects[0];
  };

  const store: Store | null = w
    ? {
        w,
        project: (w.projects.find((x) => x.id === w.activeProjectId && !x.library) ?? w.projects.find((x) => !x.library)) as Project,
        change,
        update,
        patchItem(id, values, message) {
          const p = active();
          update({ ...p, items: p.items.map((i) => (i.id === id ? ({ ...i, ...values } as Item) : i)) }, message);
        },
        addItems(items, message) {
          const p = active();
          update({ ...p, items: [...p.items, ...items] }, message);
        },
        removeItem(id, message) {
          const p = active();
          // Les liens vers l'élément supprimé sont vidés pour garder des données cohérentes.
          const items = p.items
            .filter((i) => i.id !== id)
            .map((i) => (Object.values(i).includes(id) ? (Object.fromEntries(Object.entries(i).filter(([k, v]) => k === "id" || v !== id)) as Item) : i));
          // Une étape supprimée emporte ses horaires de moments.
          const moments = p.moments && Object.fromEntries(Object.entries(p.moments).filter(([key]) => !key.startsWith(id + "|")));
          update({ ...p, items, ...(moments ? { moments } : {}) });
          notify(message ?? "Élément supprimé", true);
        },
        setActive(id) {
          persist({ ...current.current!, activeProjectId: id });
        },
        replace(next) {
          setPast([]);
          setFuture([]);
          persist(next);
        },
        undo() {
          const previous = past.at(-1);
          const now = current.current;
          if (!previous || !now) return;
          setPast((p) => p.slice(0, -1));
          setFuture((f) => [...f.slice(-29), now]);
          persist(previous);
          showToast({ text: "Modification annulée", redo: true });
        },
        canUndo: past.length > 0,
        redo() {
          const next = future.at(-1);
          const now = current.current;
          if (!next || !now) return;
          setFuture((f) => f.slice(0, -1));
          setPast((p) => [...p.slice(-29), now]);
          persist(next);
          showToast({ text: "Modification rétablie", undo: true });
        },
        canRedo: future.length > 0,
        notify,
        toast,
        saveState,
        error,
      }
    : null;

  return <Ctx.Provider value={store}>{children({ ready: !!w, error })}</Ctx.Provider>;
}
