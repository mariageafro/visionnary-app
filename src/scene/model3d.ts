/** Formats autonomes : GLB embarque ses ressources ; OBJ sans MTL conserve sa géométrie. */
export const MODEL_3D_LIMIT = 100 * 1024 * 1024;

export function model3dFormat(name: string): "glb" | "obj" | null {
  const extension = name.toLowerCase().split(".").pop();
  return extension === "glb" || extension === "obj" ? extension : null;
}

export function model3dImportError(file: Pick<File, "name" | "size">): string | null {
  if (!model3dFormat(file.name)) return "Choisissez un modèle .glb ou .obj autonome.";
  if (!file.size) return "Le fichier est vide.";
  if (file.size > MODEL_3D_LIMIT) return "Le modèle dépasse 100 Mo. Choisissez un fichier plus léger.";
  return null;
}
