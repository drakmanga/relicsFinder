import type { TierListRow } from "../api/types";
import type { SortState } from "./sorting";

/**
 * The squad a radshare is, as this screen says it: four players, four relics,
 * one reward kept.
 *
 * Wording only. The number the radshare column is actually computed at is
 * `players` on the response, and the reason it is four — a fixed comparison
 * against the solo column rather than a calculator — is written down where the
 * arithmetic is, in `TierListService.RADSHARE_PLAYERS`. Kept as a constant here
 * because four sentences on this tab say it, the primer says it before any
 * response has arrived, and a paragraph that disagreed with the column under it
 * would be worse than one that is late.
 */
export const RADSHARE_PLAYERS = 4;

/**
 * What the reader can rank the table by.
 *
 * The letters are the answer this tab exists to give, and neither column is
 * the answer on its own — so the ranking is a control rather than a fixed
 * order, and which one is in force is part of the shared link.
 */
export const ALL_TIER_SORTS = ["solo", "radshare", "price", "relic"] as const;

export type TierSortColumn = (typeof ALL_TIER_SORTS)[number];

/**
 * Solo Intact, not the relic name.
 *
 * A tier list that opens in alphabetical order has to be sorted before it
 * answers anything, and the three cards above the table would read "Axi A1,
 * Axi A2, Axi A3". Solo Intact rather than the radshare column because it is
 * the state every relic is already in — refining costs a hundred void traces
 * and a squad of four costs three other people — so it describes the relics as
 * they sit in the inventory. The other column is one click away.
 *
 * Typed without `"relic"` rather than as a bare `TierSortColumn`, because the
 * paragraph above is a rule and not a preference: the view has to open on a
 * ranking. That also lets the highlight cards fall back to this constant when
 * the table is sorted by name, instead of repeating the same choice as a
 * literal beside it.
 */
export const DEFAULT_TIER_SORT: Exclude<TierSortColumn, "relic"> = "solo";

/** What each column is called, in the header and on the cards. */
export const TIER_SORT_LABEL: Record<TierSortColumn, string> = {
  solo: "Solo, Intact",
  radshare: "Radshare, Radiant",
  price: "Relic price",
  relic: "Relic",
};

/** The number each ranking column reads. Null is an absent number, not a zero. */
const TIER_SORT_VALUE: Record<
  Exclude<TierSortColumn, "relic">,
  (row: TierListRow) => number | null
> = {
  solo: (row) => row.soloValue,
  radshare: (row) => row.radshareValue,
  price: (row) => row.relicPrice,
};

/** What this view is sorted by, or nothing — see `sortTierRows` for what nothing means here. */
export type TierSortState = SortState<TierSortColumn>;

/**
 * The rows in the order the reader asked for, or in the ranking when they have
 * asked for nothing.
 *
 * Off is `DEFAULT_TIER_SORT` descending, which is the ranking the tab exists to
 * show — so the third click on a header lands somewhere the reader actually
 * wanted to be, rather than on a list of relics in the order they were built
 * in. It also means arriving on the tab fresh and clicking a header three times
 * are the same screen, which is what makes the cycle safe to try.
 *
 * The direction used to be fixed per column, on the grounds that this view had
 * two URL keys and nowhere to write one down. It has somewhere now: see
 * `toSortParam`.
 *
 * Ties keep the order they arrived in, which is by name: `Array.sort` is
 * stable, and 327 relics sit between 4p and 6p, so the tie is the normal case
 * rather than the edge one.
 */
export function sortTierRows(rows: TierListRow[], sort: TierSortState): TierListRow[] {
  const { column, direction } = sort ?? { column: DEFAULT_TIER_SORT, direction: "desc" as const };

  // The rows arrive in name order — the tab asks the endpoint for them that way
  // — so re-sorting a sorted list with `localeCompare` on every comparison is
  // 772 rows of work to end up where it started. `TierListService` sorts names
  // the same way this does: Axi A2 before Axi A10.
  if (column === "relic" && direction === "asc") return rows;

  if (column === "relic") {
    return [...rows].sort((a, b) =>
      b.relicFullName.localeCompare(a.relicFullName, "en", { numeric: true }),
    );
  }

  const valueOf = TIER_SORT_VALUE[column];
  const sign = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);

    // A relic nobody has listed sinks below every relic that has a number,
    // whichever way the column points — it is unknown, not worthless.
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;

    return (left - right) * sign;
  });
}

/**
 * The three best relics in the population, and not the head of what is on screen.
 *
 * Always `DEFAULT_TIER_SORT` descending, whatever column the table is sorted by
 * and whichever way its arrow points. The cards used to be the head of the
 * sorted list "so the two cannot disagree about what top three means", which
 * read the arrow as a question about the whole page. It is not: it reorders a
 * table, and a second click on a header put the three WORST relics on a podium
 * still numbered 1, 2, 3 — the app asserting a rank that is not true, with
 * nothing on screen to tell the two states apart.
 *
 * One fixed column also fixes the figure on the cards: they carry the number
 * they are ranked by and never the sorted column's own.
 *
 * The population is the one thing that still moves them, and it is not a sort:
 * it decides which relics are in the running at all, and it already re-bands
 * every letter by moving both medians. A card naming a relic absent from the
 * table under it would be worse than one that moves.
 */
export function topOfRanking(rows: TierListRow[], count: number): TierListRow[] {
  return sortTierRows(rows, { column: DEFAULT_TIER_SORT, direction: "desc" }).slice(0, count);
}
