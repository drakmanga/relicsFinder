/**
 * One walk over every view, measuring the three AGENTS.md rules that only a
 * running browser can answer: rule 6 (360px and 200% zoom, both axes), rule 6
 * again from the other side (a pane squeezed until the table inside it has
 * nowhere to render), and rule 7 (44x44 touch targets).
 *
 * IN EVERY STATE A READER CAN PUT A VIEW IN, which for a year meant the one it
 * loads in. The controls behind a disclosure are the densest in the
 * application and none of them had ever been measured; neither had the layout
 * with a filter drawer open, which is a whole band of it appearing above a
 * results pane that has to give up the height. Each measurement is reported
 * under the name of the state it was taken in, so a failure says which state
 * it was in without being read in context.
 *
 * The command is still called `reflow` because CI, the docs and the operator's
 * fingers all point at that name; what it measures is the list above.
 *
 * WHAT REFLOW MEANS HERE. The page body never scrolls horizontally, and wide
 * content scrolls inside its own container. A table wider than the window is
 * fine as long as `.rf-table-wrap` takes the scrollbar; the same table pushing
 * the document sideways is a reflow failure, because it drags the masthead, the
 * filter bar and everything else off screen with it.
 *
 * AND THE SAME DOWNWARDS. Rule 6 is written about horizontal reflow, so the
 * vertical axis was left unmeasured — and run 005 shipped a Tier List that gave
 * the document a 622px scrollbar with nothing under it, at an ordinary window
 * size, under a green run of this script. This app is a viewport-height shell
 * whose lists scroll inside their own panes: at rest the document does not
 * scroll in either axis, on any view, at any of the thresholds below. That is a
 * measured fact rather than an aspiration, which is what makes it a gate.
 *
 * WHY A COLLAPSED CONTAINER IS MEASURED SEPARATELY. The two measurements above
 * both look for something sticking out, and a scroll container squeezed to
 * height 0 sticks out of nothing: it paints no rows, so no box overflows, and
 * `.rf-results-main` is `overflow: hidden`, so nothing is visibly clipped
 * either. The view measures perfectly clean precisely because it is empty. That
 * is how run 002 shipped a tier list that rendered zero rows at four sizes
 * under a green headline, with `NO ROWS` printed beside it as a footnote. A
 * footnote under a green headline does not get read, so the container's own box
 * is measured and a collapsed one fails by name.
 *
 * WHY THE ROW COUNT DECIDES NOTHING. An empty list and a collapsed pane both
 * show zero rows, and only one of them is a fault: the Wishlist is legitimately
 * empty until somebody adds a line. They are told apart by the container's box
 * — an empty list has a scroller with height and no rows in it, a collapsed one
 * has no height to put a row in.
 *
 * Section 8 asks for all of this by hand in a browser, and by hand is why the
 * fault that prompted this script shipped: nobody checks a threshold on the view
 * they were not editing.
 *
 * IN TWO ENGINES, and the reason is beside `ENGINES` below rather than here,
 * because it is a cost that was weighed rather than a fact about the app.
 *
 * Against a preview build, not the dev server, for the same reason axe-check is
 * — dev injects an overlay and a client the reader never receives, and both take
 * layout space. Vite's `preview.proxy` defaults to `server.proxy`, so a preview
 * on 4173 forwards /api to the backend exactly as the dev server does.
 *
 * The backend DOES have to be up. Without it the views render their error
 * state, the tables are empty, and an empty table cannot overflow — the check
 * would come back clean on precisely the views it exists to measure. A view in
 * that state is reported as INCONCLUSIVE and exits non-zero, because a run that
 * measured nothing is not a run that passed.
 *
 * Usage: npm run build, npm run preview, ./mvnw spring-boot:run, then
 * `node scripts/reflow-check.mjs [baseUrl]`.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Indexed by name rather than destructured: which engines run is a list
// below, and a second one should not need a second import line.
const playwright = require("playwright");

const BASE = process.argv[2] ?? "http://localhost:4173";

const VIEWS = [
  ["relics", "/"],
  ["prime items", "/?view=items"],
  ["sets", "/?view=sets"],
  ["wishlist", "/?view=wishlist"],
  ["ducanetor", "/?view=ducats"],
  ["endo", "/?view=endo"],
  ["tier list", "/?view=tiers"],
];

/*
  The three measurements, and why each one is the honest emulation of what it
  claims to emulate.

  360px is the plain case: the narrowest phone the design commits to, straight
  into the viewport.

  200% browser zoom needs no API. Zoom halves the CSS-pixel dimensions of the
  viewport and leaves every CSS length alone, so a 1440x950 window zoomed to
  200% IS a 720x475 CSS-pixel viewport — which is why there is a magic 720 in
  this file and no call to any zoom setting. WCAG 1.4.10 reflow is written in
  exactly these terms.

  200% TEXT zoom is a third thing again, and AGENTS.md rule 6 says "text zoom"
  while section 8 says "browser text zoom": the font grows and the layout box
  does not. `.rf-root` sets `font-size: max(1rem, var(--rf-reading-floor))` and
  that `1rem` resolves against the document root, which is where the browser's
  own preference lives — so doubling the root font-size from its 16px default is
  the same lever the reader pulls, and every rem-based width doubles with it.
  Measured at a normal desktop viewport, because a reader raising their font
  size has not also shrunk their window.
*/
const THRESHOLDS = [
  { name: "360px", width: 360, height: 800, rootFontSize: null },
  { name: "200% zoom", width: 720, height: 475, rootFontSize: null },
  { name: "200% text", width: 1440, height: 950, rootFontSize: "32px" },
];

