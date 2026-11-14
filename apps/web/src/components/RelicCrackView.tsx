import { useMemo } from "react";

import { CrackBoard } from "./CrackBoard";
import { RelicInventory } from "./RelicInventory";
import { useOwnedRelics, useRelics, useSaveOwnedRelics } from "../api/queries";
import { addOwnedRelic, catalogueNames, setOwnedRelic } from "../lib/ownedRelics";
import type { CrackOptions } from "../lib/crackOptions";
import type { OwnedRelic, Refinement } from "../api/types";

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

        <CrackBoard
          owned={entries}
          catalogue={relics.data ?? []}
          options={options}
          onOptions={onOptions}
        />
      </div>
    </div>
  );
}
