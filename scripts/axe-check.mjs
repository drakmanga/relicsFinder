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
];

const BLOCKING = new Set(["serious", "critical"]);

// An explicit context, because axe refuses a page created by browser.newPage:
// it injects into every frame and needs the context to enumerate them.
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
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