// Sub-pixel layout rounds, and a fractional overshoot draws no scrollbar and
// moves nothing. One pixel is the smallest slack that does not report noise.
const TOLERANCE = 1;

// How many offending elements to name per failure. The outermost few are the
// ones worth fixing; everything under them is the same overflow seen again.
const CULPRITS = 5;

/*
  Rule 7's box, and the three written exceptions to it. All four are stated in
  AGENTS.md §1 and §5.4; what is here is the same rule in a form that fails a
  build, and the two files have to be changed together.

  44px is WCAG 2.5.5 (AAA), which is what rule 7 asks for. 24px is WCAG 2.5.8
  (AA), which is what a control inside a data cell is held to instead: the
  cell's height is the table's grid, and the space above and below it belongs to
  the next row, which is itself a target. Growing one there does not buy a
  bigger target, it takes its neighbour's.

  `EQUIVALENT` is WCAG 2.5.8's own "equivalent control" exception, and it is an
  allowlist rather than a shape, so a new control cannot fall into it by
  accident. The relic name in a Tier List cell is a button only so the row is
  reachable by keyboard (rule 5.1); the row it sits in opens the same panel on a
  click and is 48px tall and the full width of the table, so the pointer target
  for that action already clears the rule.
*/
const TOUCH_MIN = 44;
const DENSE_MIN = 24;
const EQUIVALENT = ".rf-cell-open";

/*
  §5.4's third exception, added 2026-08-29 when the walk first measured the
  states a reader opens: a control in a panel's dense stack is held to the same
  24px as one in a data cell, and for the same reason.

  A detail panel is a column of rows four to ten pixels apart, and the space a
  target there would grow into belongs to the row above or below it, which is
  itself a target. That is exception 1's argument outside a table, and the list
  is deliberately a handful of selectors rather than a shape — everything else
  in a panel was grown to 44 instead, including the things that had to grow in
  one direction to do it.

  What is on it and why it cannot be grown:
    .rf-btn-xs           the quantity steppers, 24x24 and 22px apart in a row
    .rf-qty-remove       the same stepper's remove X, 32x32, 3px from the + and
                         4px under the panel head's price-history button; in a
                         drop list it sits inside a 48px row whose neighbours
                         are a pixel away
    .rf-droprow-roomy    a relic's six drops, 30px rows 4px apart
    .rf-droprow-relic    the relics a part drops from, 24px rows 6px apart
    .rf-droprow-sibling  the rest of a part's set, 30px rows 4px apart
    .rf-hint-toggle      13px of icon under a heading whose next line is a
                         control; grown to 25x29, which is as far as it goes
                         without taking that line
*/
const DENSE = [
  ".rf-btn-xs",
  ".rf-qty-remove",
  ".rf-droprow-roomy",
  ".rf-droprow-relic",
  ".rf-droprow-sibling",
  ".rf-hint-toggle",
].join(", ");

/*
  A scroll container shorter than the header row of the table it holds cannot
  show a single line of it, whatever it is handed. Zero is the case seen in the
  wild — `.rf-virtual-scroll` is `height: 100%` inside a pane sized to whatever
  the head left over, and when the head is taller than the pane that is nothing
  — but a scroller squeezed to eleven pixels is the same fault with the same
  symptom, and reporting only the exact zero would let it back in.
*/
const COLLAPSED_UNDER = 36;

/*
  The functions in capitals below never run in Node. Playwright serialises each one and
  evaluates it inside the page, which is why the ones needing two arguments take
  an array — `page.evaluate` hands over exactly one value — and why none of them
  closes over anything: a constant declared up here does not exist over there.

  The browser globals are declared inline rather than switched on in
  eslint.config.mjs, because this is the only script in the repo that runs code
  in a browser and the rest have no business being handed them.
*/
/* global document, getComputedStyle */

/**
 * Walks the document for elements sticking out past the viewport's edge on one
 * axis and returns the outermost ones.
 *
 * A number on its own — "1180 > 720" — says a view fails and nothing about what
 * to change, and the whole point of this script is to hand the next reader an
 * element rather than a symptom. Outermost first because an overflowing table
 * takes every cell in it out of bounds too, and a list of forty `td`s buries
 * the one line that matters.
 *
 * The axis is a parameter rather than two functions because the walk is the
 * same walk: what changes is which edge of the rect is compared against which
 * client dimension. On the vertical axis the outermost-first filter usually
 * has nothing to do — a box that lengthens the document without lengthening
 * any ancestor is exactly the fault this is looking for, and it is a leaf.
 *
 * Runs inside the page: `getBoundingClientRect` is the only thing that knows
 * where an element actually landed.
 */
