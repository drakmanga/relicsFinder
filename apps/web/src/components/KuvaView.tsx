import { useMemo } from "react";
import type { ReactNode } from "react";
import { Frame } from "relic-finder-ui";

import { KuvaRewardTable } from "./KuvaRewardTable";
import { KuvaVendorTable } from "./KuvaVendorTable";
import { TeshinAlert } from "./TeshinAlert";
import {
  countdownLabel,
  kuvaLabel,
  nextWeeklyReset,
  orderRewards,
  orderVendors,
  steelPathKuvaRotation,
  weeklyVendorCeiling,
} from "../lib/kuva";
import { rewardsObtained, useKuvaBought, weeklyBought, weeklyRemaining } from "../lib/kuvaBought";
import { KUVA_REWARDS, KUVA_VENDORS, VERIFIED_AS_OF } from "../lib/kuvaSources";
import { useNow } from "../lib/useNow";

/** A reset countdown in hours and minutes is never more than a minute stale. */
const CLOCK_TICK = 60_000;

/**
 * The Kuva tab: every vendor that sells it and every recurring reward that
 * pays it, with the weekly reset they all run on.
 *
 * Nothing here is fetched. The catalogue is curated in `lib/kuvaSources` and
 * the only moving parts — the reset and Teshin's rotation — are calendars,
 * computed from the clock. So the tab draws at once and works offline.
 */
export function KuvaView() {
  const now = useNow(CLOCK_TICK);
  const rotation = steelPathKuvaRotation(now);
  const vendors = useMemo(() => orderVendors(KUVA_VENDORS), []);
  const rewards = useMemo(() => orderRewards(KUVA_REWARDS), []);
  const ceiling = weeklyVendorCeiling(vendors, rotation.thisWeek);
  const bought = useKuvaBought(now);
  const remaining = weeklyRemaining(vendors, bought.counts, rotation.thisWeek);
  const fromVendors = weeklyBought(vendors, bought.counts, rotation.thisWeek);
  const fromRewards = rewardsObtained(bought.rewards);

  return (
    <div className="rf-ranked">
      <div className="rf-ranked-head">
        <div className="rf-ranked-headline">
          <div className="rf-ranked-heading">
            <h2 className="rf-text-display-sm rf-ranked-title">Kuva</h2>
            <p className="rf-text-body-sm rf-fg-muted rf-prose rf-ranked-lead">
              Every vendor that sells Kuva and every weekly reward that pays it. Limits restock at
              the weekly reset, Monday 00:00 UTC.
            </p>
          </div>
          {/* Where the Relic Crack keeps its fissure alerts: the head's right
              end holds what acts on the whole tab. */}
          <TeshinAlert />
        </div>

        <div className="rf-ranked-highlights">
          <Stat
            label="Weekly reset"
            figure={countdownLabel(nextWeeklyReset(now) - now)}
            sub="Every capped vendor restocks"
          />
          <Stat
            label="Obtained this week"
            figure={kuvaLabel(fromVendors + fromRewards)}
            sub={`${kuvaLabel(fromVendors)} from vendors · ${kuvaLabel(fromRewards)} from rewards`}
          />
          <Stat
            label="Left to buy this week"
            figure={kuvaLabel(remaining)}
            sub={`of ${kuvaLabel(ceiling)} the capped vendors sell${
              rotation.thisWeek ? ", Teshin's 50,000 included" : ""
            }`}
          />
          <Stat
            label="Teshin's 50,000"
            figure={
              rotation.thisWeek
                ? "This week"
                : `In ${rotation.weeksAway} ${rotation.weeksAway === 1 ? "week" : "weeks"}`
            }
            sub="55 Steel Essence, one week in eight"
          />
        </div>
      </div>

      <div className="rf-ranked-body rf-kuva">
        <section aria-labelledby="rf-kuva-vendors">
          <h3 id="rf-kuva-vendors" className="rf-text-heading-md rf-kuva-section-title">
            Vendors
          </h3>
          {/* The tick that failed has already been taken back by the
              optimistic update, so the reader needs to be told why it
              vanished. */}
          {bought.error && (
            <p role="alert" className="rf-text-caption rf-crack-error">
              Could not save that tick: {bought.error}
            </p>
          )}
          <KuvaVendorTable
            vendors={vendors}
            rotation={rotation}
            now={now}
            bought={bought.counts}
            onBought={bought.set}
          />
        </section>

        <section aria-labelledby="rf-kuva-rewards">
          <h3 id="rf-kuva-rewards" className="rf-text-heading-md rf-kuva-section-title">
            Weekly and recurring rewards
          </h3>
          <KuvaRewardTable
            rewards={rewards}
            collected={bought.rewards}
            onCollected={bought.setReward}
            now={now}
          />
        </section>
      </div>

      <div className="rf-ranked-foot">
        <p className="rf-text-caption rf-fg-muted">
          Prices and limits checked against the game at {VERIFIED_AS_OF}. A later patch can move
          them.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, figure, sub }: { label: string; figure: ReactNode; sub: string }) {
  return (
    <Frame notch="md" surface={2}>
      <div className="rf-kuva-stat">
        <span className="rf-text-overline rf-fg-muted">{label}</span>
        <span className="rf-text-data-lg rf-gold">{figure}</span>
        <span className="rf-text-caption rf-fg-muted">{sub}</span>
      </div>
    </Frame>
  );
}
