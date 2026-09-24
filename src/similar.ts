/**
 * Photos qui se ressemblent : empreinte perceptuelle (dHash 9×8) comparée par distance de Hamming.
 * Deux prises du même angle ou presque ont des empreintes voisines ; on les relie en groupes.
 */
export const hamming = (a: string, b: string) => {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
};

/** Groupes (≥ 2) d'identifiants dont les empreintes sont à `threshold` bits ou moins, transitivement. */
export function groupSimilar(hashes: Map<string, string>, threshold: number): string[][] {
  const ids = [...hashes.keys()];
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (id: string): string => (parent.get(id) === id ? id : (parent.set(id, find(parent.get(id)!)), parent.get(id)!));
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) if (hamming(hashes.get(ids[i])!, hashes.get(ids[j])!) <= threshold) parent.set(find(ids[j]), find(ids[i]));
  const groups = new Map<string, string[]>();
  for (const id of ids) groups.set(find(id), [...(groups.get(find(id)) ?? []), id]);
  return [...groups.values()].filter((g) => g.length > 1);
}

/** Empreinte 64 bits (16 caractères hexadécimaux) d'une image, ou null si elle ne se décode pas. */
export async function imageHash(blob: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, 9, 8);
    bitmap.close?.();
    const px = ctx.getImageData(0, 0, 9, 8).data;
    const gray = (x: number, y: number) => {
      const o = (y * 9 + x) * 4;
      return px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114;
    };
    let bits = "";
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += gray(x, y) > gray(x + 1, y) ? "1" : "0";
    let hex = "";
    for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
  } catch {
    return null;
  }
}
