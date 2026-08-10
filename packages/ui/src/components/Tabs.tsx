import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

export interface TabItem {
  id: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the tab list. */
  label?: string;
}

/**
 * Tabs.
 *
 * The active tab lifts to surface-2, takes the notched silhouette and carries
 * a 2px gold underline. Only the active tab is clipped — an inactive tab is
 * flat, so the cut itself reads as the selection.
 */
export function Tabs({ items, value, onChange, label, className, ...rest }: TabsProps) {
  return (
    <div className={cx("rf-tabs", className)} role="tablist" aria-label={label} {...rest}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={`rf-tab-${item.id}`}
          aria-selected={item.id === value}
          /*
            Only the selected tab points at a panel, because only the selected
            panel is rendered: these tabs swap the content rather than mounting
            all of it and hiding five sixths. `aria-controls` naming an element
            that is not in the document is a broken reference, and axe reports
            it as critical.
          */
          aria-controls={item.id === value ? `rf-tabpanel-${item.id}` : undefined}
          disabled={item.disabled}
          className="rf-tab rf-focus-ring"
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  /** The currently selected tab id. The panel renders only when they match. */
  value: string;
  children?: ReactNode;
}

/** Panel bound to a tab by id. */
export function TabPanel({ id, value, children, ...rest }: TabPanelProps) {
  if (id !== value) return null;

  return (
    <div role="tabpanel" id={`rf-tabpanel-${id}`} aria-labelledby={`rf-tab-${id}`} {...rest}>
      {children}
    </div>
  );
}
