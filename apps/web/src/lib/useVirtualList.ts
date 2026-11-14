import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/** Rows drawn beyond the visible ones, so a fast scroll does not show blank space. */
const OVERSCAN = 8;

/**
 * A list that draws only the rows near the screen, inside a pane that scrolls
 * as a whole.
 *
 * The Relic Crack tab holds hundreds of inventory lines and as many ranked
 * relics, and AGENTS.md §6 wants a virtualiser on any list past ~100 rows. The
 * other tables give their list a scroll box of its own; here the list scrolls
 * with the pane it sits in, under the fissure cards and beside a second list,
 * so the page looks exactly as it did with every row drawn. That is what
 * `scrollMargin` is for: how far down the pane the list starts.
 *
 * Rows are measured as they render rather than assumed equal, because a ranked
 * row grows a line when it carries refining advice and wraps at 360px.
 *
 * The space the undrawn rows would take is set as two custom properties on
 * the list (`--rf-virtual-before`, `--rf-virtual-after`), not as a style
 * object: it is geometry computed every scroll, not a design value, and a
 * `style={{}}` would be one more inline style for the debt gate to count.
 */
export function useVirtualList<L extends HTMLElement>(
  count: number,
  pane: RefObject<HTMLElement | null>,
  estimateSize: number,
) {
  const listRef = useRef<L>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Re-measured whenever the pane's content changes size: the fissure cards
  // above load late, the filters wrap, and either moves the list down.
  useLayoutEffect(() => {
    const list = listRef.current;
    const scroller = pane.current;
    if (!list || !scroller) return;

    const measure = () => {
      const offset =
        list.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop;
      setScrollMargin((current) => (Math.abs(offset - current) > 1 ? offset : current));
    };

    measure();
    const observer = new ResizeObserver(measure);
    for (const child of scroller.children) observer.observe(child);
    return () => observer.disconnect();
  }, [pane, count]);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => pane.current,
    estimateSize: () => estimateSize,
    overscan: OVERSCAN,
    scrollMargin,
  });

  const items = virtualizer.getVirtualItems();
  const first = items[0];
  const last = items[items.length - 1];
  const before = first ? first.start - scrollMargin : 0;
  const after = last ? virtualizer.getTotalSize() - (last.end - scrollMargin) : 0;

  useLayoutEffect(() => {
    listRef.current?.style.setProperty("--rf-virtual-before", `${Math.max(0, before)}px`);
    listRef.current?.style.setProperty("--rf-virtual-after", `${Math.max(0, after)}px`);
  }, [before, after]);

  return { listRef, items, measureElement: virtualizer.measureElement };
}
