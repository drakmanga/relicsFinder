/**
 * The Clan Weekly Initiative's announced weeks, read as "this week" and "next
 * week" against the reader's clock, and said in one line each.
 */
import type { ClanInitiativeWeek } from "../api/types";
import { kuvaLabel, WEEK_MS, weekStartOf } from "./kuva";

export interface ClanWeeks {
  /** Absent when the worldstate has not announced it — never "no Kuva". */
  current?: ClanInitiativeWeek;
  next?: ClanInitiativeWeek;
}

/**
 * Picked by the Monday each week starts on rather than by position: the
 * worldstate drops last week at its own pace, and a list that still opens on
 * it for an hour after the reset must not have last week read as this one.
 */
export function clanWeeks(weeks: readonly ClanInitiativeWeek[], now: number): ClanWeeks {
  const start = weekStartOf(now);
  return {
    current: weeks.find((week) => week.week === start),
    next: weeks.find((week) => week.week === start + WEEK_MS),
  };
}

/** "Pluto · no Kuva", or "Ceres · 28,000 (7,000 at 1,000 pts, 21,000 at 2,000 pts)". */
export function clanWeekLine(week: ClanInitiativeWeek): string {
  if (week.kuva === 0) return `${week.region} · no Kuva`;
  const tiers = week.tiers
    .filter((tier) => tier.kuva > 0)
    .map((tier) => `${kuvaLabel(tier.kuva)} at ${kuvaLabel(tier.points)} pts`)
    .join(", ");
  return `${week.region} · ${kuvaLabel(week.kuva)} (${tiers})`;
}
