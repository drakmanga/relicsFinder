import { describe, expect, it } from "vitest";

import { PRIMER_DEFAULT_OPEN, primerOpenFrom } from "./primerMemory";

describe("primerOpenFrom", () => {
  it("opens on a first visit, when this browser has stored nothing", () => {
    expect(primerOpenFrom(null)).toBe(true);
    expect(PRIMER_DEFAULT_OPEN).toBe(true);
  });

  it("keeps the fold a reader chose, in both directions", () => {
    expect(primerOpenFrom(JSON.stringify({ open: false }))).toBe(false);
    expect(primerOpenFrom(JSON.stringify({ open: true }))).toBe(true);
  });

  it("treats storage it cannot read as a first visit", () => {
    // Hand-edited, half-migrated, or written by a future version: none of it is
    // a reason to show a reader an empty section or to crash the tab.
    expect(primerOpenFrom("{not json")).toBe(true);
    expect(primerOpenFrom("null")).toBe(true);
    expect(primerOpenFrom("42")).toBe(true);
    expect(primerOpenFrom(JSON.stringify({ open: "false" }))).toBe(true);
    expect(primerOpenFrom(JSON.stringify({}))).toBe(true);
  });
});
