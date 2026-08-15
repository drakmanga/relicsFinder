/**
 * Turning an ISO instant into the two things the topbar label needs.
 *
 * Pure, and here rather than in the component, because "what time is that"
 * and "how do I draw it" are different questions and only the first one is
 * worth a test.
 */

/**
 * The clock time to show, in the reader's own locale and zone — with the date
 * in front of it once that instant is not today.
 *
 * The date is not decoration. This label reports the OLDEST price held, and a
 * part nobody trades keeps its reading for days: the live cache answers with
 * an instant two days back. Rendered as a bare "18:51" that reads as this
 * evening, which is the one thing it is not.
 */
export function asOfTime(iso: string | null | undefined, now: Date = new Date()): string | null {
  const when = parse(iso);
  if (!when) return null;

  const clock = when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (isSameDay(when, now)) return clock;

  const date = when.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${date}, ${clock}`;
}

/** Same calendar day where the reader is, which is what "today" means to them. */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * The full date and time, for the tooltip.
 *
 * The label shows only hours and minutes, which is ambiguous the moment a
 * price is a day old — and one can be, on a part nobody trades.
 */
export function asOfTitle(iso: string | null | undefined): string | null {
  const when = parse(iso);
  return when ? when.toLocaleString() : null;
}

/**
 * `null` for anything that is not a usable instant.
 *
 * The server sends null before its cache has anything in it, and that null
 * has to survive the trip as "draw nothing" rather than as "1 January 1970".
 */
function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;

  const when = new Date(iso);
  return Number.isNaN(when.getTime()) ? null : when;
}
