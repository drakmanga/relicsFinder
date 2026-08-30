/**
 * A relic crossing a neighbour in a tab nobody touched.
 *
 * The other half of `aging-probe.mjs`. That one measures what the server does
 * with its reads; this one measures whether any of it reaches a browser that
 * has been open since the morning — which it did not, for as long as the Tier
 * List has existed: both price queries stop polling once their batch is
 * complete, and the client does not refetch on window focus.
 *
 * The market's own answers are faked so the crossing is exact rather than
 * waited for. Two relics whose rare drop appears in no other relic sit next to
 * each other at the top of the ranking; the first batch of prices puts one
 * above the other; the marker on `/api/market/status` then moves, and the
 * second batch swaps them. The page is never reloaded and never touched.
 *
 * It also measures the other half of the promise, first: seventy-five seconds
 * with the marker held still, which is two status polls, must cost the tab
 * nothing at all. A timer would have fetched six hundred prices by then.
 *
 * The relic catalogue still comes from a real backend — only the market
 * endpoints are faked — so this needs `npm run build`, `npm run preview`, and a
 * backend up. It spends no requests against warframe.market.
 *
 * Usage: node scripts/open-tab-probe.mjs [http://localhost:4173]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:4173";

/**
 * Two relics whose rare drop is theirs alone, so one price each decides them.
 *
 * Every other part is quoted at 1p, which puts every other relic at about 1p:
 * Axi A2 is worth 1 + 2% x 100 = 3p and Axi A22 1 + 2% x 150 = 4p, until the
 * swap takes A2 to 1 + 2% x 200 = 5p and the two change places.
 */
const A = "Axi A2";
const RARE_A = "Aklex Prime Link";
const B = "Axi A22";
const RARE_B = "Afentis Prime Blueprint";

/** Two status polls. The tab is expected to do nothing at all with them. */
const QUIET_MS = 75_000;

let batches = 0;
let revision = 7;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await context.newPage();

await page.route("**/api/market/status", (route) =>
  route.fulfill({
    json: { cached: 1533, fresh: 1533, queued: 0, asOf: new Date().toISOString(), revision },
  }),
);

await page.route("**/api/market/items", async (route) => {
  const names = JSON.parse(route.request().postData() ?? "[]");
  const swapped = batches > 0;
  batches += 1;
  route.fulfill({
    json: names.map((itemName) => ({
      itemName,
      averagePrice: itemName === RARE_A ? (swapped ? 200 : 100) : itemName === RARE_B ? 150 : 1,
      median: 1,
      volume: 5,
      trend: null,
      trendGap: "too-few-sales",
      slug: itemName.toLowerCase().replaceAll(" ", "_"),
      ducats: null,
      setName: null,
      category: null,
      copiesPerSet: 1,
    })),
  });
});

/*
  The function below never runs in Node: Playwright serialises it and evaluates
  it inside the page, which is why it takes the relic name as an argument rather
  than closing over one. The browser global is declared here rather than in
  eslint.config.mjs, for the reason reflow-check gives at the same line — the
  rest of the scripts have no business being handed it.
*/
/* global document */

/** Where a relic sits in the table, read off the rank column the view draws. */
const rankOf = (relic) =>
  page.evaluate((name) => {
    const row = [...document.querySelectorAll(".rf-table tbody tr")].find(
      (tr) => tr.querySelectorAll("td")[2]?.innerText.trim() === name,
    );
    return row ? Number(row.querySelector("td")?.innerText.trim()) : null;
  }, relic);

await page.goto(`${BASE}/?view=tiers`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

console.log(`before: ${A} at rank ${await rankOf(A)} · ${B} at rank ${await rankOf(B)}`);
console.log(`        ${batches} price batch(es) fetched`);

await page.waitForTimeout(QUIET_MS);
console.log(`quiet:  ${batches} price batch(es) after ${QUIET_MS / 1000}s with the marker still`);

// The server re-read something. Nothing touches the page from here on.
revision += 1;
const started = Date.now();

for (let i = 0; i < 60 && batches < 2; i++) await page.waitForTimeout(2000);

console.log(
  `after:  ${A} at rank ${await rankOf(A)} · ${B} at rank ${await rankOf(B)}` +
    ` — ${Math.round((Date.now() - started) / 1000)}s after the marker moved, no reload`,
);
console.log(`        ${batches} price batch(es) fetched`);

await browser.close();
