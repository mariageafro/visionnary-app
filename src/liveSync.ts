import { useEffect, useRef } from "react";
import type { Item, Project, Workspace } from "./types";
import { useStore } from "./store";

/**
 * Synchro en ligne sans compte ni serveur à nous : les validations circulent par un « canal » public secret (ntfy.sh,
 * messages conservés 12 h). Chaque changement de statut est publié avec son heure ; l'heure la plus récente gagne.
 * Hors ligne, tout reste local et repart à la reconnexion. Clé d'un plan : pose:<id d'origine> ou ref:<code>.
 */
const NTFY = "https://ntfy.sh/";
const DEFAULTS = new Set(["", "prévu", "à faire"]);
type Vals = [string, string, string, string, string];
interface Saved { known: Record<string, [number, string]>; last: string; pushedActivity: string[] }

export function syncKey(i: Item): string | undefined {
  if (i.module === "poses") {
    const pk = String(i.packKey ?? "");
    return "pose:" + (pk.startsWith("seed-pose2:") ? pk.slice("seed-pose2:".length) : i.id);
  }
  if (i.module === "inspirations" && i.refSource === "couple" && i.refCode) return "ref:" + String(i.refCode);
  return undefined;
}
const valsOf = (i: Item): Vals => [DEFAULTS.has(String(i.status)) ? "" : String(i.status), String(i.doneBy ?? ""), String(i.doneAt ?? ""), String(i.anglesDone ?? ""), String(i.assignee ?? "")];
const sigOf = (v: Vals) => v.join("\u0001");
const isDefault = (v: Vals) => v.every((x) => x === "");

function apply(item: Item, v: Vals): Item {
  const todo = item.module === "poses" ? "prévu" : "à faire";
  return { ...item, status: v[0] || todo, doneBy: v[1], doneAt: v[2], anglesDone: v[3], assignee: v[4] } as Item;
}

const storeKey = (topic: string) => "vn-sync:" + topic;
function load(topic: string): Saved {
  try {
    return { known: {}, last: "", pushedActivity: [], ...(JSON.parse(localStorage.getItem(storeKey(topic)) ?? "{}") as Partial<Saved>) };
  } catch {
    return { known: {}, last: "", pushedActivity: [] };
  }
}
const save = (topic: string, s: Saved) => { try { localStorage.setItem(storeKey(topic), JSON.stringify(s)); } catch { /* espace plein : on réessaiera */ } };

async function pull(topic: string, since: string) {
  const res = await fetch(`${NTFY}${topic}/json?poll=1&since=${since || "all"}`, { cache: "no-store" });
  if (!res.ok) throw new Error("synchro indisponible");
  const events: { id: string; message: string }[] = [];
  for (const line of (await res.text()).split("\n")) {
    if (!line.trim()) continue;
    try { const e = JSON.parse(line); if (e.event === "message") events.push(e); } catch { /* ligne ignorée */ }
  }
  return events;
}
async function push(topic: string, entries: Record<string, [number, Vals]>, activity: { t: string; who: string; text: string; itemId?: string }[]) {
  const keys = Object.keys(entries);
  const batches: { d: Record<string, [number, Vals]>; a: typeof activity }[] = [];
  let cur: { d: Record<string, [number, Vals]>; a: typeof activity } = { d: {}, a: [] };
  const size = () => JSON.stringify(cur).length;
  for (const k of keys) {
    cur.d[k] = entries[k];
    if (size() > 3200) { delete cur.d[k]; batches.push(cur); cur = { d: { [k]: entries[k] }, a: [] }; }
  }
  for (const a of activity) {
    cur.a.push(a);
    if (size() > 3200) { cur.a.pop(); batches.push(cur); cur = { d: {}, a: [a] }; }
  }
  if (Object.keys(cur.d).length || cur.a.length) batches.push(cur);
  for (const b of batches) {
    const res = await fetch(NTFY + topic, { method: "POST", body: JSON.stringify(b) });
    if (!res.ok) throw new Error("envoi impossible");
  }
}

export interface SyncOutcome { applies: Map<string, { vals: Vals; prev: string }>; activity: { t: string; who: string; text: string; itemId?: string }[]; state: Saved; pushed: number; received: number }

