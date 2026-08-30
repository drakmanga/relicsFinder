import { describe, expect, it } from "vitest";

import { PHASE_LABEL, PHASE_MEANS, phaseCell, phaseDate } from "./lifecycle";
import type { LifecycleMap, PrimeLifecycle, PrimePhase } from "../api/types";

function map(...rows: PrimeLifecycle[]): LifecycleMap {
  return new Map(rows.map((row) => [row.setName, row]));
}

const VOLT: PrimeLifecycle = {
  setName: "Volt Prime",
  phase: "dropping",
  releaseDate: "2016-11-11",
  vaultDate: "2018-05-17",
};

const WISP: PrimeLifecycle = {
  setName: "Wisp Prime",
  phase: "recently-vaulted",
  releaseDate: "2023-05-24",
  vaultDate: "2025-05-21",
};

describe("phaseCell", () => {
  it("waits while the request is still in flight", () => {
    expect(phaseCell(undefined, "Volt Prime")).toEqual({ kind: "waiting" });
  });

  it("answers with the row's phase and both its dates", () => {
    expect(phaseCell(map(VOLT), "Volt Prime")).toEqual({
      kind: "phase",
      phase: "dropping",
      releaseDate: "2016-11-11",
      vaultDate: "2018-05-17",
    });
  });

  /**
   * A landed answer that does not mention the set is a verdict, not a wait.
   *
   * Kavasa Prime is in the relic catalogue and not in the item database, so it
   * can reach the browser either as a row saying `unknown` or as no row at all,
   * depending on which end of the join drops it. One fact must not draw two
   * different cells.
   */
  it("reads a set the answer does not mention as unknown, not as waiting", () => {
    expect(phaseCell(map(VOLT), "Kavasa Prime")).toEqual({
      kind: "phase",
      phase: "unknown",
      releaseDate: null,
      vaultDate: null,
    });
  });

  it("reads a part that belongs to no set the same way", () => {
    expect(phaseCell(map(VOLT), null)).toEqual({
      kind: "phase",
      phase: "unknown",
      releaseDate: null,
      vaultDate: null,
    });
  });
});

describe("phaseDate", () => {
  /**
   * The load-bearing one: a dropping set never shows its vault date.
   *
   * Volt Prime is in the drop tables today and carries 2018-05-17, the day it
   * was first vaulted. Printing that under a badge reading "Dropping" would put
   * a date on screen that says the opposite of the badge above it — and six
   * sets are in exactly that state.
   */
  it("shows a dropping set its release date and never its vault date", () => {
    expect(phaseDate(phaseCell(map(VOLT), "Volt Prime"))).toEqual({
      label: "Released",
      date: "2016-11-11",
    });
  });

  it("shows a vaulted set when it stopped dropping", () => {
    expect(phaseDate(phaseCell(map(WISP), "Wisp Prime"))).toEqual({
      label: "Stopped dropping",
      date: "2025-05-21",
    });
  });

  it("shows nothing for a set nothing is dated", () => {
    expect(phaseDate(phaseCell(map(WISP), "Kavasa Prime"))).toBeNull();
    expect(phaseDate({ kind: "waiting" })).toBeNull();
  });

  /** A never-vaulted set that somehow reads vaulted still prints no date. */
  it("shows nothing rather than an empty date", () => {
    const dateless = map({ ...WISP, vaultDate: null });
    expect(phaseDate(phaseCell(dateless, "Wisp Prime"))).toBeNull();
  });
});

describe("the words", () => {
  const PHASES: PrimePhase[] = ["dropping", "recently-vaulted", "long-vaulted", "unknown"];

  it("gives every phase a label and a sentence", () => {
    for (const phase of PHASES) {
      expect(PHASE_LABEL[phase]).toBeTruthy();
      expect(PHASE_MEANS[phase]).toBeTruthy();
    }
  });

  /**
   * No in-game word a reader who does not play could not look up from here.
   *
   * AGENTS.md forbids unexplained Warframe jargon on screen. "Vaulted" survives
   * in the two short labels because the relics table has always used it and the
   * primer defines it; the sentences that do the explaining may not lean on it,
   * or the explanation is circular.
   */
  it("explains the phases without leaning on in-game vocabulary", () => {
    for (const phase of PHASES) {
      expect(PHASE_MEANS[phase].toLowerCase()).not.toMatch(/vault|resurgence|varzia|prime access/);
    }
  });
});
