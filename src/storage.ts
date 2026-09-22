import { openDB } from "idb";
import type { Workspace, MediaEntry } from "./types";
const db = () =>
  openDB("visionnary-local", 1, {
    upgrade(database) {
      database.createObjectStore("workspace");
      const media = database.createObjectStore("media", { keyPath: "id" });
      media.createIndex("projectId", "projectId");
    },
  });
export async function loadWorkspace(): Promise<Workspace | undefined> {
  return (await db()).get("workspace", "current");
}
export async function saveWorkspace(workspace: Workspace): Promise<void> {
  await (await db()).put("workspace", workspace, "current");
}
export async function putMedia(media: MediaEntry): Promise<void> {
  await (await db()).put("media", media);
}
export async function listMedia(projectId?: string): Promise<MediaEntry[]> {
  const database = await db();
  return projectId ? database.getAllFromIndex("media", "projectId", projectId) : database.getAll("media");
}
export async function getMedia(id: string): Promise<MediaEntry | undefined> {
  return (await db()).get("media", id);
}
export async function deleteMedia(id: string): Promise<void> {
  await (await db()).delete("media", id);
}
// Installation atomique de la sauvegarde : aucune écriture partielle en cas d'erreur.
export async function restoreWorkspace(workspace: Workspace, media: MediaEntry[]): Promise<void> {
  const tx = (await db()).transaction(["workspace", "media"], "readwrite");
  await tx.objectStore("media").clear();
  for (const entry of media) await tx.objectStore("media").put(entry);
  await tx.objectStore("workspace").put(workspace, "current");
  await tx.done;
}
