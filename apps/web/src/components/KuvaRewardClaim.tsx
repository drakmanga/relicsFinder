import { useState } from "react";
import { Input } from "relic-finder-ui";

import { KuvaDone } from "./KuvaDone";
import type { KuvaReward } from "../lib/kuvaSources";

interface Props {
  reward: KuvaReward;
  /** Kuva this reward has paid this week. */
  kuva: number;
  onSet: (kuva: number) => void;
}

/**
 * The Done cell of a weekly reward.
 *
 * A fixed reward is ticked like a vendor offer, and its claims are stored as
 * Kuva (claims × amount) so the head can add every reward up without knowing
 * which kind each one is. A reward that pays a different sum every week is a
 * field the player types the sum into instead: guessing it from the range
 * would put a number on the tab that is wrong most weeks.
 */
export function KuvaRewardClaim({ reward, kuva, onSet }: Props) {
  const { track } = reward;
  if (track === undefined) return <span className="rf-fg-muted">—</span>;

  if (track === "amount") return <AmountField reward={reward} kuva={kuva} onSet={onSet} />;

  // A fixed reward has one amount; the range form only exists for "amount".
  const each = typeof reward.kuva === "number" ? reward.kuva : reward.kuva[0];
  return (
    <KuvaDone
      name={`${reward.source} ${each.toLocaleString("en-US")} Kuva`}
      limit={track.times}
      count={Math.round(kuva / each)}
      available
      onSet={(count) => onSet(count * each)}
    />
  );
}

function AmountField({ reward, kuva, onSet }: Props) {
  // Typed text, committed on Enter or on leaving the field: saving on every
  // keystroke would send "4", "45", "457" to the server on the way to 45,750.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (kuva > 0 ? kuva.toLocaleString("en-US") : "");

  const commit = () => {
    if (draft === null) return;
    // Dots and commas are thousands separators here, not decimals: Kuva is
    // whole, and both "45.750" and "45,750" mean the same sum.
    const value = Number(draft.replace(/[.,\s]/g, ""));
    if (Number.isFinite(value)) onSet(value);
    setDraft(null);
  };

  return (
    <Input
      size="sm"
      inputMode="numeric"
      placeholder="0"
      value={shown}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
      aria-label={`Kuva collected from ${reward.source} this week`}
      trailing={<span className="rf-text-caption rf-fg-muted">Kuva</span>}
      wrapperClassName="rf-kuva-amount-field"
    />
  );
}
