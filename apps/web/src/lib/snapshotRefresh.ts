import { useCallback, useEffect, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

import { api } from "../api/client";
import { keys } from "../api/queries";
import { LOADED_BY_RELOAD } from "./pageLoad";
import type { RefreshOutcome, RefreshView } from "../api/types";

/**
 * Asking the server to read its sources again, and saying what came of it.
 *
 * The three ranked views each answer one question with a figure, and until the
 * server gained this door none of those figures could be made newer from the
 * browser at all: the client cache is in memory with no persister, so a reload
 * genuinely refetched everything and got the same answer back, out of a
 * snapshot the backend was holding.
 */

/** Where the ask has got to. `idle` is the state before anybody has asked. */
export type RefreshState =
  | { phase: "idle" }
  | { phase: "asking" }
  | { phase: "answered"; outcome: RefreshOutcome }
  | { phase: "unreachable" };

/**
 * What the screen says, in plain language and on the screen itself.
 *
 * Pure and separate from the control, because what these four states MEAN is
 * worth a test and how they are drawn is not.
 *
 * Null only while nothing has been asked. Every other state says something:
 * a refresh that silently changed nothing is the failure this whole shape
 * exists to remove.
 */
export function refreshMessage(state: RefreshState, now: number = Date.now()): string | null {
  switch (state.phase) {
    case "idle":
      return null;

    // Named rather than left to a spinner. The wait is a round trip to two
    // other websites and can run to half a minute, and a sentence saying what
    // is being waited for is the only thing between that and reading as a hang.
    case "asking":
      return "Fetching the newest data. This can take a few seconds.";

    case "unreachable":
      return "Relic Finder is not answering. Try again in a moment.";

    case "answered":
      return answered(state.outcome, now);
  }
}

function answered(outcome: RefreshOutcome, now: number): string {
  switch (outcome.status) {
    case "refreshed":
      return "Updated. This is the newest data available.";

    // Not "please wait" and not an error. The data on screen is already what a
    // second fetch would have produced, so the honest sentence says that first
    // and treats the wait as a detail — and it names a time, because "try again
    // later" is the answer that sends somebody back to click again.
    case "already-current":
      return `This is already the newest data. You can check again ${inWords(
        Date.parse(outcome.nextRefreshAt) - now,
      )}.`;

    case "source-unavailable":
      return "The site this data comes from did not answer. What you see is the last copy that did.";
  }
}

/**
 * How long until it is worth asking again, in words.
 *
 * Rounded up, so the time it names is a time the answer will actually have
 * changed by. Zero or less is a clock that disagrees with the server's by more
 * than the window, which is rare and still has an honest answer.
 */
function inWords(ms: number): string {
  if (ms <= 0) return "now";

  const minutes = Math.ceil(ms / 60_000);
  return minutes === 1 ? "in a minute" : `in ${minutes} minutes`;
}

/**
 * What is thrown away once a view has actually been re-read.
 *
 * One list per SOURCE rather than per view, which is the same line the server
 * draws: Ducanetor and the Tier List rest on the same catalogue, so a refresh
 * asked for on one of them has made the other's copy old too. The ranking is
 * disabled behind another tab, so marking it costs nothing until somebody opens
 * it.
 *
 * `relics` leads the catalogue list because it is the query that says what
 * exists: the price batches are keyed by the list of names they were asked for,
 * so a Prime that has just arrived reaches the tables through this one.
 */
export function invalidatedBy(view: RefreshView): readonly (readonly unknown[])[] {
  // The offers and the clock beside them. Nothing else on the Endo tab is built
  // out of the market snapshot, and dropping six hundred prices to refresh
  // eleven sculptures would be a round trip nobody asked for.
  if (view === "endo") return [keys.endo, keys.endoStatus];

  return [keys.relics, keys.allItemPrices, keys.allTierLists, keys.marketStatus];
}

async function invalidate(queryClient: QueryClient, view: RefreshView): Promise<void> {
  // Awaited, so "asking" lasts until the newer numbers are on screen rather
  // than until the POST came back. A button that finishes before the table it
  // changed would be reporting on the request instead of on the data.
  await Promise.all(
    invalidatedBy(view).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

/**
 * Whether the reload this page load was is still owed an answer.
 *
 * Module scope on purpose: the reading is a fact about the document rather than
 * about a component, and exactly one view may act on it — whichever was in
 * front when the page loaded. Moving from Ducanetor to the Tier List after an
 * F5 must refresh nothing, because it is the same page load and the source
 * behind both was re-read a moment ago.
 *
 * It stops being owed either way after the first render, whether a ranked view
 * answered it or not — see `useReloadSpentAfterFirstRender` below.
 */
let reloadAnswered = false;

/**
 * Closes the window in which the reload still counts, after the first render.
 *
 * Called from the shell, and it works because React runs a parent's effects
 * AFTER its children's: whichever view was in front when the page loaded has
 * already had its chance to answer the reload by the time this runs, and every
 * control mounted after it belongs to a tab switch.
 *
 * Without it, a reload that landed on one of the four views with no refresh
 * control would leave the reading unspent, and the first ranked view the reader
 * clicked afterwards would refresh — a click on a tab costing the server a
 * re-read, which is exactly what the flag is here to stop.
 */
export function useReloadSpentAfterFirstRender(): void {
  useEffect(() => {
    reloadAnswered = true;
  }, []);
}

/**
 * Asks once, at mount, when the browser says this page load was a reload.
 *
 * The reading itself is taken at startup — see `LOADED_BY_RELOAD` — because
 * `performance` goes on answering "reload" for as long as the page is open, and
 * a view asking it on mount would call every later tab switch a reload too.
 */
function useReloadOnce(refresh: () => void): void {
  useEffect(() => {
    if (!LOADED_BY_RELOAD || reloadAnswered) return;

    // Set before the ask rather than after it: the flag is what makes the next
    // view to mount leave the source alone, and a refresh that takes twenty
    // seconds would otherwise leave a window in which a tab switch asks again.
    // It is also what absorbs the second mount React does in development.
    reloadAnswered = true;
    refresh();
  }, [refresh]);
}

/**
 * The ask, and where it has got to.
 *
 * One door for both gestures: a reload fires it at mount, the control fires it
 * on a click, and the server sees the same request either way. What the click
 * has that the reload does not is that the filters, the sort and any open panel
 * are still there afterwards.
 */
export function useSnapshotRefresh(view: RefreshView) {
  const queryClient = useQueryClient();
  /*
    "asking" from the first paint on a reload, rather than idle until the effect
    below gets round to it. Truthful — the ask is about to happen, and this is
    the one view that will make it — and it is what keeps the sentence from
    appearing a frame after the head was drawn without it, pushing the highlight
    cards and the table down. That shift is the one the reader did not ask for:
    every later one follows a click of their own.
  */
  const [state, setState] = useState<RefreshState>(() =>
    LOADED_BY_RELOAD && !reloadAnswered ? { phase: "asking" } : { phase: "idle" },
  );

  const refresh = useCallback(async () => {
    setState({ phase: "asking" });

    try {
      const outcome = await api.refresh(view);
      // Only a real re-read is worth dropping anything for. Inside the cooldown
      // the server fetched nothing, so refetching here would be a round trip to
      // be handed back the bytes the browser already has.
      if (outcome.status === "refreshed") await invalidate(queryClient, view);
      setState({ phase: "answered", outcome });
    } catch {
      setState({ phase: "unreachable" });
    }
  }, [queryClient, view]);

  useReloadOnce(refresh);

  return { state, refresh };
}
