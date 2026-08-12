import { useEffect, useRef } from "react";
import { api } from "../api/client";

/** Long enough that a flick through the table sends one hint, not thirty. */
const DEBOUNCE_MS = 400;

type Names = { items?: string[]; relics?: string[] };

/**
 * Tells the server which rows are on screen, so it prices those first.
 *
 * The tables go on asking for the whole catalogue in one batch — sorting by
 * price is only correct when every row has a price, and a scroll window made
 * the order shift under the user's hands. What the server cannot work out for
 * itself is which thirty of those rows are being looked at right now, and that
 * is all this sends.
 *
 * Nothing on screen depends on the result. The hint is debounced, skipped when
 * it repeats, and dropped entirely if the request fails.
 */
export function usePricePriority(names: Names, enabled = true) {
  // A ref rather than a dependency: the array identity changes on every scroll
  // frame, and comparing the contents is what decides whether to send.
  const lastSent = useRef("");

  const key = JSON.stringify(names);

  useEffect(() => {
    if (!enabled) return;

    const parsed = JSON.parse(key) as Names;
    const empty = (parsed.items?.length ?? 0) + (parsed.relics?.length ?? 0) === 0;
    if (empty || key === lastSent.current) return;

    const timer = setTimeout(() => {
      lastSent.current = key;
      void api.prioritise(parsed);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [key, enabled]);
}
