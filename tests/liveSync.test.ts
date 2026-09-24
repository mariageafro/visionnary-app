import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncOnce } from "../src/liveSync";
import { makeItem, newProject } from "../src/model";
import type { Workspace } from "../src/types";

/** Deux « appareils » (deux stockages locaux) qui partagent un canal ntfy simulé en mémoire. */
const channel: { id: string; message: string }[] = [];
let counter = 0;
let storage: Record<string, string> = {};
const devices: Record<string, Record<string, string>> = { A: {}, B: {} };
const use = (name: string) => { storage = devices[name]; };

beforeEach(() => {
  channel.length = 0;
  counter = 0;
  devices.A = {};
  devices.B = {};
  vi.stubGlobal("localStorage", { getItem: (k: string) => storage[k] ?? null, setItem: (k: string, v: string) => { storage[k] = v; } });
  vi.stubGlobal("fetch", async (url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === "POST") { channel.push({ id: "m" + ++counter, message: String(init.body) }); return { ok: true }; }
    const since = /since=([^&]+)/.exec(url)?.[1] ?? "all";
    const from = since === "all" ? 0 : channel.findIndex((m) => m.id === since) + 1;
    return { ok: true, text: async () => channel.slice(from).map((m) => JSON.stringify({ id: m.id, event: "message", message: m.message })).join("\n") };
  });
});

const workspace = (status = "prévu"): Workspace => {
  const p = { ...newProject("Andy & Maeva"), syncTopic: "vn-test-room-123456" };
  p.items = [{ ...makeItem("poses", "Pose 1", { packKey: "seed-pose2:abc", status }), id: "local-1" }];
  return { schemaVersion: 1, projects: [p], presets: [], activeProjectId: p.id, revision: 1, updatedAt: "" };
};

describe("synchro en ligne", () => {
  it("une validation faite sur A arrive sur B", async () => {
    const a = workspace("terminé");
    a.projects[0].items[0] = { ...a.projects[0].items[0], doneBy: "Trude", doneAt: "2026-09-24T14:00:00Z" };
    use("A");
    const out = await syncOnce(a, a.projects[0].id, true);
    expect(out.pushed).toBe(1);
    use("B");
    const b = workspace("prévu");
    const got = await syncOnce(b, b.projects[0].id, true);
    expect(got.received).toBe(1);
    expect([...got.applies.values()][0].vals[0]).toBe("terminé");
    expect([...got.applies.values()][0].vals[1]).toBe("Trude");
  });
  it("le plus récent gagne, et un plan intact ne renvoie rien", async () => {
    use("A");
    const a = workspace("terminé");
    await syncOnce(a, a.projects[0].id, true);
    use("B");
    const b = workspace("prévu");
    const rb = await syncOnce(b, b.projects[0].id, true);
    expect(rb.received).toBe(1);
    const again = await syncOnce(b, b.projects[0].id, false);
    expect(again.pushed).toBe(0);
  });
});