const OFFENDERS = ([limit, slack, axis]) => {
  const doc = document.documentElement;
  const edge = axis === "y" ? doc.clientHeight : doc.clientWidth;
  const out = [];

  /*
    Whether this box is one the ROOT has to make room for, or one that some
    ancestor already clips.

    Without this the vertical walk is useless rather than merely noisy: every
    list in this app scrolls inside its own pane, so on the Tier List at 360x800
    there are 579 boxes below the fold and 578 of them are rows inside
    `.rf-ranked`, which is `overflow-y: auto` and contains every one of them.
    The one box that actually lengthened the document was not in the first
    fourteen. The horizontal walk never had to care because a table too wide for
    its wrap is the same shape and simply never came up.

    The rule is CSS's own. A clipping ancestor clips what is laid out inside it,
    and an absolutely positioned box is laid out inside its CONTAINING BLOCK
    rather than its parent — so an ancestor that neither clips nor establishes a
    containing block is transparent to it, which is exactly how `.rf-sr-only`
    walked out of a table's scroller and lengthened the page. A fixed box is out
    of the document's flow altogether and never lengthens it.
  */
  const lengthensTheRoot = (element) => {
    let box = element;

    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const boxStyle = getComputedStyle(box);
      if (boxStyle.position === "fixed") return false;

      const style = getComputedStyle(ancestor);
      // Anything that makes an ancestor a containing block for an absolutely
      // positioned descendant, which is what decides whether its overflow
      // reaches that descendant at all.
      const holdsAbsolutes =
        style.position !== "static" ||
        style.transform !== "none" ||
        style.filter !== "none" ||
        style.willChange.includes("transform") ||
        style.contain.includes("paint") ||
        style.contain.includes("layout");

      if (boxStyle.position === "absolute" && !holdsAbsolutes) continue;
      if (style.overflowX !== "visible" || style.overflowY !== "visible") return false;

      box = ancestor;
    }

    return true;
  };

  for (const element of document.querySelectorAll("body *")) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const past = axis === "y" ? rect.bottom : rect.right;
    if (past <= edge + slack) continue;
    // An ancestor already reported means this is the same overflow one level
    // down. Keeping only the outermost is what makes the list readable.
    if (out.some((seen) => seen.element.contains(element))) continue;
    if (!lengthensTheRoot(element)) continue;
    out.push({ element, past });
  }

  // One line per kind of box, not per instance, on the same reading as the
  // touch measurement below: the vertical case is one hidden label per
  // virtualised row on screen, so naming each one buries the class name that
  // is the whole finding under twenty copies of itself.
  const kinds = new Map();
  for (const { element, past } of out) {
    const classes = Array.from(element.classList);
    // The rf-* class is the one a stylesheet in this repo is keyed on; a
    // utility class or a generated one identifies nothing.
    const marker = classes.find((name) => name.startsWith("rf-")) ?? classes[0];
    const label = `${element.tagName.toLowerCase()}${marker ? `.${marker}` : ""}`;
    const seen = kinds.get(label);
    if (seen) {
      seen.count += 1;
      seen.past = Math.max(seen.past, past);
      continue;
    }
    kinds.set(label, { label, classes: classes.join(" "), past, count: 1 });
  }

  return Array.from(kinds.values())
    .slice(0, limit)
    .map((kind) => ({ ...kind, past: Math.round(kind.past) }));
};

/**
 * Whether the document scrolls, on either axis, and by how much.
 *
 * `body.scrollHeight` comes back beside the root's own because the two
 * disagreeing is the signature of one whole class of fault, and it is nearly
 * impossible to recover from the overflow number alone. A box positioned
 * against the INITIAL containing block — `position: absolute` with no
 * positioned ancestor — is clipped by no `overflow` between itself and the
 * root, so it enlarges the root's scrollable area while every box in the flow,
 * `body` included, measures exactly the viewport. That is what put 622px of
 * empty page under the Tier List in run 005, and printing the two numbers
 * beside each other is what named the element in under a minute after two
 * passes of measurement had failed to.
 */
const DOCUMENT_OVERFLOW = () => {
  const doc = document.documentElement;
  return {
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    scrollHeight: doc.scrollHeight,
    clientHeight: doc.clientHeight,
    bodyScrollHeight: document.body.scrollHeight,
  };
};

/**
 * Whether anything inside the modal has escaped its gilded frame.
 *
 * Separate from the document measurement because the modal is `position: fixed`
 * inside a scrim that is also fixed: content overflowing it clips or draws over
 * the border instead of lengthening the document, so `scrollWidth` on the root
 * never notices. `.rf-detail-body` owns the scrolling by design — its
 * `overflow-y: auto` computes overflow-x to `auto` as well — so a wider
 * scrollWidth there is content the panel cannot lay out, and a descendant whose
 * right edge passes the modal's is content drawn outside the frame.
 */
