import { useMemo, useRef } from "react";

import { ActiveFissures } from "./ActiveFissures";
import { FissureAlerts } from "./FissureAlerts";
import { CrackBoard } from "./CrackBoard";
import { RelicInventory } from "./RelicInventory";
import { useFissures, useOwnedRelics, useRelics, useSaveOwnedRelics } from "../api/queries";
import { addOwnedRelic, catalogueNames, setOwnedRelic } from "../lib/ownedRelics";
import { useFissureAlerts } from "../lib/useFissureAlerts";
import { useNow } from "../lib/useNow";
import type { CrackOptions } from "../lib/crackOptions";
import type { OwnedRelic, Refinement } from "../api/types";

/** Often enough that "closes in N min" is never a minute stale for long. */
const CLOCK_TICK = 30_000;

interface Props {
  /** The ranking's controls. From the shell, because they live in the URL. */
  options: CrackOptions;
  onOptions: (next: CrackOptions) => void;
}

/**
 * The Relic Crack tab: the relics the player holds, and which to open where.
 *
 * Fetches its own data rather than taking it from the shell. Nothing else in
 * the app reads the inventory or the fissures, and threading them through App
 * and ResultsPane would add props to two components that only pass them along.
 * The controls are the exception, because the URL is the shell's.
 */
export function RelicCrackView({ options, onOptions }: Props) {
  const relics = useRelics();
  const owned = useOwnedRelics();
  const save = useSaveOwnedRelics();
  // Here rather than in either section: the cards and the ranking read the
  // same feed and must count down off the same clock, or a card could say a
  // fissure closes in 1 min while the ranking beside it says 2.
  const fissures = useFissures(true);
  const now = useNow(CLOCK_TICK);
  // The one element that scrolls on this tab: both long lists draw only the
  // rows near it. See lib/useVirtualList.
  const pane = useRef<HTMLDivElement>(null);

  const names = useMemo(() => catalogueNames(relics.data ?? []), [relics.data]);
  const entries: OwnedRelic[] = owned.data ?? [];
  const alerts = useFissureAlerts(fissures.data, entries, options, now);

  const onAdd = (relicName: string, refinement: Refinement, quantity: number) =>
    save.mutate(addOwnedRelic(entries, relicName, refinement, quantity));

  const onSet = (relicName: string, refinement: Refinement, quantity: number) =>
    save.mutate(setOwnedRelic(entries, relicName, refinement, quantity));

  return (
    <div ref={pane} className="rf-ranked">
      <div className="rf-ranked-head">
        <div className="rf-ranked-heading">
          <h2 className="rf-text-display-sm rf-ranked-title">Relic Crack</h2>
          <p className="rf-text-body-sm rf-fg-muted rf-prose rf-ranked-lead">
            The relics you hold, and which of them to open in the fissures up right now.
          </p>
        </div>
      </div>

      <div className="rf-ranked-body rf-crack">
        <ActiveFissures
          fissures={fissures}
          options={options}
          onOptions={onOptions}
          now={now}
          alerts={
            <FissureAlerts
              active={alerts.active}
              until={alerts.until}
              permission={alerts.permission}
              onStart={alerts.start}
              onStop={alerts.stop}
            />
          }
        />

        <RelicInventory
          entries={entries}
          names={names}
          onAdd={onAdd}
          onSet={onSet}
          error={save.isError ? save.error.message : null}
          pane={pane}
        />

        <CrackBoard
          owned={entries}
          catalogue={relics.data ?? []}
          feed={fissures.data}
          feedPending={fissures.isPending}
          options={options}
          now={now}
          pane={pane}
          onOpened={(relic) =>
            save.mutate(
              setOwnedRelic(entries, relic.relicName, relic.refinement, relic.quantity - 1),
            )
          }
        />
      </div>
    </div>
  );
}
