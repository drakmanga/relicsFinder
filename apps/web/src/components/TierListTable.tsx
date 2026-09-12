/**
 * Over 150 lines (rule 4). A table component is a column specification and a
 * row renderer, and the two are read together: the fourth `<col>` and the
 * fourth `<TableCell>` are the same decision. Splitting them would put the
 * halves of every column in two files.
 */
import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Button,
  EmptyState,
  Skeleton,
  Table,
  TableCell,
  TableCols,
  TableHeaderCell,
  TableRow,
  TierChip,
  Unlisted,
} from "relic-finder-ui";

import { PlatGlyph, PlatPrice } from "./Plat";
import { Highlight, HighlightPlaceholder, RankedPage } from "./RankedPage";
import { TierListPrimer } from "./TierListPrimer";
import { TrendValue } from "./TrendNote";
import { tierTrendCell } from "../lib/trend";
import { usePricePriority } from "../lib/usePricePriority";
import {
  ALL_VAULT_FILTERS,
  DEFAULT_REFINEMENT,
  VAULT_LABEL,
  relicRowId,
  type VaultFilter,
} from "../lib/rows";
import {
  DEFAULT_TIER_SORT,
  RADSHARE_PLAYERS,
  TIER_SORT_LABEL,
  sortTierRows,
  topOfRanking,
  type TierSortColumn,
  type TierSortState,
} from "../lib/tierList";
import type { Refinement, TierLetter, TierList } from "../api/types";

const ROW_HEIGHT = 48;
const OVERSCAN = 10;
/** The cards above the table, as many as the other two ranked views show. */
const HIGHLIGHT_COUNT = 3;
/** One header, one instance: the view renders exactly one population group. */
const VAULT_LABEL_ID = "rf-tier-vault-label";

interface Props {
  /** Absent until the ranking arrives: it is computed server-side. */
  tierList: TierList | undefined;
  /**
   * Whether the parts behind the ranking are still being priced.
   *
   * The letters do not wait on it and never did: an unpriced drop counts as
   * zero, which understates a relic rather than inventing a value for it. The
   * Trend column is the one thing here that has to know, because "no drop of
   * this relic has a measured trend" and "no drop of this relic has a price
   * yet" produce the same empty comparison, and only one of them is a fact
   * about the market.
   */
  pricesFilling: boolean;
  /** The same for the relics' own listings. Drives the price column. */
  relicPricesFilling: boolean;
  vault: VaultFilter;
  onVault: (next: VaultFilter) => void;
  /** Null is the ranking itself — see `sortTierRows`. */
  sort: TierSortState;
  /** The column clicked, not the state it produces: the rule is in lib/sorting. */
  onSort: (column: TierSortColumn) => void;
  /** Row id of the relic whose panel is open, or null. See `relicRowId`. */
  selected: string | null;
  /** Opens a relic, in the state the column being read is about. */
  onOpen: (relicFullName: string, refinement: Refinement) => void;
}

/**
 * Is this relic worth opening, and do I need a squad for it.
 *
 * The seventh view rather than two more columns on Relics, because it asks a
 * different question with a different population: Relics lists the relics a
 * search and a set of filters left, and a band letter means nothing against a
 * list of nine. This one ranks a whole population against its own median, and
 * the population is the only control it has.
 *
 * Two letters side by side and never one blended letter. Solo Intact and
 * radshare Radiant share 4 of their top 20 and 59% of the catalogue lands in a
 * different band depending on which is read, so a single letter would be wrong
 * for one of the two ways of playing every second relic. That is also why the
 * rows are not colour-banded the way a tier list usually is: a row has two
 * letters and a background can only carry one of them.
 */
