/**
 * Whether this browser has already read the tier list's radshare primer.
 *
 * The primer is an argument — why a squad of four does not multiply the loot —
 * and an argument is read once and understood for good. It used to be pinned
 * open on the grounds that "whoever dismissed it in March is the same reader
 * coming back in April", which is true of the glossary beside it and not of the
 * prose: a lookup is needed again, a paragraph is not. What that pinning cost
 * was the head, and the head is what the table needs — 190px of it side by side
 * and 336px stacked, which is every phone, every open detail panel and every
 * 200% text zoom.
 *
 * So the prose folds and the glossary does not, and the fold is remembered.
 *
 * Per browser rather than in the URL, unlike every other piece of this view's
 * state: a shared link carries the view, not what the recipient has already
 * read. Same shape as `filterMemory` — its own versioned key, and a parse that
 * cannot take the app down with it.
 */
const STORAGE_KEY = "relic-finder.tier-primer.v1";

/**
 * A first visit opens on the argument.
 *
 * The failure mode of the other default is silent: a reader who has never met
 * the two columns sees them disagree, concludes a squad earns double, and
 * nothing on screen contradicts it.
 */
export const PRIMER_DEFAULT_OPEN = true;

/** What a stored value means, separated from where it is stored so it can be tested. */
export function primerOpenFrom(raw: string | null): boolean {
  if (raw === null) return PRIMER_DEFAULT_OPEN;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return PRIMER_DEFAULT_OPEN;

    const { open } = parsed as { open?: unknown };
    return typeof open === "boolean" ? open : PRIMER_DEFAULT_OPEN;
  } catch {
    // Hand-edited or half-migrated storage must not take the app down.
    return PRIMER_DEFAULT_OPEN;
  }
}

/** How the primer opens on this browser. */
export function primerOpen(): boolean {
  try {
    return primerOpenFrom(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private browsing with storage blocked: the reader gets a first visit.
    return PRIMER_DEFAULT_OPEN;
  }
}

/** Remembers the fold, for the next visit rather than for this one. */
export function rememberPrimerOpen(open: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ open }));
  } catch {
    // Private browsing or a full quota: the session still works, unremembered.
  }
}
