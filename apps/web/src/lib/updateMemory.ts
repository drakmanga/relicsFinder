/**
 * Which release this browser has been told about and decided to skip.
 *
 * A notice that comes back on every reload for a version somebody already
 * looked at and passed on is a notice people learn to ignore, and the next one
 * — the one that mattered — goes with it. So skipping is remembered.
 *
 * One version rather than a list, and that is the whole rule: skipping 0.2.0
 * silences 0.2.0 and nothing else, so 0.3.0 asks again. A "never show me
 * updates" switch is a different feature and is not this one.
 *
 * Per browser rather than on the server, unlike the wishlist: the decision is
 * "not on this machine, not now", and it says nothing about the other places
 * the same person runs this. Same shape as `primerMemory` — its own versioned
 * key, and a parse that cannot take the app down with it.
 */
const STORAGE_KEY = "relic-finder.update-skipped.v1";

/** What a stored value means, separated from where it is stored so it can be tested. */
export function skippedVersionFrom(raw: string | null): string | null {
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const { version } = parsed as { version?: unknown };
    return typeof version === "string" && version.length > 0 ? version : null;
  } catch {
    // Hand-edited or half-migrated storage must not take the app down, and the
    // safe side is showing a notice rather than silencing one.
    return null;
  }
}

/**
 * Whether this release should be announced.
 *
 * Not announceable at all unless there is a release to announce: a null latest
 * is the offline answer, and the notice must render nothing rather than
 * something about a version nobody could read.
 */
export function shouldAnnounce(latest: string | null | undefined, skipped: string | null): boolean {
  if (!latest) return false;
  return latest !== skipped;
}

/** The version this browser skipped, or null. */
export function skippedVersion(): string | null {
  try {
    return skippedVersionFrom(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private browsing with storage blocked: nothing was skipped.
    return null;
  }
}

/** Remembers a skip, for the next visit as much as for this one. */
export function rememberSkippedVersion(version: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version }));
  } catch {
    // Private browsing or a full quota: the notice goes for this session only.
  }
}
