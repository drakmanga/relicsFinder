/**
 * How a sortable header behaves, for every table that has one.
 *
 * Two tables sort — Relics and the Tier List — and they used to disagree about
 * what a header does: Relics flipped between two directions and never let go,
 * the Tier List only ever selected which column was sorted and hardcoded the
 * direction per column. Both drew the same two-way glyph, and neither could get
 * back to the order the table opens on. On the Tier List that order IS the
 * ranking the tab exists for, so ordering by relic name to find something
 * appeared to lose the tab.
 *
 * The rule lives here rather than in either table so the next sortable table
 * cannot invent a third behaviour.
 */

/**
 * Which way a sorted column points.
 *
 * Two values and not three: "off" is the absence of a sorted column rather than
 * a third direction for one, which is what `SortState` says by being null.
 */
export type SortDirection = "asc" | "desc";

/**
 * A column and the way it points, or nothing at all.
 *
 * Null is the third state and it is not "sorted by nothing": it is the order
 * the table has when nobody has touched a header. What that order is belongs to
 * the table — the ranking on the Tier List, relic name ascending on Relics —
 * which is why this type says null and each table says what null means.
 */
export type SortState<Column extends string> = {
  column: Column;
  direction: SortDirection;
} | null;

/**
 * The column both tables sort by name rather than by a number.
 *
 * Named once because the opening direction below turns on it, and both tables
 * happen to call their name column the same thing.
 */
const NAME_COLUMN = "relic";

/**
 * Which way a column points on its first click.
 *
 * A name starts at A and a number starts at its largest: nobody asks for the
 * least valuable relic first. This is the rule the Relics table already opened
 * every column on, kept rather than replaced — the cycle below adds a third
 * state, it does not re-argue where the first one points.
 */
export const openingDirection = (column: string): SortDirection =>
  column === NAME_COLUMN ? "asc" : "desc";

/** The other one. */
const opposite = (direction: SortDirection): SortDirection =>
  direction === "asc" ? "desc" : "asc";

/**
 * The state one click on `column` produces.
 *
 * Three states per column, in the order the click reaches them: the column's
 * own opening direction, then its opposite, then off. Clicking a different
 * column starts that column's cycle rather than continuing this one's — a
 * header that inherited the previous column's direction would mean the same
 * click gave a different answer depending on where the reader had been.
 */
export function nextSortState<Column extends string>(
  current: SortState<Column>,
  column: Column,
): SortState<Column> {
  const opening = openingDirection(column);

  if (current === null || current.column !== column) return { column, direction: opening };
  if (current.direction === opening) return { column, direction: opposite(opening) };

  return null;
}

/**
 * The state as one URL value, or null where there is nothing to write.
 *
 * One key holding both halves rather than a second key beside it: they are one
 * choice, and a link carrying a column with no direction — or a direction with
 * no column — describes a state no click can produce.
 */
export function toSortParam<Column extends string>(state: SortState<Column>): string | null {
  return state === null ? null : `${state.column}:${state.direction}`;
}

/**
 * The reverse, refusing anything the table's own controls could not reach.
 *
 * A bare column with no direction is read as that column at its opening
 * direction, which is what links written before the direction existed carry:
 * `tsort=solo` meant "sorted by solo, descending" then and means the same now.
 */
export function fromSortParam<Column extends string>(
  raw: string | null,
  allowed: readonly Column[],
): SortState<Column> {
  if (!raw) return null;

  const [column, direction] = raw.split(":");
  if (!(allowed as readonly string[]).includes(column ?? "")) return null;

  return {
    column: column as Column,
    direction: direction === "asc" || direction === "desc" ? direction : openingDirection(column!),
  };
}
