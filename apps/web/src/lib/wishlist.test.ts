import { describe, expect, it } from "vitest";

import { coalesce, idOf, otherStates, type WishlistEntry } from "./wishlist";
import { DEFAULT_REFINEMENT } from "./rows";
import type { Refinement, WishlistKind } from "../api/types";

/**
 * What makes two wishlist lines the same line.
 *
 * The rule is written twice — here and in `WishlistService.identityOf` — and
 * the two have to produce the same string for the same line: whichever is
 * coarser wins on the next reload, and the loser is a line the user kept apart
 * being merged into another with its quantity added on. These assertions are
 * the browser half; `WishlistServiceIdentityTest` is the other, and they are
 * deliberately the same four cases.
 */
describe("idOf", () => {
  it("identifies a part by kind and name alone", () => {
    expect(idOf({ itemName: "Volt Prime Neuroptics", kind: "part", refinement: "intact" })).toBe(
      idOf({ itemName: "Volt Prime Neuroptics", kind: "part", refinement: "radiant" }),
    );
  });

  it("keeps the same name wanted for two reasons as two lines", () => {
    expect(idOf({ itemName: "Volt Prime Neuroptics", kind: "part" })).not.toBe(
      idOf({ itemName: "Volt Prime Neuroptics", kind: "ducat" }),
    );
  });

  it("identifies a relic by the state it is wanted in", () => {
    expect(idOf({ itemName: "Axi A20", kind: "relic", refinement: "intact" })).not.toBe(
      idOf({ itemName: "Axi A20", kind: "relic", refinement: "exceptional" }),
    );
  });

  /**
   * The case the two sides disagreed on.
   *
   * Asserted against `DEFAULT_REFINEMENT` rather than against "radiant", so the
   * test says the rule — a line that names no state means the state the
   * catalogue opens on — rather than the value the rule happens to hold today.
   * The second assertion is what makes it fail if the fallback goes back to
   * being its own literal, which is how this broke: nothing noticed when the
   * catalogue moved off Intact and the wishlist did not.
   */
  it("reads a relic with no state as the state the catalogue opens on", () => {
    expect(idOf({ itemName: "Axi A20", kind: "relic" })).toBe(
      idOf({ itemName: "Axi A20", kind: "relic", refinement: DEFAULT_REFINEMENT }),
    );

    expect(idOf({ itemName: "Axi A20", kind: "relic" })).not.toBe(
      idOf({ itemName: "Axi A20", kind: "relic", refinement: "intact" }),
    );
  });

  /**
   * The one assertion in this file that names the value on purpose.
   *
   * Everything above is written in terms of `DEFAULT_REFINEMENT`, which is what
   * makes it a statement of the rule — and it is also what lets the constant
   * move to a third state with both suites still green, while
   * `WishlistService.DEFAULT_REFINEMENT` stays where it is and the two sides
   * start keying the same line differently. Java cannot import this constant,
   * so the pin is the literal: change one side and this goes red, which is the
   * prompt to change the other.
   */
  it("holds the literal the backend spells in WishlistService.DEFAULT_REFINEMENT", () => {
    expect(DEFAULT_REFINEMENT).toBe("radiant");
  });
});

/**
 * What happens to two lines that key the same.
 *
 * They are not a duplicate anyone typed twice. A relic line stored before the
 * catalogue moved off Intact carries no state, and `idOf` now reconstructs one
 * as Radiant — the key an explicit Radiant line already holds. Both quantities
 * were entered by the reader, so both survive; `WishlistServiceCoalesceTest` is
 * the same rule on the other side of the wire.
 */
describe("coalesce", () => {
  const relicLine = (refinement: Refinement | undefined, qty: number): WishlistEntry => ({
    itemName: "Axi A20",
    kind: "relic",
    tier: "axi",
    relicFullName: "Axi A20",
    refinement: refinement as Refinement,
    qty,
  });

  it("adds the quantities of two lines that resolve to one key", () => {
    const lines = coalesce([relicLine(undefined, 2), relicLine("radiant", 3)]);

    expect(lines).toHaveLength(1);
    expect(lines[0]?.qty).toBe(5);
  });

  it("keeps the state the key resolved to, so nothing is left to resolve", () => {
    expect(coalesce([relicLine(undefined, 1)])[0]?.refinement).toBe(DEFAULT_REFINEMENT);
  });

  it("keeps two states of one relic apart", () => {
    expect(coalesce([relicLine("intact", 2), relicLine("radiant", 3)])).toHaveLength(2);
  });

  it("leaves the input alone", () => {
    const original = [relicLine(undefined, 2), relicLine("radiant", 3)];
    coalesce(original);

    expect(original.map((line) => line.qty)).toEqual([2, 3]);
  });
});

/**
 * Where a relic's other quantities went.
 *
 * The Relics view lists every relic at one refinement, so a line made at
 * another one reads as 0 on the row that made it. The plan is stored and
 * reachable — this is what the row says instead of nothing.
 */
describe("otherStates", () => {
  const line = (
    itemName: string,
    kind: WishlistKind,
    refinement: Refinement,
    qty: number,
  ): WishlistEntry => ({ itemName, kind, tier: "axi", relicFullName: itemName, refinement, qty });

  it("reports the same relic wanted in another state", () => {
    const lines = [line("Axi A20", "relic", "intact", 2), line("Axi A20", "relic", "radiant", 1)];

    expect(otherStates(lines, "Axi A20", "radiant")).toEqual([{ refinement: "intact", qty: 2 }]);
  });

  it("says nothing about a kind that is not keyed on refinement", () => {
    const lines = [line("Volt Prime Neuroptics", "part", "intact", 2)];

    expect(otherStates(lines, "Volt Prime Neuroptics", "radiant")).toEqual([]);
  });

  it("says nothing when the only line is the one being asked about", () => {
    expect(otherStates([line("Axi A20", "relic", "radiant", 2)], "Axi A20", "radiant")).toEqual([]);
  });
});
