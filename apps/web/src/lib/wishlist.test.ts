import { describe, expect, it } from "vitest";

import { idOf } from "./wishlist";
import { DEFAULT_REFINEMENT } from "./rows";

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
});
