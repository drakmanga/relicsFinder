import { describe, expect, it } from "vitest";

import { invalidatedBy, refreshMessage, type RefreshState } from "./snapshotRefresh";
import { keys } from "../api/queries";
import type { RefreshOutcome } from "../api/types";

const NOW = Date.parse("2026-09-12T10:00:00Z");

const answered = (
  status: RefreshOutcome["status"],
  nextRefreshAt = "2026-09-12T10:15:00Z",
): RefreshState => ({
  phase: "answered",
  outcome: { view: "ducats", status, nextRefreshAt },
});

describe("refreshMessage", () => {
  it("says nothing before anybody has asked", () => {
    expect(refreshMessage({ phase: "idle" }, NOW)).toBeNull();
  });

  it("says what is being waited for, so a long fetch does not read as a hang", () => {
    expect(refreshMessage({ phase: "asking" }, NOW)).toContain("a few seconds");
  });

  it("reports a real re-read", () => {
    expect(refreshMessage(answered("refreshed"), NOW)).toContain("newest data available");
  });

  /** The sentence a refusal produces is the whole reason the cooldown is bearable. */
  it("says the data is already current rather than that the ask failed", () => {
    const message = refreshMessage(answered("already-current"), NOW);

    expect(message).toContain("already the newest data");
    expect(message).toContain("in 15 minutes");
  });

  it("counts the wait in whole minutes, rounded up", () => {
    const message = refreshMessage(answered("already-current", "2026-09-12T10:00:30Z"), NOW);

    expect(message).toContain("in a minute");
  });

  /** A clock further out of step than the window is rare and still has an answer. */
  it("says now when the window has already passed", () => {
    const message = refreshMessage(answered("already-current", "2026-09-12T09:59:00Z"), NOW);

    expect(message).toContain("check again now");
  });

  it("says the previous copy still stands when the source is down", () => {
    expect(refreshMessage(answered("source-unavailable"), NOW)).toContain("the last copy that did");
  });

  it("says the server is not answering when the request never landed", () => {
    expect(refreshMessage({ phase: "unreachable" }, NOW)).toContain("not answering");
  });
});

describe("invalidatedBy", () => {
  /**
   * Eleven sculptures must not cost six hundred prices a round trip: the Endo
   * tab is built from its own query and nothing else.
   */
  it("drops only the offers and their clock on the Endo tab", () => {
    expect(invalidatedBy("endo")).toEqual([keys.endo, keys.endoStatus]);
  });

  it("drops the catalogue first on the views built from it", () => {
    expect(invalidatedBy("ducats")[0]).toEqual(keys.relics);
  });

  /**
   * One list per source, not per view. Ducanetor and the Tier List rest on the
   * same catalogue, so a refresh asked for on one has made the other's copy old.
   */
  it("treats Ducanetor and the Tier List as the one source they are", () => {
    expect(invalidatedBy("ducats")).toEqual(invalidatedBy("tiers"));
  });

  it("reaches the ranking, which the server rebuilds from the same catalogue", () => {
    expect(invalidatedBy("tiers")).toContainEqual(keys.allTierLists);
  });
});
