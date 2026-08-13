import { useEffect, useRef, useState } from "react";

import { PRICE_RESIDUE } from "../api/queries";

/** One reading of the counter: how many prices were in, and when. */
export interface Sample {
  /** Milliseconds, from the same clock throughout — `Date.now()`. */
  at: number;
  priced: number;
  /** The batch this reading was taken against, so a new one can be spotted. */
  total: number;
}

/**
 * Readings kept for the estimate.
 *
 * The counter moves once every fifteen seconds, so eight samples is about two
 * minutes of history: long enough that one slow poll does not swing the answer,
 * short enough that the estimate follows a queue that is genuinely speeding up
 * or slowing down rather than averaging over the whole session.
 */
const WINDOW = 8;

/** Below this the two readings are too close together to divide by. */
const MIN_SPAN_MS = 5_000;

/**
 * How long the batch has left, in milliseconds, or null if it cannot be said.
 *
 * Null is a real answer and is used often: at the start there is one reading and
 * no rate, and near the end the rate can fall to zero for a poll or two. Showing
 * nothing is better than showing a number that was made up — a wrong estimate is
 * worse than no estimate, because it is the one thing the reader will plan
 * around.
 *
 * The finish line is not every price. The poll behind this stops once the
 * missing share drops under {@link PRICE_RESIDUE}, because the parts nobody
 * sells never arrive, so the target is the point where the waiting actually
 * ends and not the point where the counter would read full.
 */
export function etaMs(samples: Sample[], total: number): number | null {
  if (samples.length < 2 || total <= 0) return null;

  // noUncheckedIndexedAccess is on, and the length check above is not something
  // the compiler carries into the lookups.
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return null;

  const span = last.at - first.at;
  const gained = last.priced - first.priced;
  if (span < MIN_SPAN_MS || gained <= 0) return null;

  const target = total * (1 - PRICE_RESIDUE);
  const remaining = target - last.priced;
  if (remaining <= 0) return null;

  return (remaining / gained) * span;
}

/**
 * The estimate in words.
 *
 * Deliberately coarse. The rate is measured over a couple of minutes of a queue
 * that competes with a live market API, so "about 4 minutes" is the honest
 * precision and "4:12 remaining" would be a claim the number cannot support.
 */
export function formatEta(ms: number | null): string | null {
  if (ms === null) return null;

  const minutes = Math.round(ms / 60_000);

  // Anything under a half minute rounds to zero, and "about 0 minutes left" is
  // both wrong and slightly rude when the reader is already waiting.
  if (minutes < 1) return "under a minute left";
  // Past a quarter of an hour the estimate is a guess about a guess: the tail of
  // a batch is the untraded parts, which is where the rate falls apart.
  if (minutes > 15) return "over 15 minutes left";

  return `about ${minutes} minute${minutes === 1 ? "" : "s"} left`;
}

/**
 * The words for the batch on screen, kept up to date as it fills.
 *
 * The history lives in a ref rather than in state: it is written on every poll
 * and read once, and putting it in state would re-render the band to record a
 * reading it has not used yet.
 */
export function usePriceEta(priced: number, total: number): string | null {
  const samples = useRef<Sample[]>([]);
  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    // A different total is a different batch — opening the Sets view adds two
    // hundred names to the queue — and readings from the old one would describe
    // a race that is no longer being run.
    const previous = samples.current;
    const restarted = previous.length > 0 && previous[previous.length - 1]?.total !== total;

    const history = restarted ? [] : previous;
    history.push({ at: Date.now(), priced, total });

    samples.current = history.slice(-WINDOW);
    setEta(formatEta(etaMs(samples.current, total)));
  }, [priced, total]);

  return eta;
}
