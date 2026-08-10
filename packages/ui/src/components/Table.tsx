import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cx } from "../lib/cx";
import type { Density } from "../lib/types";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "./icons";

export type Align = "left" | "right" | "center";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  density?: Density;
  /** Enables row hover fill, the gold marker and the pointer cursor. */
  interactive?: boolean;
  /** Wraps the table in a notched frame. Turn off inside an existing panel. */
  framed?: boolean;
  children?: ReactNode;
}

const DENSITY_CLASS: Record<Density, string> = {
  compact: "rf-table-compact",
  default: "",
  comfortable: "rf-table-comfortable",
};

/**
 * Dense results table.
 *
 * Rows are never clipped. The wrapper carries the Orokin silhouette and the
 * rows stay rectangular — clipping every row would mean one composited layer
 * and one pseudo-element border per row, which stutters under virtualisation
 * and, worse, cuts the focus ring off the selected row.
 *
 * Header cells stick at `top: 0`. The wrapper's `overflow-x` makes it the
 * scroll container, so any offset above zero pushes the header down over the
 * first rows instead of below a topbar — that offset belongs to the shell
 * layout.
 *
 * No zebra striping: with seven columns and 1px dividers it is noise.
 */
export function Table({
  density = "default",
  interactive = false,
  framed = true,
  className,
  children,
  ...rest
}: TableProps) {
  const table = (
    <div className="rf-table-wrap">
      <table
        className={cx(
          "rf-table",
          DENSITY_CLASS[density],
          interactive && "rf-table-interactive",
          className,
        )}
        {...rest}
      >
        {children}
      </table>
    </div>
  );

  if (!framed) return table;

  return (
    <div className="rf-frame rf-notch-lg">
      <div className="rf-frame-inner rf-e1" style={{ overflow: "hidden" }}>
        {table}
      </div>
    </div>
  );
}

/**
 * Column definitions for a fixed-layout table.
 *
 * The widths themselves belong in a stylesheet, keyed off a class on the table:
 * `table-layout: fixed` makes them a property of the table rather than of any
 * one row, and putting a size on every header cell scatters the same decision
 * across ten JSX attributes. `<colgroup>` is what the platform provides for it.
 *
 * Render it as the first child of `Table`.
 */
export function TableCols({ count }: { count: number }) {
  return (
    <colgroup>
      {Array.from({ length: count }, (_, index) => (
        <col key={index} />
      ))}
    </colgroup>
  );
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  children?: ReactNode;
}

/**
 * Table row. Selection is expressed with `aria-selected`, which is also what
 * the selected fill and the void-400 marker key off — the state stays readable
 * to assistive technology and to CSS from the same source.
 */
export function TableRow({ selected, className, children, ...rest }: TableRowProps) {
  return (
    <tr aria-selected={selected} className={className} {...rest}>
      {children}
    </tr>
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: Align;
  /** Applies tabular figures. Mandatory for any column of numbers. */
  numeric?: boolean;
  children?: ReactNode;
}

/** Table cell. */
export function TableCell({ align = "left", numeric, className, children, ...rest }: TableCellProps) {
  return (
    <td
      className={cx(
        align !== "left" && `rf-align-${align}`,
        numeric && "rf-tabular",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

export type SortDirection = "asc" | "desc" | null;

export interface TableHeaderCellProps
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "onClick"> {
  align?: Align;
  /** Renders the sort affordance and keeps `aria-sort` correct. */
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSort?: () => void;
  children?: ReactNode;
}

/** Table header cell. */
export function TableHeaderCell({
  align = "left",
  sortable = false,
  sortDirection = null,
  onSort,
  className,
  children,
  ...rest
}: TableHeaderCellProps) {
  const ariaSort = !sortable
    ? undefined
    : sortDirection === "asc"
      ? "ascending"
      : sortDirection === "desc"
        ? "descending"
        : "none";

  const Arrow =
    sortDirection === "asc" ? ArrowUpIcon : sortDirection === "desc" ? ArrowDownIcon : ArrowUpDownIcon;

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cx(
        align !== "left" && `rf-align-${align}`,
        sortable && "rf-th-sortable rf-focus-ring",
        className,
      )}
      onClick={sortable ? onSort : undefined}
      tabIndex={sortable ? 0 : undefined}
      onKeyDown={
        sortable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSort?.();
              }
            }
          : undefined
      }
      {...rest}
    >
      {sortable ? (
        <span className="rf-th-inner">
          {children}
          <Arrow className="rf-sort-arrow" />
        </span>
      ) : (
        children
      )}
    </th>
  );
}
