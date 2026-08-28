import { describe, expect, it } from "vitest";

import { fromSortParam, nextSortState, openingDirection, toSortParam } from "./sorting";
import { ALL_RELIC_SORTS, type RelicSortColumn } from "./rows";
import { ALL_TIER_SORTS, type TierSortColumn } from "./tierList";

describe("nextSortState", () => {
  it("takes three clicks to come back to where it started", () => {
    // The whole rule, on one column. Before this the Relics table flipped
    // between two of these forever and the Tier List only ever reached the
    // first, so neither could be put back.
    const first = nextSortState<RelicSortColumn>(null, "expected");
    const second = nextSortState(first, "expected");
    const third = nextSortState(second, "expected");

    expect(first).toEqual({ column: "expected", direction: "desc" });
    expect(second).toEqual({ column: "expected", direction: "asc" });
    expect(third).toBeNull();
  });

  it("opens a name at A and a number at its largest", () => {
    expect(nextSortState<RelicSortColumn>(null, "relic")).toEqual({
      column: "relic",
      direction: "asc",
    });
    expect(nextSortState<TierSortColumn>(null, "solo")).toEqual({
      column: "solo",
      direction: "desc",
    });
  });

  it("starts a different column's cycle rather than continuing this one's", () => {
    // A header that inherited the previous column's direction would mean the
    // same click gave a different answer depending on where the reader had
    // been.
    const ascending = { column: "solo", direction: "asc" } as const;

    expect(nextSortState<TierSortColumn>(ascending, "radshare")).toEqual({
      column: "radshare",
      direction: "desc",
    });
  });

  it("is the same rule for both tables", () => {
    // The reason the rule is in one file: the two tables used to answer this
    // differently, and the next sortable table would have been a third answer.
    for (const column of [...ALL_RELIC_SORTS, ...ALL_TIER_SORTS]) {
      const opening = openingDirection(column);
      const first = nextSortState<string>(null, column);
      const second = nextSortState(first, column);

      expect(first).toEqual({ column, direction: opening });
      expect(second?.direction).toBe(opening === "asc" ? "desc" : "asc");
      expect(nextSortState(second, column)).toBeNull();
    }
  });
});

describe("the sort in a link", () => {
  it("round trips every column, both ways, on both tables", () => {
    for (const column of ALL_TIER_SORTS) {
      for (const direction of ["asc", "desc"] as const) {
        const state = { column, direction };

        expect(fromSortParam(toSortParam(state), ALL_TIER_SORTS)).toEqual(state);
      }
    }
  });

  it("writes nothing at all for a table nobody has sorted", () => {
    expect(toSortParam(null)).toBeNull();
  });

  it("reads a bare column as that column at its opening direction", () => {
    // Links written before the direction was carried say only the column.
    expect(fromSortParam("solo", ALL_TIER_SORTS)).toEqual({ column: "solo", direction: "desc" });
    expect(fromSortParam("relic", ALL_TIER_SORTS)).toEqual({ column: "relic", direction: "asc" });
  });

  it("refuses a column the table does not have", () => {
    expect(fromSortParam("ducats:desc", ALL_TIER_SORTS)).toBeNull();
    expect(fromSortParam("solo:desc", ALL_RELIC_SORTS)).toBeNull();
    expect(fromSortParam("", ALL_TIER_SORTS)).toBeNull();
  });
});