const MODAL_OVERFLOW = ([limit, slack]) => {
  const modal = document.querySelector(".rf-modal");
  if (!modal) return null;

  const frame = modal.getBoundingClientRect();
  const body = modal.querySelector(".rf-detail-body");
  const escaped = [];

  for (const element of modal.querySelectorAll("*")) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right <= frame.right + slack) continue;
    if (escaped.some((seen) => seen.element.contains(element))) continue;
    escaped.push({ element, right: rect.right, width: rect.width });
  }

  return {
    frameWidth: Math.round(frame.width),
    frameRight: Math.round(frame.right),
    viewportWidth: document.documentElement.clientWidth,
    bodyScrollWidth: body ? body.scrollWidth : null,
    bodyClientWidth: body ? body.clientWidth : null,
    // The width comes back as well as the edge: an element wider than the frame
    // that contains it is a min-content floor winning against a max-width, and
    // the two numbers side by side say so without a second run.
    escaped: escaped.slice(0, limit).map(({ element, right, width }) => {
      const classes = Array.from(element.classList);
      const marker = classes.find((name) => name.startsWith("rf-")) ?? classes[0];
      return {
        label: `${element.tagName.toLowerCase()}${marker ? `.${marker}` : ""}`,
        right: Math.round(right),
        width: Math.round(width),
      };
    }),
  };
};

/**
 * Whether anything in a table has left the cell it belongs to.
 *
 * The document measurement above cannot see this and never will: every table is
 * wrapped in `.rf-table-wrap`, which takes the sideways scrollbar exactly as the
 * rule asks, so a table too wide for the window is contained by design. What
 * escapes instead is a cell. `.rf-table` is `table-layout: fixed` over the
 * percentage widths in `.rf-cols-*`, which means a column is whatever share of
 * the table it was declared and never a pixel more, whatever is standing in it.
 * Put a control with a floor — a stepper, a progress bar — in a column narrower
 * than that floor and it lays itself out past the cell's edge and over its
 * neighbour.
 *
 * Only ELEMENTS out of bounds are counted as failures. `.rf-table tbody td` sets
 * `overflow: hidden; text-overflow: ellipsis`, so a long name truncating is the
 * design working, not breaking — it is reported as advisory and named as such.
 * A child box past the cell edge has no such excuse.
 *
 * The column index and its heading come back with each one, because the fix
 * lives in `.rf-cols-* col:nth-child(N)` and a class name alone does not say
 * which N.
 */
