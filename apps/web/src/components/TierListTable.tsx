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
  PriceDelta,
  Skeleton,
  Table,
  TableCell,
  TableCols,
  TableHeaderCell,
  TableRow,
  TierChip,
} from "relic-finder-ui";

import { PlatGlyph, PlatPrice } from "./Plat";
import { Highlight, HighlightPlaceholder, RankedPage } from "./RankedPage";
import { TierListPrimer } from "./TierListPrimer";
import { Unlisted } from "./Unlisted";
import { usePricePriority } from "../lib/usePricePriority";
import { ALL_VAULT_FILTERS, VAULT_LABEL, type VaultFilter } from "../lib/rows";
import {
  DEFAULT_TIER_SORT,
  RADSHARE_PLAYERS,
  TIER_SORT_LABEL,
  sortTierRows,
  type TierLetter,
  type TierList,
  type TierSortColumn,
  type TierSortState,
} from "../lib/tierList";
import type { PriceMap } from "../api/types";

const ROW_HEIGHT = 48;
const OVERSCAN = 10;
/** The cards above the table, as many as the other two ranked views show. */
const HIGHLIGHT_COUNT = 3;

interface Props {
  tierList: TierList;
  /** Absent until the market answers: with no prices there is nothing to band. */
  prices: PriceMap | undefined;
  /**
   * Whether the whole-relic batch is still landing. See lib/priceProgress.
   *
   * The part batch is deliberately not a prop here, unlike everywhere else in
   * the app: the letters survive a half-filled market — an unpriced drop counts
   * as zero, which understates a relic rather than inventing a value for it —
   * so nothing in this table waits on it.
   */
  relicPricesFilling: boolean;
  vault: VaultFilter;
  onVault: (next: VaultFilter) => void;
  /** Null is the ranking itself — see `sortTierRows`. */
  sort: TierSortState;
  /** The column clicked, not the state it produces: the rule is in lib/sorting. */
  onSort: (column: TierSortColumn) => void;
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
  prices,
  relicPricesFilling,
  vault,
  onVault,
  sort,
  onSort,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => sortTierRows(tierList.rows, sort), [tierList.rows, sort]);

  /* The cards are the head of the sorted list rather than a ranking of their
     own, so the two cannot disagree about what "top three" means. Two cases
     follow from that and both are deliberate: sorted by name they would read
     "Axi A1, Axi A2, Axi A3", which is not a ranking at all, so that one is
     ranked by the column the view opens on instead; and a column pointing
     ascending puts the three lowest relics on the cards, because that is what
     the reader asked the table for. Sorted by nothing, `rows` is already the
     ranking. */
  const rankedBy: Exclude<TierSortColumn, "relic"> =
    sort === null || sort.column === "relic" ? DEFAULT_TIER_SORT : sort.column;
  const top = useMemo(
    () =>
      (sort !== null && sort.column === "relic"
        ? sortTierRows(tierList.rows, { column: rankedBy, direction: "desc" })
        : rows
      ).slice(0, HIGHLIGHT_COUNT),
    [rows, tierList.rows, sort, rankedBy],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const items = virtualizer.getVirtualItems();

  // The rows on screen, told to the server so it prices those first. Same batch
  // and same reason as the Relics table: this view asks for all 772 relic
  // prices, and without the hint the ones being looked at fill in last.
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
       the letters are re-banded against whatever is left. */
    <div className="rf-tier-vault" role="group" aria-label="Which relics to rank">
      {ALL_VAULT_FILTERS.map((option) => (
        <Button
          key={option}
          variant={vault === option ? "accent" : "ghost"}
          size="sm"
          aria-pressed={vault === option}
          onClick={() => onVault(option)}
        >
          {VAULT_LABEL[option]}
        </Button>
      ))}
    </div>
  );

  if (!prices) {
    return (
      <RankedPage
        title="Tier List"
        lead="Waiting for the market to be read."
        controls={controls}
        note={<TierListPrimer />}
        highlights={<HighlightPlaceholder />}
      >
        <EmptyState
          tone="initial"
          title="No prices yet"
          description="A letter is a relic against the median relic, and there is no median until the cache fills."
        />
      </RankedPage>
    );
  }

  return (
    <RankedPage
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
          figureLabel={TIER_SORT_LABEL[rankedBy]}
          figure={
            <span className="rf-text-data-lg rf-gold">
              {rankedBy === "price" ? (
                <PlatPrice value={row.relicPrice} size="lg" />
              ) : (
                `${(rankedBy === "solo" ? row.soloValue : row.radshareValue).toFixed(1)}p`
              )}
            </span>
          }
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
            interactive={false}
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

                return (
                  <TableRow key={row.relicFullName}>
                    <TableCell align="right" numeric>
                      <span className="rf-fg-muted">{virtualRow.index + 1}</span>
                    </TableCell>
                    <TableCell>
                      <TierChip tier={row.tier} />
                    </TableCell>
                    <TableCell>{row.relicFullName}</TableCell>
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
                      <Trend percent={row.trend} />
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

/**
 * Ninety-day movement of the solo expected value, or nothing.
 *
 * `PriceDelta` rather than an arrow of this view's own: the arrow, the sign
 * and the two tones are already the design system's answer to "this number
 * moved", and a second one beside it would be the same thing said differently.
 * Rounded to whole percent — the arrow only appears past ten, so the decimals
 * would be digits of noise under a number that means "it moved".
 */
function Trend({ percent }: { percent: number | null }) {
  if (percent === null) return <Unlisted what="Steady" />;

  return <PriceDelta value={Math.round(percent)} />;
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
