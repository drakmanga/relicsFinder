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
 * How long a silence has to last before it counts against the rate.
 *
 * The counter only moves when a poll comes back, so a still counter is the
 * normal state for most of any fifteen seconds and diluting the rate during it
 * would make the estimate climb between polls and drop at each one — movement
 * that says nothing about the queue. Past the poll interval and a grace period,
 * silence stops being the cadence and starts being a wait, and a wait is part of
 * how long this is taking.
 */
const STALL_AFTER_MS = 25_000;

/**
 * Readings closer together than this are one reading.
 *
 * The three batches — parts, relics, sets — poll on their own timers and land
 * milliseconds apart, so the sum they are read from climbs in steps: for an
 * instant after the first lands, the counter holds new prices from one batch
 * and old prices from the others. That half-poll is a true reading of a state
 * the queue really passed through, and a useless one to measure a rate from,
 * because the time it took belongs to the whole poll and only part of the
 * prices are in it. Keeping the last reading of each burst keeps one honest
 * point per poll.
 */
const COALESCE_MS = 2_000;

/**
 * The history with one more reading in it.
 *
 * Appended, unless it lands on the heels of the one before, in which case it
 * replaces it — see {@link COALESCE_MS}.
 */
export function record(samples: Sample[], next: Sample): Sample[] {
  const last = samples[samples.length - 1];
  const burst = last && next.at - last.at < COALESCE_MS && next.total === last.total;

  return [...(burst ? samples.slice(0, -1) : samples), next].slice(-WINDOW);
}

/**
 * The reading to judge the queue by right now.
 *
 * Usually the last one taken. When nothing has been heard for longer than a poll
 * should take, the same count is carried forward to the present instead: same
 * prices, more time, so the measured rate falls and the estimate grows. Nothing
 * is invented — the count is the one that was really last seen, and the time is
 * the time it is.
 */
export function atNow(samples: Sample[], now: number): Sample[] {
  const last = samples[samples.length - 1];
  if (!last || now - last.at < STALL_AFTER_MS) return samples;

  return [...samples, { at: now, priced: last.priced, total: last.total }];
}

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

/** How often the estimate is re-read while the counter says nothing. */
const TICK_MS = 5_000;

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

    samples.current = record(history, { at: Date.now(), priced, total });
    setEta(formatEta(etaMs(atNow(samples.current, Date.now()), total)));
  }, [priced, total]);

  /*
    A beat of its own, because the effect above only runs when the counter
    moves — and a queue that has stopped moving is exactly the case where the
    estimate was wrong. Without this, a batch that stalls at four hundred goes
    on promising three minutes for as long as it is stuck.

    Setting the same string is free: React bails out of the render when the
    state does not change, so the ticking costs nothing while the queue is
    keeping up.
  */
  useEffect(() => {
    const timer = setInterval(() => {
      setEta(formatEta(etaMs(atNow(samples.current, Date.now()), total)));
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [total]);

  return eta;
}
