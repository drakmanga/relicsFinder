import { useCallback, useSyncExternalStore } from "react";

/**
 * A media query as state.
 *
 * For the handful of decisions CSS cannot make on its own: below `lg` the
 * detail panel is a modal drawer, and a drawer is not something to render and
 * hide — an empty one over the table is worse than none, and a hidden one is
 * still in the tab order. Which element to render is a question only the
 * component can answer, so the query has to reach the component.
 *
 * `useSyncExternalStore` rather than state plus an effect: the match is not
 * this component's state, it is the browser's, and reading it through an effect
 * means rendering once with the wrong answer and then again with the right one.
 *
 * Subscribed, not read once: a laptop meeting an external monitor crosses this
 * boundary without reloading the page.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // Server-rendered, there is no viewport to measure: the wide layout is the
    // one the design is drawn at, so it is the honest default.
    () => false,
  );
}

/**
 * Below `--rf-bp-lg`. The literal is written out because a custom property
 * cannot be used inside a media condition, in CSS or here.
 */
export const BELOW_LG = "(max-width: 1023.98px)";
