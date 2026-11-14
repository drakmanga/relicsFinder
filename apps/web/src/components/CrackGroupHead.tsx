import { Chip } from "relic-finder-ui";

import { minutesLeft } from "../lib/relicCrack";
import type { CrackGroup } from "../lib/crackGroups";

interface Props {
  group: CrackGroup;
  now: number;
}

const relics = (count: number) => `${count} relic${count === 1 ? "" : "s"}`;

/**
 * The heading of one block in the grouped ranking: where to go, or why the
 * relics under it stay in the inventory for now.
 */
export function CrackGroupHead({ group, now }: Props) {
  if (group.kind !== "fissure") {
    return (
      <div className="rf-crack-group-head">
        <h4 className="rf-text-heading-sm rf-crack-group-title">
          {group.kind === "wait" ? "Keep for now" : "No price yet"}
        </h4>
        <span className="rf-text-caption rf-fg-muted">
          {relics(group.rows.length)}
          {group.kind === "wait" && " · only slow missions for their tier right now"}
        </span>
      </div>
    );
  }

  const { fissure } = group;
  return (
    <div className="rf-crack-group-head">
      <h4 className="rf-text-heading-sm rf-crack-group-title">{fissure.node}</h4>
      <span className="rf-text-caption rf-fg-muted">
        {fissure.tier} {fissure.missionType} · closes in {minutesLeft(fissure, now)} min ·{" "}
        {relics(group.rows.length)}
      </span>
      {fissure.steelPath && <Chip>Steel Path</Chip>}
      {fissure.voidStorm && <Chip>Void Storm</Chip>}
    </div>
  );
}