/** Un tour de synchro : lit ce qui est arrivé, l'applique, publie ce qui a changé ici. Pure : ne touche à l'écran que via le résultat. */
export async function syncOnce(w: Workspace, projectId: string, refresh: boolean): Promise<SyncOutcome> {
  const p = w.projects.find((x) => x.id === projectId);
  const topic = p?.syncTopic;
  if (!p || !topic) return { applies: new Map(), activity: [], state: { known: {}, last: "", pushedActivity: [] }, pushed: 0, received: 0 };
  const state = load(topic);
  const remote = new Map<string, [number, Vals]>();
  const remoteActivity: { t: string; who: string; text: string; itemId?: string }[] = [];
  let last = state.last;
  for (const e of await pull(topic, state.last)) {
    last = e.id;
    try {
      const m = JSON.parse(e.message) as { d?: Record<string, [number, Vals]>; a?: typeof remoteActivity };
      for (const [k, entry] of Object.entries(m.d ?? {})) if (!remote.has(k) || entry[0] > remote.get(k)![0]) remote.set(k, entry);
      remoteActivity.push(...(m.a ?? []));
    } catch { /* message étranger ignoré */ }
  }
  let received = 0;
  const applies = new Map<string, { vals: Vals; prev: string }>();
  for (const i of p.items) {
    const k = syncKey(i);
    if (!k) continue;
    const r = remote.get(k);
    const known = state.known[k];
    if (r && r[0] > (known?.[0] ?? 0)) {
      state.known[k] = [r[0], sigOf(r[1])];
      if (sigOf(valsOf(i)) !== sigOf(r[1])) { received++; applies.set(k, { vals: r[1], prev: sigOf(valsOf(i)) }); }
    }
  }
  const items = p.items;
  // ce qui a changé ici depuis la dernière synchro
  const out: Record<string, [number, Vals]> = {};
  const now = Date.now();
  for (const i of items) {
    const k = syncKey(i);
    if (!k) continue;
    const v = valsOf(i);
    const known = state.known[k];
    if (!known) {
      state.known[k] = [0, sigOf(v)];
      if (!isDefault(v)) { state.known[k] = [now, sigOf(v)]; out[k] = [now, v]; }
    } else if (known[1] !== sigOf(v)) {
      state.known[k] = [now, sigOf(v)];
      out[k] = [now, v];
    } else if (refresh && known[0] > 0 && !isDefault(v)) out[k] = [known[0], v];
  }
  const have = new Set((p.activity ?? []).map((a) => a.t + "|" + a.text));
  const merged = [...(p.activity ?? []), ...remoteActivity.filter((a) => !have.has(a.t + "|" + a.text))].sort((a, b) => (a.t < b.t ? -1 : 1)).slice(-500);
  const pushedSet = new Set(state.pushedActivity);
  const newActivity = (p.activity ?? []).filter((a) => !pushedSet.has(a.t + "|" + a.text));
  await push(topic, out, newActivity);
  state.pushedActivity = [...state.pushedActivity, ...newActivity.map((a) => a.t + "|" + a.text), ...remoteActivity.map((a) => a.t + "|" + a.text)].slice(-1500);
  state.last = last;
  save(topic, state);
  return { applies, activity: merged, state, pushed: Object.keys(out).length, received };
}

/** Lance la synchro tant qu'un projet avec salle est ouvert : au démarrage, toutes les 6 s, au retour du réseau. */
export function useLiveSync(project: Project | undefined) {
  const { w, replace } = useStore();
  const latest = useRef(w);
  latest.current = w;
  const topic = project?.syncTopic;
  const id = project?.id;
  useEffect(() => {
    if (!topic || !id) return;
    let stop = false;
    let first = true;
    let busy = false;
    const tick = async () => {
      if (stop || busy || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
      busy = true;
      try {
        const out = await syncOnce(latest.current, id, first);
        first = false;
        if (!stop && (out.applies.size || out.activity.length !== (latest.current.projects.find((x) => x.id === id)?.activity ?? []).length)) {
          const cur = latest.current;
          replace({
            ...cur,
            revision: cur.revision + 1,
            projects: cur.projects.map((x) => x.id !== id ? x : {
              ...x,
              activity: [...(x.activity ?? []), ...out.activity.filter((a) => !(x.activity ?? []).some((b) => b.t === a.t && b.text === a.text))].sort((a, b) => (a.t < b.t ? -1 : 1)).slice(-500),
              // une modification faite ici pendant l'échange gagne : on n'écrase que ce qui n'a pas bougé
              items: x.items.map((i) => { const k = syncKey(i); const a = k ? out.applies.get(k) : undefined; return a && sigOf(valsOf(i)) === a.prev ? apply(i, a.vals) : i; }),
            }),
          });
        }
      } catch { /* hors ligne : on réessaie au prochain tour */ }
      busy = false;
    };
    void tick();
    const timer = window.setInterval(() => { if (document.visibilityState !== "hidden") void tick(); }, 6000);
    const on = () => void tick();
    window.addEventListener("online", on);
    document.addEventListener("visibilitychange", on);
    return () => { stop = true; window.clearInterval(timer); window.removeEventListener("online", on); document.removeEventListener("visibilitychange", on); };
  }, [topic, id]); // eslint-disable-line react-hooks/exhaustive-deps
}