export function TierListTable({
  tierList,
  pricesFilling,
  relicPricesFilling,
  vault,
  onVault,
  sort,
  onSort,
  selected,
  onOpen,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => sortTierRows(tierList?.rows ?? [], sort), [tierList?.rows, sort]);

  /* The cards are a standing answer to "which relics are worth opening" and the
     sort arrows do not touch them — see `topOfRanking`, which carries why that
     was reversed. The population does, and it is the only thing that does. */
  const top = useMemo(() => topOfRanking(tierList?.rows ?? [], HIGHLIGHT_COUNT), [tierList?.rows]);

  /*
    The state the panel opens on is the one every relic panel opens on, whatever
    this table is ranked by: `DEFAULT_REFINEMENT`, which is Radiant because that
    is the state a relic is opened in rather than the state it is found in.

    It used to follow the ranked column — solo and price to Intact, radshare to
    Radiant — on the reading that a row read in one column should not open in
    another. That is a smaller rule than the one above it: the table's default
    ranking is Solo, so following the column meant that clicking a relic on this
    view opened on Intact, which is the one number nobody is about to act on and
    exactly what `DEFAULT_REFINEMENT` exists to stop. The slider still answers
    the other three states, and it is one drag from the column's own number.
  */
  const openOn = DEFAULT_REFINEMENT;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const items = virtualizer.getVirtualItems();

  // The rows on screen, told to the server so it prices those first. This view
  // asks for no prices at all any more — the ranking arrives with the relic's
  // own price in it — but the hint is what decides which of 772 relic listings
  // the warmer reads next, and without it the ones being looked at fill in last.
  usePricePriority({
    relics: items
      .map((item) => rows[item.index]?.relicFullName)
      .filter((name): name is string => !!name),
  });

  const paddingTop = items.length > 0 ? (items[0]?.start ?? 0) : 0;
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0) : 0;

  const controls = (
    /* Three exclusive states, as on the Relics filter bar: "neither droppable
       nor vaulted" is not a thing a relic can be. Here the choice does more
       than hide rows — it is the population both medians are taken over, so
       the letters are re-banded against whatever is left.

       That weight is why the group says its own job on screen. It used to be
       three bare buttons in the header's whitespace with the sentence in an
       `aria-label` nobody sees, which made the control that redefines the whole
       ranking the lightest chrome on the tab — and the only mute one in the
       shell, since Ducanetor and Endo pass a checkbox that states its job in
       full into the same slot. The label is a `p` read by `aria-labelledby`
       rather than a second `aria-label`, so the name is said once. */
    <div className="rf-tier-vault">
      <p id={VAULT_LABEL_ID} className="rf-text-overline rf-fg-muted rf-tier-vault-label">
        Which relics to rank
      </p>
      <div className="rf-tier-vault-options" role="group" aria-labelledby={VAULT_LABEL_ID}>
        {ALL_VAULT_FILTERS.map((option, index) => (
          <Button
            key={option}
            variant={vault === option ? "accent" : "ghost"}
            size="sm"
            /* Rule 7. The 32px switches grow into the head's own space above and
               below; "All" is also too short to reach 44 across, and grows
               leftwards only — the 4px gap to "Droppable" belongs to Droppable
               as much as to it, and the space at the group's own edge belongs to
               nobody. The label above is text rather than a target, and the
               group's inset is what the leftward growth reaches, so neither is
               eaten by the wrapper this now sits in. */
            className={index === 0 ? "rf-hit-block rf-hit-inline-start" : "rf-hit-block"}
            aria-pressed={vault === option}
            onClick={() => onVault(option)}
          >
            {VAULT_LABEL[option]}
          </Button>
        ))}
      </div>
    </div>
  );

  if (!tierList) {
    return (
      <RankedPage
        view="tiers"
        title="Tier List"
        lead="Waiting for the market to be read."
        controls={controls}
        note={<TierListPrimer />}
        highlights={<HighlightPlaceholder />}
      >
        <EmptyState
          tone="initial"
          title="No ranking yet"
          description="A letter is a relic against the median relic, and the median is being worked out."
        />
      </RankedPage>
    );
  }

  return (
    <RankedPage
      view="tiers"
      title="Tier List"
      lead={`Every relic ranked twice: opened alone Intact, and opened Radiant in a squad of ${RADSHARE_PLAYERS}. The two disagree more often than not.`}
      controls={controls}
      note={<TierListPrimer />}
      footnote={<Footnote tierList={tierList} />}
      highlights={top.map((row, index) => (
        <Highlight
          key={row.relicFullName}
          rank={index + 1}
          title={row.relicFullName}
          figureLabel={TIER_SORT_LABEL[DEFAULT_TIER_SORT]}
          figure={<span className="rf-text-data-lg rf-gold">{row.soloValue.toFixed(1)}p</span>}
          meta={
            <span className="rf-highlight-meta-row">
              <span className="rf-inline">
                <span className="rf-text-overline rf-fg-muted">Solo</span>
                <Grade letter={row.soloLetter} />
              </span>
              <span className="rf-inline">
                <span className="rf-text-overline rf-fg-muted">Radshare</span>
                <Grade letter={row.radshareLetter} />
              </span>
            </span>
          }
        />
      ))}
    >
      <div
        ref={scrollRef}
        className="rf-virtual-scroll"
        role="region"
        aria-label="Relic tier list"
        tabIndex={0}
      >
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing to rank"
            description="No relic is in this population right now."
          />
        ) : (
          <Table
            stickyFirstColumn
            interactive
            framed={false}
            density="comfortable"
            caption="Relics ranked by expected value, solo and in a radshare"
            className="rf-cols-tiers"
          >
            <TableCols count={7} />
            <thead>
              <tr>
                {/* Widths are mandatory under the table's fixed layout. */}
                <TableHeaderCell align="right">#</TableHeaderCell>
                <TableHeaderCell>Era</TableHeaderCell>
                <SortHeader column="relic" sort={sort} onSort={onSort} />
                <SortHeader
                  column="solo"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                  title="One player, Intact: the state a relic is already in"
                />
                <SortHeader
                  column="radshare"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                  title={`${RADSHARE_PLAYERS} players, Radiant, best reward kept — the trace cost is not subtracted`}
                />
                <SortHeader
                  column="price"
                  sort={sort}
                  onSort={onSort}
                  align="right"
                  title="What the relic itself sells for. It never moves the letters"
                />
                <TableHeaderCell align="right" title="Movement of the solo value over ninety days">
                  Trend
                </TableHeaderCell>
              </tr>
            </thead>

            <tbody>
              {paddingTop > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={7} className="rf-spacer" style={{ height: paddingTop }} />
                </tr>
              )}

              {items.map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;

                const id = relicRowId(row.relicFullName, openOn);

                return (
                  <TableRow
                    key={row.relicFullName}
                    selected={id === selected}
                    onClick={() => onOpen(row.relicFullName, openOn)}
                    title={`${row.relicFullName} — click to see everything inside`}
                  >
                    <TableCell align="right" numeric>
                      <span className="rf-fg-muted">{virtualRow.index + 1}</span>
                    </TableCell>
                    <TableCell>
                      <TierChip tier={row.tier} />
                    </TableCell>
                    <TableCell>
                      {/*
                        The name is a real button so the row is reachable by
                        keyboard: a click handler on the row alone is a mouse
                        affordance and nothing else (rule 5.1). It is not an
                        extra column — the Tier List is already short of width
                        — and it does not stop the click bubbling to the row,
                        because both do the same thing to the same relic.
                      */}
                      <button type="button" className="rf-cell-open rf-focus-ring">
                        {row.relicFullName}
                      </button>
                    </TableCell>
                    <TableCell align="right" numeric>
                      <span className="rf-tier-cell">
                        <Grade letter={row.soloLetter} />
                        <span className="rf-tabular">{row.soloValue.toFixed(1)}</span>
                      </span>
                    </TableCell>
                    <TableCell align="right" numeric>
                      <span className="rf-tier-cell">
                        <Grade letter={row.radshareLetter} />
                        <span className="rf-tabular">{row.radshareValue.toFixed(1)}</span>
                      </span>
                    </TableCell>
                    <TableCell align="right" numeric>
                      {row.relicPrice === null && relicPricesFilling ? (
                        <Skeleton width={44} height={14} />
                      ) : (
                        <PlatPrice value={row.relicPrice} />
                      )}
                    </TableCell>
                    <TableCell align="right" numeric>
                      <TrendValue cell={tierTrendCell(row.trend, pricesFilling)} size="cell" />
                    </TableCell>
                  </TableRow>
                );
              })}

              {paddingBottom > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={7} className="rf-spacer" style={{ height: paddingBottom }} />
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </div>
    </RankedPage>
  );
}

