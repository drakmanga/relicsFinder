import { useMemo } from "react";

import { RelicInventory } from "./RelicInventory";
import { useOwnedRelics, useRelics, useSaveOwnedRelics } from "../api/queries";
import { addOwnedRelic, catalogueNames, setOwnedRelic } from "../lib/ownedRelics";
import type { OwnedRelic, Refinement } from "../api/types";

/**
 * The Relic Crack tab: the relics the player holds, and which to open where.
 *
 * Fetches its own data rather than taking it from the shell. Nothing else in
 * the app reads the inventory, and threading it through App and ResultsPane
 * would add props to two components that only pass it along.
 */
export function RelicCrackView() {
  const relics = useRelics();
  const owned = useOwnedRelics();
  const save = useSaveOwnedRelics();

  const names = useMemo(() => catalogueNames(relics.data ?? []), [relics.data]);
  const entries: OwnedRelic[] = owned.data ?? [];

  const onAdd = (relicName: string, refinement: Refinement, quantity: number) =>
    save.mutate(addOwnedRelic(entries, relicName, refinement, quantity));

  const onSet = (relicName: string, refinement: Refinement, quantity: number) =>
    save.mutate(setOwnedRelic(entries, relicName, refinement, quantity));

  return (
    <div className="rf-ranked">
      <div className="rf-ranked-head">
        <div className="rf-ranked-heading">
          <h2 className="rf-text-display-sm rf-ranked-title">Relic Crack</h2>
          <p className="rf-text-body-sm rf-fg-muted rf-prose rf-ranked-lead">
            The relics you hold, and which of them to open in the fissures up right now.
          </p>
        </div>
      </div>

      <div className="rf-ranked-body rf-crack">
        <RelicInventory
          entries={entries}
          names={names}
          onAdd={onAdd}
          onSet={onSet}
          error={save.isError ? save.error.message : null}
        />
      </div>
    </div>
  );
}
