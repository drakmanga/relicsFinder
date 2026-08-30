import type { LifecycleMap, PrimePhase } from "../api/types";

/**
 * What a phase cell has to draw, and the words it draws.
 *
 * Same shape as `lib/trend` and for the same reason: one rule, read by four
 * surfaces, about a value that is absent for two unrelated causes. A set the
 * request has not brought back yet is a wait; a set the answer does not mention
 * is Kavasa Prime, and that is a verdict.
 */
export type PhaseCell =
  /** Nothing has landed yet. Draw a skeleton the size of the badge. */
  | { kind: "waiting" }
  | { kind: "phase"; phase: PrimePhase; releaseDate: string | null; vaultDate: string | null };

const WAITING: PhaseCell = { kind: "waiting" };

/**
 * The rule, and its last line is the one worth reading twice.
 *
 * A missing map is a request still in flight. A map that HAS landed and does
 * not name the set is the answer "nothing here knows", which reads exactly like
 * a set whose row says `unknown` — Kavasa Prime is in the relic catalogue and
 * not in the item database, so it can arrive either way depending on which end
 * of the join drops it, and a reader must not be shown two different cells for
 * one fact.
 */
export function phaseCell(lifecycle: LifecycleMap | undefined, setName: string | null): PhaseCell {
  if (!lifecycle) return WAITING;
  if (!setName) return { kind: "phase", phase: "unknown", releaseDate: null, vaultDate: null };

  const row = lifecycle.get(setName);
  if (!row) return { kind: "phase", phase: "unknown", releaseDate: null, vaultDate: null };

  return {
    kind: "phase",
    phase: row.phase,
    releaseDate: row.releaseDate,
    vaultDate: row.vaultDate,
  };
}

/**
 * Two or three words, in the vocabulary the app already uses.
 *
 * "Dropping" and "Vaulted" are the two words the relics table has always put in
 * its own farmability column, so a reader who has met them there meets them
 * here meaning the same thing. Inventing a third pair for the same fact would
 * be two glossaries for one idea.
 *
 * They are short because they sit inside a table row beside a set name. What
 * each one MEANS is the sentence below, and it is on the screen rather than in
 * a `title` — see `PHASE_MEANS`.
 */
export const PHASE_LABEL: Record<PrimePhase, string> = {
  dropping: "Dropping",
  "recently-vaulted": "Just vaulted",
  "long-vaulted": "Long vaulted",
  unknown: "Not dated",
};

/**
 * What the badge claims, and why, in the words of somebody who has never traded.
 *
 * Each one says the cause first and the consequence second, and the consequence
 * is hedged on purpose: "usually" is the honest word for a rule that held for
 * 83%, 85% and 87% of the sets it was measured over. A sentence promising the
 * price WILL fall would be wrong about one set in six, which is exactly often
 * enough to be believed.
 *
 * No "vault", no "unvault", no "Resurgence": every one of them is an in-game
 * word a reader who does not play cannot look up from here. What the sentences
 * say instead is what is physically true — the set does or does not still come
 * out of relics.
 */
export const PHASE_MEANS: Record<PrimePhase, string> = {
  dropping:
    "Still comes out of relics, so more of it reaches the market every day. Prices usually drift down while that lasts.",
  "recently-vaulted":
    "Stopped dropping from relics less than two years ago. What players already hold is the only supply, and prices usually climb.",
  "long-vaulted":
    "Stopped dropping from relics more than two years ago. Supply and demand have long since settled, and prices usually hold steady.",
  unknown:
    "Not dropping from relics, and nothing here records when it stopped, so its direction cannot be read.",
};

/**
 * The date under the sentence, or nothing.
 *
 * Only the two vaulted phases have a date worth showing: a set that is dropping
 * carries the date it was FIRST vaulted, which for the six sets currently back
 * in rotation is years in the past and says the opposite of what the badge does.
 * A release date is shown for those instead, which is a fact about the set that
 * nothing contradicts.
 */
/* The date is printed as the item database writes it, yyyy-MM-dd, rather than
   through a locale format. 10/12/2025 is two different days on two sides of an
   ocean and this app is one page shared by link; the ISO form is the one shape
   nobody has to guess at. */
export function phaseDate(cell: PhaseCell): { label: string; date: string } | null {
  if (cell.kind !== "phase") return null;

  if (cell.phase === "recently-vaulted" || cell.phase === "long-vaulted") {
    // Not "stopped dropping": the sentence beside it already opens with those
    // words, and the pair read in sequence said them twice.
    return cell.vaultDate ? { label: "Last dropped", date: cell.vaultDate } : null;
  }

  if (cell.phase === "dropping") {
    return cell.releaseDate ? { label: "Released", date: cell.releaseDate } : null;
  }

  return null;
}
