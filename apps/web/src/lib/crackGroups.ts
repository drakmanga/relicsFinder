import type { Fissure } from "../api/types";
import type { CrackRow } from "./relicCrack";

/**
 * The ranking regrouped by where to go: one block per fissure, the relics to
 * open there under it, and the ones to keep at the end.
 *
 * A regrouping and never a re-ranking: every row keeps its own figures, and a
 * relic sits in one block only, the one for its best fissure, so no relic is
 * counted twice when it could also open in an Omnia fissure.
 */

export type CrackGroup =
  | { key: string; kind: "fissure"; fissure: Fissure; rows: CrackRow[] }
  | { key: string; kind: "wait" | "unpriced"; rows: CrackRow[] };

/**
 * Blocks in the order of their best relic, since the rows come in ranked:
 * the fissure the top relic points to comes first, and inside a block the
 * rows keep their ranked order, which there is the order of their value.
 */
export function groupCrack(rows: readonly CrackRow[]): CrackGroup[] {
  const byFissure = new Map<string, CrackGroup & { kind: "fissure" }>();
  const wait: CrackRow[] = [];
  const unpriced: CrackRow[] = [];

  for (const row of rows) {
    if (row.verdict === "open" && row.best) {
      const { fissure } = row.best;
      const group = byFissure.get(fissure.id);
      if (group) group.rows.push(row);
      else byFissure.set(fissure.id, { key: fissure.id, kind: "fissure", fissure, rows: [row] });
    } else if (row.verdict === "unpriced") {
      unpriced.push(row);
    } else {
      wait.push(row);
    }
  }

  const groups: CrackGroup[] = [...byFissure.values()];
  if (wait.length > 0) groups.push({ key: "wait", kind: "wait", rows: wait });
  if (unpriced.length > 0) groups.push({ key: "unpriced", kind: "unpriced", rows: unpriced });
  return groups;
}

/** One line of the drawn list: a block's heading, or a relic under it. */
export type CrackLine =
  | { key: string; kind: "head"; group: CrackGroup }
  | { key: string; kind: "row"; row: CrackRow; grouped: boolean };

/**
 * The list the virtualiser draws, flat: a heading is one more line, measured
 * like the rows, so both views scroll through the same machinery.
 */
export function crackLines(rows: readonly CrackRow[], byFissure: boolean): CrackLine[] {
  if (!byFissure) return rows.map((row) => ({ key: row.key, kind: "row", row, grouped: false }));

  return groupCrack(rows).flatMap((group): CrackLine[] => [
    { key: `head|${group.key}`, kind: "head", group },
    ...group.rows.map((row): CrackLine => ({ key: row.key, kind: "row", row, grouped: true })),
  ]);
}

/**
 * What the relics to open now add up to: lines, copies, and what opening
 * every copy is expected to pay. Every copy rather than one of each: the
 * question it answers is what the relics held are worth cracking right now.
 */
export function openSummary(rows: readonly CrackRow[]) {
  return rows
    .filter((row) => row.verdict === "open")
    .reduce(
      (sum, row) => ({
        lines: sum.lines + 1,
        copies: sum.copies + row.relic.quantity,
        value: sum.value + row.value * row.relic.quantity,
        ducats: sum.ducats + row.ducats * row.relic.quantity,
      }),
      { lines: 0, copies: 0, value: 0, ducats: 0 },
    );
}
