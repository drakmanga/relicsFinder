import { Input, SearchIcon } from "relic-finder-ui";

import { ALL_OWNED_SORTS, OWNED_TIERS, type OwnedSort } from "../lib/ownedRelics";

interface Props {
  term: string;
  onTerm: (next: string) => void;
  /** Tiers on show. Empty is every tier. */
  tiers: Set<string>;
  onTiers: (next: Set<string>) => void;
  sort: OwnedSort;
  onSort: (next: OwnedSort) => void;
  /** Lines left after the filters, and in all, for the count. */
  shown: number;
  total: number;
}

const SORT_LABEL: Record<OwnedSort, string> = { added: "Added", name: "Name", copies: "Copies" };

/* The Sets view's chip, grown to 44px by `rf-hit-block` (rule 7). */
const CHIP = "rf-focus-ring rf-set-filter rf-hit-block";
const chip = (pressed: boolean) => (pressed ? `${CHIP} rf-set-filter-on` : CHIP);

/**
 * Finding a line in an inventory of hundreds: a name to type, the tiers to
 * show, and an order.
 *
 * Separate from the picker above it on purpose. That field adds from the whole
 * catalogue; this one searches what is already held, and one box doing both
 * would leave the reader unsure which list a match came from.
 */
export function InventoryFilters({
  term,
  onTerm,
  tiers,
  onTiers,
  sort,
  onSort,
  shown,
  total,
}: Props) {
  const toggleTier = (tier: string) => {
    const next = new Set(tiers);
    if (!next.delete(tier)) next.add(tier);
    onTiers(next);
  };

  return (
    <div className="rf-crack-inventory-filters">
      <Input
        icon={<SearchIcon />}
        size="sm"
        placeholder="Find in your relics"
        aria-label="Find in your relics"
        value={term}
        onChange={(event) => onTerm(event.target.value)}
      />

      <div className="rf-set-filters-group" role="group" aria-label="Tiers shown">
        {OWNED_TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            aria-pressed={tiers.has(tier)}
            className={chip(tiers.has(tier))}
            onClick={() => toggleTier(tier)}
          >
            {tier}
          </button>
        ))}
      </div>

      <div className="rf-set-filters-group" role="group" aria-label="Order">
        <p className="rf-text-overline rf-fg-muted rf-set-filters-label">Order</p>
        {ALL_OWNED_SORTS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={sort === option}
            className={chip(sort === option)}
            onClick={() => onSort(option)}
          >
            {SORT_LABEL[option]}
          </button>
        ))}
        {/* The only feedback that a filter did anything on a list this long. */}
        <span className="rf-text-caption rf-fg-muted rf-crack-inventory-count" aria-live="polite">
          {shown === total ? `${total} lines` : `${shown} of ${total} lines`}
        </span>
      </div>
    </div>
  );
}