/**
 * One band letter.
 *
 * In `apps/web` rather than in `packages/ui` on the placement test: the six
 * letters are not a generic scale, they are bands around the median of a
 * population of relics, and a library component would have to carry that
 * vocabulary to know what to draw. The letter is the carrier of the meaning
 * and the fill is reinforcement — rule 5.1 — which is also why the ramp runs
 * gold to sunken rather than through hues.
 *
 * A null letter is an absent ranking, not an F. F is a verdict, and there is
 * no median to reach one with when the screen is empty or the middle relic is
 * worth nothing; printing one anyway would be the app inventing a judgement.
 */
function Grade({ letter }: { letter: TierLetter | null }) {
  if (letter === null) return <Unlisted what="Not ranked" />;

  return (
    <span className={`rf-grade rf-clip-octagon rf-grade-${letter.toLowerCase()}`}>{letter}</span>
  );
}

interface SortHeaderProps {
  column: TierSortColumn;
  sort: TierSortState;
  onSort: (column: TierSortColumn) => void;
  align?: "left" | "right";
  title?: string;
}

/**
 * A sortable header, drawing whichever of the three states its column is in.
 *
 * Null on every column but the sorted one, and on all of them while the table
 * is showing the ranking — which `TableHeaderCell` renders as the two-way glyph
 * and reports as `aria-sort="none"`. It used to report the fixed direction the
 * column always ran in; there is no fixed direction any more.
 */
