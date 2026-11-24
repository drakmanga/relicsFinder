import { Table, TableCell, TableCols, TableHeaderCell, TableRow } from "relic-finder-ui";

import { ClanInitiativeLive } from "./ClanInitiativeLive";
import { KuvaAmount } from "./KuvaAmount";
import { KuvaRewardClaim } from "./KuvaRewardClaim";
import type { Cadence, KuvaReward } from "../lib/kuvaSources";

/** The catalogue id of the reward whose tiers are read live. */
const CLAN_INITIATIVE = "clan-initiative";

const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: "Weekly",
  daily: "Daily",
  baro: "Each Baro visit",
  season: "Per season",
};

/**
 * The recurring activities that pay Kuva, and how.
 *
 * "Chance" is a column rather than a footnote because it is what separates a
 * reward a player can plan on from a roll: Circuit's 20,000 and Archon Hunt's
 * 12,000 look alike until the 12% beside the second one.
 */
interface Props {
  rewards: KuvaReward[];
  /** Kuva each reward has paid this week, by id. See lib/kuvaBought. */
  collected: Record<string, number>;
  onCollected: (rewardId: string, kuva: number) => void;
  /** For the clan initiative's live line, which picks this week by it. */
  now: number;
}

export function KuvaRewardTable({ rewards, collected, onCollected, now }: Props) {
  return (
    <div className="rf-kuva-scroll" role="region" aria-label="Kuva rewards table" tabIndex={0}>
      <Table
        stickyFirstColumn
        framed={false}
        density="comfortable"
        caption="Weekly and recurring rewards that pay Kuva"
        className="rf-cols-kuva-rewards"
      >
        <TableCols count={6} />
        <thead>
          <tr>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell align="right">Kuva</TableHeaderCell>
            <TableHeaderCell align="right">Chance</TableHeaderCell>
            <TableHeaderCell>How often</TableHeaderCell>
            <TableHeaderCell>How it pays</TableHeaderCell>
            <TableHeaderCell align="center">Done</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {rewards.map((reward) => (
            <TableRow key={reward.id}>
              <TableCell>
                <div className="rf-kuva-who">
                  <span>{reward.source}</span>
                  <span className="rf-text-caption rf-fg-muted">{reward.where}</span>
                  {reward.requirement && (
                    <span className="rf-text-caption rf-fg-secondary">
                      Needs {reward.requirement}
                    </span>
                  )}
                  {/* The one reward the game announces ahead: what it pays
                      is a fact to read, not a range to guess from. */}
                  {reward.id === CLAN_INITIATIVE && <ClanInitiativeLive now={now} />}
                </div>
              </TableCell>
              <TableCell align="right" numeric>
                <KuvaAmount kuva={reward.kuva} />
              </TableCell>
              <TableCell align="right" numeric>
                {reward.chance === undefined ? (
                  <span className="rf-fg-secondary">Certain</span>
                ) : reward.chance === "varies" ? (
                  <span className="rf-fg-secondary">Varies</span>
                ) : (
                  <span className="rf-tabular">{reward.chance}%</span>
                )}
              </TableCell>
              <TableCell>{CADENCE_LABEL[reward.cadence]}</TableCell>
              <TableCell>
                <span className="rf-text-caption rf-fg-secondary">{reward.detail}</span>
              </TableCell>
              <TableCell align="center">
                <KuvaRewardClaim
                  reward={reward}
                  kuva={collected[reward.id] ?? 0}
                  onSet={(kuva) => onCollected(reward.id, kuva)}
                />
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
