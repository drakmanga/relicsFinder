/**
 * What kind of page load this is.
 *
 * A reload is the gesture that asks for newer numbers, and a click on a tab is
 * not: both leave the same React app running, and only one of them should cost
 * the server a re-read. The browser knows which happened and nothing else does.
 */

/**
 * Whether the browser got here by reloading.
 *
 * `navigate` is a first visit or a followed link, `back_forward` is history,
 * `prerender` is the browser guessing — none of the three is somebody asking
 * for the numbers again. An empty list is a browser that does not carry the
 * timing API, which reads as "not a reload": refreshing nothing is a worse
 * answer than a stale number, but refreshing on every visit would spend the
 * cooldown of everybody sharing the address.
 */
export function isReload(entries: readonly PerformanceEntry[]): boolean {
  const [navigation] = entries as PerformanceNavigationTiming[];
  return navigation?.type === "reload";
}

/**
 * Read once, here, for the life of this page.
 *
 * A fact about how the document was loaded, so it cannot be asked per view:
 * `performance` goes on answering "reload" for as long as the page is open, and
 * a component asking it on mount would call every tab switch after an F5 a
 * reload of its own.
 */
export const LOADED_BY_RELOAD =
  typeof performance === "undefined" ? false : isReload(performance.getEntriesByType("navigation"));
