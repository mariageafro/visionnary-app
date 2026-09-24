import { describe, expect, it } from "vitest";
import { reorderOnDrop } from "../src/reorder";

const list = ["a", "b", "c", "d"].map((id, n) => ({ id, order: n * 10 }));
const apply = (r: ReturnType<typeof reorderOnDrop>) => list.map((i) => ({ ...i, order: r!.orders.get(i.id) ?? i.order })).sort((x, y) => x.order - y.order).map((i) => i.id).join("");

describe("réordonner par glisser-déposer", () => {
  it("échange deux voisines dans les deux sens", () => {
    expect(apply(reorderOnDrop(list, "a", "b"))).toBe("bacd");
    expect(apply(reorderOnDrop(list, "b", "a"))).toBe("bacd");
  });
  it("déplace vers la droite (après) et vers la gauche (avant)", () => {
    expect(apply(reorderOnDrop(list, "a", "d"))).toBe("bcda");
    expect(apply(reorderOnDrop(list, "d", "a"))).toBe("dabc");
  });
  it("insère avant la cible une pose venue d'une autre section, sans toucher aux autres ordres", () => {
    const outside = { id: "z", order: 99 };
    const r = reorderOnDrop(list, "z", "c", outside)!;
    expect(r.crossed).toBe(true);
    expect([...r.orders.keys()].sort()).toEqual(["a", "b", "c", "d", "z"]);
    expect(list.concat(outside).map((i) => ({ ...i, order: r.orders.get(i.id)! })).sort((x, y) => x.order - y.order).map((i) => i.id).join("")).toBe("abzcd");
  });
  it("ignore un dépôt sur soi-même ou une cible inconnue", () => {
    expect(reorderOnDrop(list, "a", "a")).toBeNull();
    expect(reorderOnDrop(list, "a", "x")).toBeNull();
  });
});
