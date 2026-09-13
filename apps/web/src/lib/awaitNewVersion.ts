/**
 * Waiting out an update from the tab that started it.
 *
 * An update closes the server this page is talking to, replaces it, and starts
 * it again a few seconds later on the same address. For those few seconds every
 * request fails, and that is the ordinary case rather than an error: the page
 * asks again until something answers, and what it is watching for is the
 * version in the answer changing.
 *
 * Why the version and not merely "the server is back": the setup can fail after
 * closing the application, and Windows restarts it on the version it already
 * had. A page that reloaded on the first answer would then show the old version
 * with no sign anything went wrong. Waiting for a different number means a
 * reload only ever happens onto a build that really is new.
 *
 * Pure of the browser — the clock, the reading and the reload are all passed in
 * — so the whole of it is testable without one, which matters for a piece of
 * code whose real setting is a process that is not running.
 */

/** What a single ask for the running version does. Rejects while the server is down. */
export type ReadVersion = () => Promise<string>;

export interface AwaitNewVersion {
  /** The version this page is running, which is the one being replaced. */
  was: string;
  read: ReadVersion;
  /** How long to wait between asks. */
  wait: (ms: number) => Promise<void>;
  /** How long to go on asking before giving up. */
  giveUpAfterMs?: number;
  /** How long between asks. */
  everyMs?: number;
}

/**
 * A second between asks: the restart takes a handful of seconds, so this is a
 * handful of tries rather than a poll fast enough to matter.
 */
const EVERY_MS = 1_000;

/**
 * Two minutes, which is far longer than a restart and far shorter than a
 * person's patience for a page that says it is coming back.
 *
 * It exists for the update that never finishes — a setup that failed, a machine
 * that went to sleep — so that the page ends up saying something rather than
 * asking forever.
 */
const GIVE_UP_AFTER_MS = 120_000;

/**
 * Asks until the version changes.
 *
 * Resolves true when a different version answered, which means the new build is
 * up and the caller should reload onto it. Resolves false when the time ran out
 * with nothing new, which is the update that did not happen and the caller
 * should say so rather than reload.
 *
 * Every failure in between is swallowed on purpose: while the application is
 * being replaced there is nothing listening, and a rejected fetch is what that
 * looks like from here.
 */
export async function awaitNewVersion({
  was,
  read,
  wait,
  giveUpAfterMs = GIVE_UP_AFTER_MS,
  everyMs = EVERY_MS,
}: AwaitNewVersion): Promise<boolean> {
  const tries = Math.max(1, Math.ceil(giveUpAfterMs / everyMs));

  for (let attempt = 0; attempt < tries; attempt += 1) {
    await wait(everyMs);

    try {
      const now = await read();
      if (now && now !== was) return true;
    } catch {
      // The server is down, which is the expected half of this wait.
    }
  }

  return false;
}
