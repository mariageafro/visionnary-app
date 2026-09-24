import { describe, expect, it } from "vitest";
import { groupSimilar, hamming } from "../src/similar";

describe("photos similaires", () => {
  it("compte les bits différents", () => expect(hamming("0000000000000000", "000000000000000f")).toBe(4));
  it("relie les empreintes voisines et laisse les autres seules", () => {
    const groups = groupSimilar(new Map([["a", "0000000000000000"], ["b", "0000000000000003"], ["c", "ffffffffffffffff"], ["d", "0000000000000007"]]), 6);
    expect(groups).toEqual([["a", "b", "d"]]);
  });
});

import { reorderBlock } from "../src/reorder";
describe("déplacer plusieurs éléments", () => {
  const mk = (id: string, order: number) => ({ id, order });
  const list = ["a", "b", "c", "d", "e"].map((id, n) => mk(id, n));
  it("remonte un bloc avant la cible en gardant son ordre", () => {
    const r = reorderBlock(list, [mk("d", 3), mk("e", 4)], "a", "before")!;
    const sorted = [...r.orders].sort((x, y) => x[1] - y[1]).map(([id]) => id);
    expect(sorted).toEqual(["d", "e", "a", "b", "c"]);
  });
  it("descend un bloc après la cible", () => {
    const r = reorderBlock(list, [mk("a", 0), mk("b", 1)], "d", "after")!;
    expect([...r.orders].sort((x, y) => x[1] - y[1]).map(([id]) => id)).toEqual(["c", "d", "a", "b", "e"]);
  });
});

import { movePoseSectionTo } from "../src/poseSections";
import { newProject, makeItem } from "../src/model";
describe("ordre des sections photo", () => {
  it("place une section tout en haut, tout en bas ou à la place d'une autre", () => {
    const p = { ...newProject("t"), items: ["A", "B", "C", "D"].map((c) => makeItem("poses", c, { category: c })) };
    const titles = (x: typeof p) => (x.poseSections ?? []).map((s) => s.title);
    expect(titles(movePoseSectionTo(p, "D", "start"))).toEqual(["D", "A", "B", "C"]);
    expect(titles(movePoseSectionTo(p, "A", "end"))).toEqual(["B", "C", "D", "A"]);
    expect(titles(movePoseSectionTo(p, "A", "C"))).toEqual(["B", "C", "A", "D"]);
    expect(titles(movePoseSectionTo(p, "D", "B"))).toEqual(["A", "D", "B", "C"]);
  });
});