const CELL_OVERFLOW = (slack) => {
  const escaping = [];
  let clipped = 0;

  for (const table of document.querySelectorAll(".rf-table")) {
    const headings = Array.from(table.querySelectorAll("thead th"), (th) => th.textContent.trim());
    const marker = Array.from(table.classList).find((name) => name.startsWith("rf-cols-")) ?? "";

    for (const cell of table.querySelectorAll("tbody td")) {
      if (cell.hasAttribute("colspan")) continue; // the virtualiser's spacer rows

      const box = cell.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (cell.scrollWidth - cell.clientWidth > slack) clipped += 1;

      const column = cell.cellIndex;
      for (const element of cell.querySelectorAll("*")) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.right <= box.right + slack) continue;
        if (escaping.some((seen) => seen.element.contains(element))) continue;
        escaping.push({ element, column, marker, headings, over: rect.right - box.right });
      }
    }
  }

  // One line per column, not per row: two hundred sets overflowing the same
  // column is one fault reported two hundred times.
  const seen = new Set();
  const unique = [];
  for (const entry of escaping) {
    const key = `${entry.marker}:${entry.column}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const classes = Array.from(entry.element.classList);
    const label = classes.find((name) => name.startsWith("rf-")) ?? classes[0];
    unique.push({
      table: entry.marker,
      column: entry.column + 1,
      heading: entry.headings[entry.column] ?? "?",
      label: `${entry.element.tagName.toLowerCase()}${label ? `.${label}` : ""}`,
      over: Math.round(entry.over),
    });
  }

  return { escaping: unique, clipped };
};

/**
 * The state of every scroll container on the view, and whether the view is
 * drawing its error state.
 *
 * This is the measurement the document and cell ones cannot make. Both of those
 * look for a box that is too big for what holds it; this one looks for a box
 * that has been squeezed out of existence, which produces no symptom at all —
 * no overflow, nothing clipped, an empty surface where the table should be.
 *
 * The error state is read from the icon `EmptyState tone="error"` renders,
 * rather than from the absence of rows: a view whose request never landed and a
 * view whose list is genuinely empty look identical from the row count, and the
 * first proves nothing while the second is a pass.
 *
 * Runs inside the page.
 */
const SCROLLERS = () => {
  const boxes = [];

  for (const element of document.querySelectorAll(".rf-virtual-scroll")) {
    const rect = element.getBoundingClientRect();
    const classes = Array.from(element.classList);
    const marker = classes.find((name) => name.startsWith("rf-")) ?? classes[0];
    boxes.push({
      label: `${element.tagName.toLowerCase()}${marker ? `.${marker}` : ""}`,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      // Counted per scroller rather than per document: the Wishlist renders one
      // panel of five, and "this scroller has rows" is what says whether the
      // one on screen is empty.
      rows: element.querySelectorAll("tbody tr:not([aria-hidden='true'])").length,
    });
  }

  return { boxes, errored: document.querySelector(".rf-empty-icon-error") !== null };
};

/**
 * Every interactive element on the view, measured against rule 7's box.
 *
 * What is measured is the border box, because that is the box a pointer lands
 * on: a control drawn smaller than the rule passes by carrying a transparent
 * border around its ink (see `.rf-hit-block` in components.css), and the border
 * is part of the element's hit region while the padding box it paints in has
 * not moved. Growing the hit area and redrawing the control are two different
 * changes, and only the first one is being asked for.
 *
 * A `<label>` counts as the control's own box when it covers it, because
 * clicking a label activates the control it names. That is the only thing that
 * can give a native checkbox a hit area: Chrome ignores border and padding on
 * one, and `width`/`height` grow the tick itself.
 *
 * Two things this cannot see, and both are somebody else's rule. A control
 * covered by something drawn over it still measures its own box — occlusion is
 * not what this measures. And a `<tr onClick>` is not an interactive element in
 * the DOM, so a row is measured as the cells in it; whether that row is
 * operable at all is rule 5's question, not rule 7's.
 */
const TOUCH_TARGETS = ([minimum, denseMinimum, equivalent, denseList]) => {
  const CONTROLS = [
    "button",
    "a[href]",
    "input:not([type='hidden'])",
    "select",
    "textarea",
    "summary",
    "[role='button']",
    "[tabindex]:not([tabindex='-1'])",
  ].join(", ");

  const under = new Map();
  let exempt = 0;
  let measured = 0;

  for (const element of document.querySelectorAll(CONTROLS)) {
    const own = element.getBoundingClientRect();
    if (own.width === 0 || own.height === 0) continue;
    if (getComputedStyle(element).visibility === "hidden") continue;

    measured += 1;

    // The biggest box that activates this control: its own, or a label drawn
    // over it. "Over it" rather than "anywhere on the page" because a label
    // beside the control is a second target rather than a bigger one.
    const centreX = own.x + own.width / 2;
    const centreY = own.y + own.height / 2;
    let hit = own;
    for (const label of element.labels ?? []) {
      const rect = label.getBoundingClientRect();
      const covers =
        rect.left <= centreX &&
        rect.right >= centreX &&
        rect.top <= centreY &&
        rect.bottom >= centreY;
      if (covers && Math.min(rect.width, rect.height) > Math.min(hit.width, hit.height)) hit = rect;
    }

    // A data cell, or a panel's dense stack: two places where the room a target
    // would grow into is the next target's, and one floor for both.
    const dense = element.closest("td, th") !== null || element.matches(denseList);
    const sameActionAsItsRow = element.matches(equivalent);
    if (dense || sameActionAsItsRow) exempt += 1;
    if (sameActionAsItsRow) continue;

    /*
      Rounded, and compared rounded. A control drawn 28px tall inside an 8px
      transparent border is 44 by construction and 43.59 by measurement, because
      its height is a line box rather than a number — and holding a design to a
      float it cannot express would force the ink to move to satisfy the gate,
      which is the opposite of what the gate is for. Half a pixel of slack; a
      control that is actually short still fails.
    */
    const width = Math.round(hit.width);
    const height = Math.round(hit.height);
    const floor = dense ? denseMinimum : minimum;
    if (width >= floor && height >= floor) continue;

    const classes = Array.from(element.classList);
    const marker = classes.find((name) => name.startsWith("rf-")) ?? classes[0];
    const label = `${element.tagName.toLowerCase()}${marker ? `.${marker}` : ""}`;
    // One line per kind of control, not per instance: sixty rows with the same
    // undersized row action is one fault reported sixty times.
    const key = `${label}|${width}x${height}|${floor}`;
    const seen = under.get(key);
    if (seen) {
      seen.count += 1;
      continue;
    }
    under.set(key, {
      label,
      width,
      height,
      floor,
      dense,
      name: (element.textContent || element.getAttribute("aria-label") || "").trim().slice(0, 32),
      count: 1,
    });
  }

  return { under: Array.from(under.values()), exempt, measured };
};

/*
  No view opens a detail modal on load, and the overflow was reported inside
  one — so the script has to perform the gesture a reader performs. Every table
  row is a plain `<tr onClick>` (see Table.tsx and SetsTable.tsx) that selects
  the row and hands DetailPane something to draw; the spacer rows the virtualiser
  pads with carry aria-hidden and are not clickable, hence the :not().

  Ducanetor and Endo are rankings with nothing to open — DetailPane returns null
  for both — and the Wishlist opens a panel only for a set line, which an empty
  wishlist has none of. Those three are measured without a modal and say so.

  The Tier List is a ranking that DOES open one now: its rows open the same
  relic panel Relics opens, so the panel has to be measured on the narrow
  canvas from there too.
*/
const OPENS_A_MODAL = new Set(["relics", "prime items", "sets", "wishlist", "tier list"]);

/*
  The other thing a reader opens, and the second half of what "as it loads" was
  hiding. `Filters` is a disclosure on the two catalogue views, shut on first
  paint (useViewState starts it false), and behind it are two sliders, nine
  toggles and a chip set that nothing in this walk had ever measured — plus a
  whole band of layout appearing above a results pane that has to give up the
  height for it.

  Found by the button's own `aria-controls` rather than by a list of views:
  a third view growing a filter drawer should be measured because it has one,
  not because somebody remembered to add it here.
*/
const FILTER_TOGGLE = 'button[aria-controls="rf-filter-bar"]';

const openFilters = async (page) => {
  const toggle = page.locator(FILTER_TOGGLE);
  if ((await toggle.count()) === 0) return "no filter drawer on this view";

  await toggle.click();
  try {
    await page.locator("#rf-filter-bar").waitFor({ state: "visible", timeout: 3000 });
  } catch {
    return "clicked Filters, no drawer appeared";
  }
  return null;
};

const openModal = async (page) => {
  const row = page.locator("tbody tr:not([aria-hidden='true'])").first();
  if ((await row.count()) === 0) return "no rows to click";

  await row.click();
  try {
    await page.locator(".rf-modal").waitFor({ state: "visible", timeout: 3000 });
  } catch {
    return "clicked the first row, no modal appeared";
  }
  // The panels fill from their own requests — drop sites, prices, the pieces of
  // a set — and a panel measured before they land is measured half empty.
  await page.waitForTimeout(1200);
  return null;
};

/**
 * The line to print under a vertical overflow, and the reason the two numbers
 * in it are worth the space.
 *
 * `html` counting more than `body` is not a bigger version of "something is too
 * tall": it is a different fault. Every box in the flow measures the viewport
 * exactly, so nothing looks wrong from any element on the page, and the height
 * comes from a box whose containing block is the INITIAL one — absolutely
 * positioned with no positioned ancestor, clipped by no `overflow` between
 * itself and the root. Both numbers growing together is the ordinary case
 * instead: content in the flow that does not fit, which the offender walk
 * below names directly.
 */
const diagnoseHeight = ({ scrollHeight, bodyScrollHeight, clientHeight }) =>
  bodyScrollHeight - clientHeight <= TOLERANCE
    ? `html.scrollHeight ${scrollHeight} against body.scrollHeight ${bodyScrollHeight} — the body ` +
      `does not count what the root counts, so this is a box positioned against the initial ` +
      `containing block, not content in the flow`
    : `html.scrollHeight ${scrollHeight} against body.scrollHeight ${bodyScrollHeight} — both grew, ` +
      `so this is content in the flow that does not fit`;

/**
 * The document's own box, reported under the name of the state it was measured
 * in, and how many failures that is.
 *
 * A function rather than a block in the walk because a view has more than one
 * state and the same three sentences are true of all of them: the reader opens
 * a filter drawer, the reader opens a panel, and neither of those was ever
 * measured. The state's name goes in the line rather than in a header above it,
 * so a failure says which state it was in without being read in context.
 */
const measureDocument = async (page, where) => {
  const doc = await page.evaluate(DOCUMENT_OVERFLOW);
  const sideways = doc.scrollWidth - doc.clientWidth;
  const down = doc.scrollHeight - doc.clientHeight;
  const badX = sideways > TOLERANCE;
  const badY = down > TOLERANCE;

  console.log(
    `${badX || badY ? "FAIL" : "ok  "}  ${where}: document ${doc.scrollWidth}x${doc.scrollHeight} ` +
      `in ${doc.clientWidth}x${doc.clientHeight}` +
      `${badX ? ` — ${sideways}px sideways` : ""}${badY ? ` — ${down}px down` : ""}`,
  );
  if (badY) console.log(`   ?  ${diagnoseHeight(doc)}`);

  // Two axes, two failures: they are two different faults with two different
  // fixes, and a view that does both should not report as one.
  return { ...doc, badX, badY, failures: (badX ? 1 : 0) + (badY ? 1 : 0) };
};

/** The panes' boxes, and how many of them have been squeezed out of existence. */
const reportScrollers = (boxes, where) => {
  let collapsed = 0;

  for (const scroller of boxes) {
    if (scroller.height >= COLLAPSED_UNDER) {
      // Said out loud rather than left silent, because zero rows in a scroller
      // that HAS height is the one shape of "nothing here" that is allowed, and
      // the reader of a green run is owed which one this is.
      if (scroller.rows === 0) {
        console.log(
          `      ${where}: no rows in a ${scroller.width}x${scroller.height} scroller — ` +
            `an empty list, not a collapsed one`,
        );
      }
      continue;
    }
    collapsed += 1;
    console.log(
      `FAIL  ${where}: ${scroller.label} is ${scroller.width}x${scroller.height} — collapsed, ` +
        `so the table inside it renders nothing`,
    );
  }

  return collapsed;
};

/** Rule 7 over whatever is on screen, under the name of the state it is in. */
const measureTouch = async (page, where) => {
  const touch = await page.evaluate(TOUCH_TARGETS, [TOUCH_MIN, DENSE_MIN, EQUIVALENT, DENSE]);

  if (touch.under.length > 0) {
    console.log(`FAIL  ${where}: ${touch.under.length} control(s) under the rule 7 minimum`);
    for (const control of touch.under) {
      console.log(
        `   !  ${control.label} — ${control.width}x${control.height}, needs ` +
          `${control.floor}${control.dense ? " (in a data cell)" : ""}` +
          `${control.count > 1 ? ` (×${control.count})` : ""}` +
          `${control.name ? ` — "${control.name}"` : ""}`,
      );
    }
  }

  return { exempt: touch.exempt, failures: touch.under.length };
};

/** Names the boxes past one edge of the viewport, one line per kind. */
const nameTheCulprits = async (page, axis, clientEdge) => {
  const edge = axis === "y" ? "bottom" : "right";
  for (const culprit of await page.evaluate(OFFENDERS, [CULPRITS, TOLERANCE, axis])) {
    console.log(
      `   !  ${culprit.label} — ${edge} edge ${culprit.past} past ${clientEdge}` +
        `${culprit.count > 1 ? ` (×${culprit.count})` : ""} (${culprit.classes})`,
    );
  }
};

// Counted apart so the summary can say what failed rather than only how much:
// the three are three different rules, and the fix for one is nothing like the
// fix for another.
let reflowFailures = 0;
let collapseFailures = 0;
let touchFailures = 0;
let inconclusive = 0;
let exempted = 0;

/*
  Both engines, and what the second one costs.

  Every gate in this repository drove Chromium alone, and the defect that
  produced this measurement was invisible to Chromium by construction: Blink
  treats a table cell as the containing block for an absolutely positioned
  descendant and Gecko does not, so the same `.rf-sr-only` markup escapes every
  `overflow` between itself and the root in Firefox and is contained in Chrome.
  Containing blocks are the machinery every overflow rule in this codebase
  rests on, and the two renderers disagree about them. A single-engine gate
  does not measure the web; it measures one renderer.

  The cost was measured before it was paid, on the tree this shipped from: the
  walk is 115s in Chromium and the same again in Firefox, plus one more browser
  to install per runner. A Firefox pass measuring only the two document numbers
  was weighed and dropped — it saves 20s of that 115, because what the walk
  spends is the per-view waits rather than the measurements, so three quarters
  of the coverage was going for a sixth of the cost.

  What decided it rather than a preference: with `inset-block-start` taken off
  `.rf-sr-only`, Chromium reports a clean document on all six populated views at
  360x800, 720x475, 1440x950 AND at the 1440x572 the operator saw it at, while
  Firefox fails on Sets and the Tier List at every one of them. A gate that
  cannot fail on the defect it was written for is not a gate.
*/
const ENGINES = ["chromium", "firefox"];

for (const engineName of ENGINES) {
  const browser = await playwright[engineName].launch();
  for (const threshold of THRESHOLDS) {
    const context = await browser.newContext({
      viewport: { width: threshold.width, height: threshold.height },
    });
    const page = await context.newPage();

    console.log(
      `\n— ${engineName} · ${threshold.name} (${threshold.width}x${threshold.height} CSS px)`,
    );

    for (const [name, path] of VIEWS) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });

      if (threshold.rootFontSize) {
        await page.evaluate((size) => {
          document.documentElement.style.fontSize = size;
        }, threshold.rootFontSize);
      }

      /*
        The tables fill from a second request, and the two rankings from the price
        cache behind it, which on a cold start answers well after `networkidle`
        has gone quiet. A flat sleep made Ducanetor and Endo report no rows on one
        threshold and two hundred on the next, from the same build — so wait for a
        row and only then let the layout settle. The wait is allowed to expire:
        the Wishlist is legitimately empty, and that is a finding rather than an
        error.
      */
      const dataRows = page.locator("tbody tr:not([aria-hidden='true'])");
      await dataRows
        .first()
        .waitFor({ state: "attached", timeout: 15000 })
        .catch(() => {});
      await page.waitForTimeout(1500);

      const doc = await measureDocument(page, name);
      reflowFailures += doc.failures;

      /*
        The state of the panes, before anything inside them is measured. A view
        drawing its error state is reported and skipped: every measurement below
        would come back clean off an empty page, and clean is exactly the wrong
        answer to give for a view that never received its data.
      */
      const { boxes, errored } = await page.evaluate(SCROLLERS);

      if (errored) {
        inconclusive += 1;
        console.log(`??    ${name}: drawing its error state — nothing on this view was measured`);
        continue;
      }

      collapseFailures += reportScrollers(boxes, name);

      const touch = await measureTouch(page, name);
      exempted += touch.exempt;
      touchFailures += touch.failures;

      if (doc.badX) await nameTheCulprits(page, "x", doc.clientWidth);
      if (doc.badY) await nameTheCulprits(page, "y", doc.clientHeight);

      /*
        The filter drawer, measured and then shut again. Shut again because
        everything below this measures the panel, and a panel opened over an
        open drawer is a third state rather than the second one — the modal
        numbers would stop being comparable with the run before it.
      */
      const noDrawer = await openFilters(page);
      if (noDrawer === null) {
        const drawer = `${name} · filters open`;
        const drawerDoc = await measureDocument(page, drawer);
        reflowFailures += drawerDoc.failures;
        if (drawerDoc.badX) await nameTheCulprits(page, "x", drawerDoc.clientWidth);
        if (drawerDoc.badY) await nameTheCulprits(page, "y", drawerDoc.clientHeight);

        collapseFailures += reportScrollers((await page.evaluate(SCROLLERS)).boxes, drawer);

        const drawerTouch = await measureTouch(page, drawer);
        exempted += drawerTouch.exempt;
        touchFailures += drawerTouch.failures;

        await page.locator(FILTER_TOGGLE).click();
      }

      const cells = await page.evaluate(CELL_OVERFLOW, TOLERANCE);
      if (cells.escaping.length > 0) {
        reflowFailures += 1;
        console.log(`FAIL  ${name}: ${cells.escaping.length} column(s) with content past the cell`);
        for (const escapee of cells.escaping) {
          console.log(
            `   !  ${escapee.table} col ${escapee.column} (${escapee.heading}): ` +
              `${escapee.label} overflows by ${escapee.over}px`,
          );
        }
      }
      if (cells.clipped > 0) {
        console.log(
          `      ${cells.clipped} cell(s) with text ellipsised — by design, see .rf-table`,
        );
      }

      if (!OPENS_A_MODAL.has(name)) continue;

      const why = await openModal(page);
      if (why) {
        console.log(`      modal: ${why}`);
        continue;
      }

      const modal = await page.evaluate(MODAL_OVERFLOW, [CULPRITS, TOLERANCE]);
      // `MODAL_OVERFLOW` answers null when there is no `.rf-modal` to measure,
      // which openModal's wait normally rules out — but a panel that unmounts
      // while its own requests land would otherwise take the whole run down with
      // a TypeError on the next line, and losing five views to one flake is
      // worse than saying the measurement did not happen.
      if (!modal) {
        console.log(`      modal: it closed before it could be measured`);
        continue;
      }
      const bodyScrolls =
        modal.bodyScrollWidth !== null && modal.bodyScrollWidth - modal.bodyClientWidth > TOLERANCE;
      const modalBad = modal.escaped.length > 0 || bodyScrolls;

      if (modalBad) reflowFailures += 1;

      console.log(
        `${modalBad ? "FAIL" : "ok  "}  ${name} modal: frame ${modal.frameWidth}px in a ` +
          `${modal.viewportWidth}px viewport, body ${modal.bodyScrollWidth} vs ` +
          `${modal.bodyClientWidth}`,
      );

      for (const escapee of modal.escaped) {
        console.log(
          `   !  ${escapee.label} — ${escapee.width}px wide, right edge ${escapee.right} ` +
            `past the frame's ${modal.frameRight}`,
        );
      }

      /*
        Rule 7 inside the panel, which is where the densest controls in the
        application are: the info toggles beside every heading, the quantity
        steppers up to fourteen at a time, the close, the owned marks on a set.
        None of them is inside a `<td>`, so §5.4's data-cell exception does not
        reach them — they are exactly the standalone shape it says is not
        excused, and until now nothing had ever measured one.
      */
      const panelTouch = await measureTouch(page, `${name} · panel open`);
      exempted += panelTouch.exempt;
      touchFailures += panelTouch.failures;

      // The document can start scrolling only once the modal is open: the scrim
      // is fixed, but what is inside it is not always contained.
      const withModal = await page.evaluate(DOCUMENT_OVERFLOW);
      const modalSideways = withModal.scrollWidth - withModal.clientWidth;
      const modalDown = withModal.scrollHeight - withModal.clientHeight;

      if (modalSideways > TOLERANCE) {
        reflowFailures += 1;
        console.log(`FAIL  ${name} modal: the document now scrolls ${modalSideways}px sideways`);
        await nameTheCulprits(page, "x", withModal.clientWidth);
      }
      if (modalDown > TOLERANCE) {
        reflowFailures += 1;
        console.log(`FAIL  ${name} modal: the document now scrolls ${modalDown}px down`);
        console.log(`   ?  ${diagnoseHeight(withModal)}`);
        await nameTheCulprits(page, "y", withModal.clientHeight);
      }
    }

    await context.close();
  }
  await browser.close();
}

