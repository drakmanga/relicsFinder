import { useId, useState } from "react";
import { Button, Input, SearchIcon } from "relic-finder-ui";

import { REFINEMENT_LABEL, ALL_REFINEMENTS } from "../lib/rows";
import { matchRelicNames } from "../lib/ownedRelics";
import type { Refinement } from "../api/types";

interface Props {
  /** Every relic's full name, once. */
  names: string[];
  onAdd: (relicName: string, refinement: Refinement, quantity: number) => void;
}

/**
 * Adds relics to the inventory: type, pick, done.
 *
 * Built for entering dozens in a row. The refinement and the count stay where
 * they were after an add, because a player copying their inventory goes
 * through it one refinement at a time; Enter takes the first match, so the
 * keyboard alone is enough; and the field empties and keeps focus, so the next
 * name can be typed straight away.
 */
export function RelicPicker({ names, onAdd }: Props) {
  const [term, setTerm] = useState("");
  const [refinement, setRefinement] = useState<Refinement>("intact");
  const [quantity, setQuantity] = useState(1);
  const fieldId = useId();
  const listId = useId();
  const refinementId = useId();

  const matches = matchRelicNames(names, term);

  const add = (relicName: string) => {
    onAdd(relicName, refinement, quantity);
    setTerm("");
    // By id rather than a ref: the library's Input does not forward one, and
    // a click on a match has moved focus to that match's button.
    document.getElementById(fieldId)?.focus();
  };

  return (
    <div className="rf-crack-picker">
      <Input
        id={fieldId}
        icon={<SearchIcon />}
        label="Add a relic"
        placeholder="Neo N16, a20…"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches[0]) {
            event.preventDefault();
            add(matches[0]);
          }
        }}
        aria-controls={listId}
        helper={term && matches.length === 0 ? "No relic by that name." : undefined}
      />

      {/* On the name's line rather than under the refinement: two digits
          on a row of their own cost a field's height for nothing. */}
      <Input
        type="number"
        label="Copies"
        min={1}
        value={quantity}
        wrapperClassName="rf-crack-picker-qty"
        onChange={(event) => setQuantity(Math.max(1, Math.trunc(Number(event.target.value)) || 1))}
      />

      {/* Labelled like the two fields above it, above its options, rather
          than with the chips' own uppercase overline: in that style the word
          read as a fifth chip. */}
      <div className="rf-crack-refinement" role="group" aria-labelledby={refinementId}>
        <p id={refinementId} className="rf-field-label rf-crack-refinement-label">
          Refinement
        </p>
        <div className="rf-set-filters-group">
          {ALL_REFINEMENTS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={refinement === option}
              className={`rf-focus-ring rf-set-filter rf-hit-block${refinement === option ? " rf-set-filter-on" : ""}`}
              onClick={() => setRefinement(option)}
            >
              {REFINEMENT_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      {/* Buttons rather than an ARIA combobox: each match is one action,
          "add this", and a list of real buttons is reachable by Tab with no
          keyboard model to reimplement. */}
      <ul id={listId} className="rf-crack-matches" aria-label="Matching relics">
        {matches.map((name) => (
          <li key={name}>
            <Button variant="outline" size="sm" className="rf-hit-block" onClick={() => add(name)}>
              + {name}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
