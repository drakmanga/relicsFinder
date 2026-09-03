/**
 * Runs axe over every view and fails on anything serious or critical.
 *
 * Against a preview build, not the dev server: dev injects its own overlay and
 * client, and a violation reported on markup the user never receives is a
 * violation nobody can fix.
 *
 * The backend does not have to be up. Without it the views render their error
 * state, which is markup that ships and is worth checking too — but the tables
 * are then empty, so run it with the API for full coverage.
 *
 * WITH ONE ITEM THE MARKET DOES NOT QUOTE, because otherwise this walk never
 * renders the markup that stands in for a price. See `UNPRICED` below.
 *
 * Usage: npm run preview, then `node scripts/axe-check.mjs [baseUrl]`.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;

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

const BLOCKING = new Set(["serious", "critical"]);

/**
 * How many items the walk takes the price away from.
 *
 * An absent price is a real state with its own markup, and on a machine whose
 * price cache is warm it renders NOWHERE. Measured on 2026-09-03: zero
 * occurrences across all seven views, at rest and with a panel open. So this
 * walk was green about markup it had never seen, in exactly the way
 * `npm run reflow` was green about a control that only exists once a wishlist
 * has a line in it (AGENTS.md §5.4, decided 2026-09-01).
 *
 * WHAT THIS DOES NOT BUY, said here so nobody claims it later. The fault that
 * prompted the stub was the disabled tone on that markup, and axe never saw it:
 * with the dash forced onto the page at rgb(92, 86, 72) — 2.57:1 — axe-core
 * returned zero colour-contrast violations for the node, and one `incomplete`
 * about a different element entirely. A colour on a glyph like this is not
 * something this walk can be made to catch, and the check that does catch it is
 * `npm run lint:debt`, in the source. What the stub buys is that the markup is
 * audited at all: it carries an `aria-hidden` glyph and a screen-reader label
 * now, and those are rules axe does evaluate.
 *
 * Three, and the number is bounded from above rather than chosen for taste.
 * `stillFilling` reads a batch as settled once fewer than `PRICE_RESIDUE` of it
 * is missing — five per cent, about 37 of the 755 items — and above that line
 * every cell shows a skeleton instead, which is a different state and not the
 * one being measured. Three is far enough under it to stay on the right side
 * whatever the catalogue does next.
 *
 * The rest of the response is the backend's own. Nulling a field of a real
 * answer keeps every other view measuring what it measures today.
 */
const UNPRICED = 3;

/**
 * Takes the price off the first few items of every batch.
 *
 * By position rather than by name: the catalogue is refreshed daily and a
 * fixture naming "Volt Prime Neuroptics" is a fixture that goes stale on a
 * release. What matters is that SOME item on screen has no price, never which.
 */
const unprice = async (context) => {
  await context.route("**/api/market/items", async (route) => {
    const response = await route.fetch();
    const prices = await response.json();

    for (const price of prices.slice(0, UNPRICED)) {
      price.averagePrice = null;
      price.median = null;
    }

    await route.fulfill({ response, json: prices });
  });
};

// An explicit context, because axe refuses a page created by browser.newPage:
// it injects into every frame and needs the context to enumerate them.
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await unprice(context);
const page = await context.newPage();

let blocking = 0;
let advisory = 0;

for (const [name, path] of VIEWS) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  // The tables fill from a second request; auditing before it lands audits a
  // skeleton.
  await page.waitForTimeout(1500);

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const serious = violations.filter((violation) => BLOCKING.has(violation.impact));
  const minor = violations.filter((violation) => !BLOCKING.has(violation.impact));

  blocking += serious.length;
  advisory += minor.length;

  const mark = serious.length === 0 ? "ok  " : "FAIL";
  console.log(`${mark}  ${name}: ${serious.length} serious/critical, ${minor.length} advisory`);

  for (const violation of [...serious, ...minor]) {
    const flag = BLOCKING.has(violation.impact) ? "  !" : "   ";
    console.log(`${flag} [${violation.impact}] ${violation.id}: ${violation.help}`);
    for (const node of violation.nodes.slice(0, 3)) {
      console.log(`      ${node.target.join(" ")}`);
    }
    if (violation.nodes.length > 3) {
      console.log(`      …and ${violation.nodes.length - 3} more`);
    }
  }
}

await browser.close();

console.log(`\n${blocking} serious or critical, ${advisory} advisory across ${VIEWS.length} views`);
if (blocking > 0) process.exit(1);
