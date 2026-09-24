import { describe, expect, it } from "vitest";
import { groupSimilar, hamming } from "../src/similar";

describe("photos similaires", () => {
  it("compte les bits différents", () => expect(hamming("0000000000000000", "000000000000000f")).toBe(4));
  it("relie les empreintes voisines et laisse les autres seules", () => {
    const groups = groupSimilar(new Map([["a", "0000000000000000"], ["b", "0000000000000003"], ["c", "ffffffffffffffff"], ["d", "0000000000000007"]]), 6);
    expect(groups).toEqual([["a", "b", "d"]]);
  });
});
