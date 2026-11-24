import { useClanInitiative } from "../api/queries";
import { clanWeekLine, clanWeeks } from "../lib/clanInitiative";

/**
 * What this week's and next week's Clan Weekly Initiative pay in Kuva, under
 * the initiative's name in the rewards table.
 *
 * Next week as well as this one because the worldstate announces it, and a
 * week with 28,000 Kuva coming is worth knowing before the reset rather than
 * after. Gold only for a week that pays Kuva, so a glance down the line finds
 * it; the words say the same thing for a reader who cannot see the colour.
 */
export function ClanInitiativeLive({ now }: { now: number }) {
  const initiative = useClanInitiative();

  if (initiative.isPending) {
    return <span className="rf-text-caption rf-fg-muted">Reading this week's tiers…</span>;
  }
  if (initiative.isError) {
    return (
      <span className="rf-text-caption rf-fg-muted">
        This week's tiers are unknown: the game's worldstate did not answer
      </span>
    );
  }

  const { current, next } = clanWeeks(initiative.data, now);
  return (
    <>
      <span className="rf-text-caption">
        <span className="rf-fg-muted">This week: </span>
        {current ? (
          <span className={current.kuva > 0 ? "rf-gold" : "rf-fg-secondary"}>
            {clanWeekLine(current)}
          </span>
        ) : (
          <span className="rf-fg-muted">not announced</span>
        )}
      </span>
      {next && (
        <span className="rf-text-caption">
          <span className="rf-fg-muted">Next week: </span>
          <span className={next.kuva > 0 ? "rf-gold" : "rf-fg-secondary"}>
            {clanWeekLine(next)}
          </span>
        </span>
      )}
    </>
  );
}