/*
  What green covers, said out loud.

  Two of the three measurements above are allowed not to fail on something they
  saw: a control inside a data cell is held to 24px rather than 44px, and a
  scroller with height and no rows in it is an empty list rather than a
  collapsed pane. Both are decisions rather than oversights — AGENTS.md §5.4
  carries them — and both are the kind of decision that reads as a bug to
  whoever finds it later without the count in front of them.

  An inconclusive view exits non-zero, and that is the answer to the question
  the brief left open. The fault this script exists to catch shipped as a
  footnote under a green headline; a view whose data never arrived is a
  measurement that did not happen, and CI answering "did it pass?" with yes
  would be the same mistake in a new place. With the collapse measurement in
  place the only remaining way to land here is a backend that never answered,
  which in CI is a broken run rather than a passing one.
*/
if (exempted > 0) {
  console.log(
    `\n${exempted} control measurement(s) were held to a written exception ` +
      `(AGENTS.md §5.4): the ${DENSE_MIN}px floor of a data cell or a panel's dense stack, ` +
      `or a control whose own row does the same thing.`,
  );
}

if (inconclusive > 0) {
  console.log(
    `${inconclusive} view(s) were drawing their error state and measured nothing. ` +
      `Bring the backend up and run it again — this is not a pass.`,
  );
}

const failures = reflowFailures + collapseFailures + touchFailures;
console.log(
  `\n${failures} failure(s) across ${VIEWS.length} views, ${THRESHOLDS.length} thresholds and ` +
    `${ENGINES.length} engine(s) (${ENGINES.join(", ")}) — ${reflowFailures} reflow, ` +
    `${collapseFailures} collapsed container, ${touchFailures} touch target`,
);
if (failures > 0 || inconclusive > 0) process.exit(1);