function SortHeader({ column, sort, onSort, align = "left", title }: SortHeaderProps) {
  return (
    <TableHeaderCell
      align={align}
      sortable
      sortDirection={sort !== null && sort.column === column ? sort.direction : null}
      onSort={() => onSort(column)}
      title={title}
    >
      {column === "relic" ? (
        TIER_SORT_LABEL[column]
      ) : (
        <span className="rf-inline">
          {TIER_SORT_LABEL[column]} <PlatGlyph size={12} />
        </span>
      )}
    </TableHeaderCell>
  );
}

/**
 * The bands, in numbers, under the table that uses them.
 *
 * Without it the letters read as a verdict handed down from nowhere: S is not
 * a property of a relic, it is twice the median of the relics currently on
 * screen, and the medians move when the population control does. One decimal
 * where the rest of the app rounds platinum to whole numbers, because the
 * bands are multiples of this number and 5p against 5.4p is a band boundary
 * 0.8p apart.
 *
 * It used to close on the void traces a Radiant costs and on the relic's own
 * price staying out of the letters. Both now sit in `TierListPrimer`, above the
 * table rather than under it, and saying either of them twice on one screen
 * would be two copies to keep in step.
 */
function Footnote({ tierList }: { tierList: TierList }) {
  const { soloMedian, radshareMedian } = tierList;

  return (
    <p className="rf-text-caption rf-fg-muted">
      S is 2x the median of the relics on screen, A 1.5x, B 1.2x, C 0.8x, D 0.6x, F below it.{" "}
      {soloMedian === null || radshareMedian === null
        ? "There is no median yet, so nothing is banded."
        : `Right now that median is ${soloMedian.toFixed(1)}p solo and ${radshareMedian.toFixed(1)}p in a radshare.`}
    </p>
  );
}
