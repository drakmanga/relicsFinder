import { describe, expect, it } from "vitest";

import {
  ALL_TIER_SORTS,
  DEFAULT_TIER_SORT,
  RADSHARE_PLAYERS,
  sortTierRows,
  topOfRanking,
} from "./tierList";
import type { TierListRow } from "../api/types";

/**
 * What is left of this file, and why the rest of it went.
 *
 * The ranking itself — the medians, the six band letters, the two columns and
 * the ninety-day movement — is computed by `TierListService` on the backend
 * since brief-020, and every case that used to be here is now in
 * `TierListServiceTest`, `TierListBandsTest`, `TierListTrendTest` and
 * `TierListPayloadTest`, including the captured payload those numbers were
 * asserted against. Keeping a copy of them here would have meant keeping a copy
 * of the arithmetic, which is the one thing that move was made to stop.
 *
 * What remains is the browser's own: the order the reader asks for, and the
 * podium above the table. Neither is arithmetic and neither leaves this screen
 * — a sort is a click, and a click that went to the server would put a round
 * trip under every header.
 */

/** A row as the endpoint sends it, with only the fields a sort reads set. */
const row = (
  relicFullName: string,
  soloValue: number,
  relicPrice: number | null = null,
): TierListRow => ({
  relicFullName,
  tier: "lith",
  soloValue,
  // Three times the solo value, which is about what a squad of four pays: the
  // two columns have to be able to disagree, and here they must not, so that a
  // test about ordering is about ordering.
  radshareValue: soloValue * 3,
  soloLetter: null,
  radshareLetter: null,
  relicPrice,
  trend: "no-baseline",
});

const names = (rows: TierListRow[]) => rows.map((current) => current.relicFullName);

describe("the order the view asks for", () => {
  /**
   * Four relics worth 10, 100, 5 and 10 — the last of them tied with the first,
   * since a tie is the normal case on a catalogue where 327 relics sit between
   * 4p and 6p. In name order, which is the order the endpoint is asked for them
   * in.
   */
  const rows = [row("Lith A1", 10), row("Lith A2", 100), row("Lith A3", 5), row("Lith A4", 10)];

  /** The same four, with two of them carrying a listing of their own. */
  const priced = [
    row("Lith A1", 10, 3),
    row("Lith A2", 100, null),
    row("Lith A3", 5, 8),
    row("Lith A4", 10, null),
  ];

  it("leaves the name order exactly as it arrived", () => {
    expect(names(sortTierRows(rows, { column: "relic", direction: "asc" }))).toEqual([
      "Lith A1",
      "Lith A2",
      "Lith A3",
      "Lith A4",
    ]);
  });

  it("puts the most valuable relic first in either value column", () => {
    expect(names(sortTierRows(rows, { column: "solo", direction: "desc" }))).toEqual([
      "Lith A2",
      "Lith A1",
      "Lith A4",
      "Lith A3",
    ]);
    expect(names(sortTierRows(rows, { column: "radshare", direction: "desc" }))[0]).toBe("Lith A2");
  });

  it("sinks a relic nobody has listed below every relic that has a price", () => {
    // A2 is the most valuable relic to open and one of the two with no listing:
    // if an absent price were read as zero it would sort like a cheap relic,
    // which is a claim about a number nobody has.
    expect(names(sortTierRows(priced, { column: "price", direction: "desc" }))).toEqual([
      "Lith A3",
      "Lith A1",
      "Lith A2",
      "Lith A4",
    ]);
  });

  it("breaks a tie on the name, because most of the catalogue is a tie", () => {
    // A1 and A4 are worth the same 10p solo. The rows arrive in name order and
    // the sort is stable, so they stay in it rather than swapping about as the
    // prices tick.
    const tied = sortTierRows(rows, { column: "solo", direction: "desc" }).filter(
      (current) => current.soloValue === 10,
    );

    expect(names(tied)).toEqual(["Lith A1", "Lith A4"]);
  });

  it("shows the ranking when nothing is sorted", () => {
    // Off on this table is not the order it arrived in, it is the ranking the
    // tab exists for: the third click on a header lands back where arriving on
    // the tab does.
    expect(names(sortTierRows(rows, null))).toEqual(
      names(sortTierRows(rows, { column: DEFAULT_TIER_SORT, direction: "desc" })),
    );
  });

  it("points a value column the other way when asked", () => {
    // The direction used to be fixed per column, so the least valuable relic
    // was unreachable. A1 and A4 tie at 10p and keep their name order.
    expect(names(sortTierRows(rows, { column: "solo", direction: "asc" }))).toEqual([
      "Lith A3",
      "Lith A1",
      "Lith A4",
      "Lith A2",
    ]);
  });

  it("reverses the name column too", () => {
    expect(names(sortTierRows(rows, { column: "relic", direction: "desc" }))).toEqual([
      "Lith A4",
      "Lith A3",
      "Lith A2",
      "Lith A1",
    ]);
  });

  it("does not disturb the list it was given", () => {
    // The rows are the query's own data, re-sorted on every click; sorting in
    // place would reorder the array React Query is holding.
    sortTierRows(rows, { column: "solo", direction: "desc" });

    expect(names(rows)).toEqual(["Lith A1", "Lith A2", "Lith A3", "Lith A4"]);
  });
});

describe("the podium above the table", () => {
  /** Four relics worth 100, 10, 8 and 5, all different: a podium has an order. */
  const rows = [
    row("Lith A1", 10, 3),
    row("Lith A2", 100),
    row("Lith A3", 5, 8),
    row("Lith A4", 8),
  ];

  it("names the three best of the population, by the column the view opens on", () => {
    expect(names(topOfRanking(rows, 3))).toEqual(["Lith A2", "Lith A1", "Lith A4"]);
  });

  it("stands still under every sort the table offers, in both directions", () => {
    // The defect this closes: the cards were the head of the sorted list, so a
    // second click on a header put the three WORST relics on a podium still
    // numbered 1, 2, 3. The sorted list is passed in here because that is the
    // list the cards used to be taken from.
    const podium = names(topOfRanking(rows, 3));

    for (const column of ALL_TIER_SORTS) {
      for (const direction of ["asc", "desc"] as const) {
        expect(names(topOfRanking(sortTierRows(rows, { column, direction }), 3))).toEqual(podium);
      }
    }
  });

  it("moves with the population, which the endpoint decides and a sort does not", () => {
    // The population is a request rather than a click: it changes which relics
    // are in the ranking at all and moves both medians with it, so the cards
    // move with it too. A card naming a relic absent from the table under it
    // would be worse than one that moves.
    const farmable = rows.filter((current) => current.relicFullName !== "Lith A2");

    expect(names(topOfRanking(farmable, 3))).toEqual(["Lith A1", "Lith A4", "Lith A3"]);
  });
});

describe("what this screen says about a radshare", () => {
  it("says the squad size the ranking is computed at", () => {
    // Wording on this side, arithmetic on the other: the number the radshare
    // column is actually computed at is `players` on the response, pinned to
    // four by TierListServiceTest. A paragraph here that disagreed with the
    // column under it would be the drift this whole move was made to stop.
    expect(RADSHARE_PLAYERS).toBe(4);
  });
});
