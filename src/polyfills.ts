/** Anciennes tablettes (iPad sous iOS < 15.4, vieux Android) : compléments minimaux pour ce que l'app utilise. */
const c = globalThis.crypto as Crypto | undefined;
if (c && typeof c.randomUUID !== "function") {
  (c as unknown as { randomUUID: () => string }).randomUUID = () => {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
} else if (!c) {
  (globalThis as unknown as { crypto: unknown }).crypto = { getRandomValues: (a: Uint8Array) => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; }, randomUUID: () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => { const r = Math.floor(Math.random() * 16); return (ch === "x" ? r : (r & 3) | 8).toString(16); }) };
}
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, "at", { value: function at(this: unknown[], n: number) { const i = n < 0 ? this.length + n : n; return this[i]; }, configurable: true, writable: true });
}
