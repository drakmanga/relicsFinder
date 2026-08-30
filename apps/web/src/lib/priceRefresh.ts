import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { keys } from "../api/queries";

/**
 * How long a tab waits between two re-reads of the prices, at the fastest.
 *
 * The marker moves whenever any of 1.500 prices changes, which the warmer does
 * a few times a minute; without a floor an open tab would fetch six hundred
 * prices every time the status poll noticed. Five minutes is well inside the
 * hourly interval the fastest-moving parts are read on server-side, so nothing
 * the ranking depends on is waited for twice.
 */
export const REFRESH_FLOOR_MS = 5 * 60_000;

/**
 * Whether the prices on screen are worth fetching again.
 *
 * `seen` is the marker this tab last acted on, and null means it has not seen
 * one yet — the first status answer adopts the number without fetching
 * anything, because the prices that arrived alongside it are that number's own
 * answer.
 *
 * The floor is checked last and deliberately does not update `seen`: a change
 * held back by it is still a change, and the next poll picks it up rather than
 * losing it.
 */
export function shouldRefetchPrices(
  seen: number | null,
  revision: number | undefined,
  lastRefreshedAt: number,
  now: number,
): boolean {
  if (revision === undefined || seen === null) return false;
  if (revision === seen) return false;
  return now - lastRefreshedAt >= REFRESH_FLOOR_MS;
}

/**
 * Re-reads the prices when the server says one of them moved.
 *
 * The tab used to go stale in silence. Both price queries stop polling once
 * their batch is complete and the client does not refetch on focus, so a
 * backend that re-read three times in a day reached a tab open since morning
 * zero times — and the Tier List, whose whole subject is the ORDER of the
 * relics, went on showing the order the morning had.
 *
 * A poll that spends a request every N minutes to learn there is nothing new
 * would be a cost rather than an answer, so this spends none: it reads the
 * marker off the status query the freshness label already makes once a minute,
 * and only when that marker moves does anything get fetched.
 *
 * @param revision the marker from `/api/market/status`
 * @param polledAt when that answer arrived — the beat this runs on
 */
export function usePriceRefresh(revision: number | undefined, polledAt: number) {
  const queryClient = useQueryClient();
  // Refs rather than state: nothing here is drawn, and a re-render on every
  // poll is exactly what this is meant to avoid.
  const seen = useRef<number | null>(null);
  const lastRefreshedAt = useRef(0);

  useEffect(() => {
    if (revision === undefined) return;

    if (shouldRefetchPrices(seen.current, revision, lastRefreshedAt.current, Date.now())) {
      seen.current = revision;
      lastRefreshedAt.current = Date.now();
      // Both batches, because a relic's own price and the parts inside it are
      // two queries and one screen. Prefixes, because each carries the list of
      // names it was asked for — see `keys`.
      void queryClient.invalidateQueries({ queryKey: keys.allItemPrices });
      void queryClient.invalidateQueries({ queryKey: keys.allRelicPrices });
      return;
    }

    // The first marker this tab ever sees is adopted rather than acted on.
    if (seen.current === null) seen.current = revision;
    // `polledAt` is a dependency and not a value: it changes on every status
    // answer, which is what gives a change held back by the floor a later
    // chance to be acted on.
  }, [revision, polledAt, queryClient]);
}
