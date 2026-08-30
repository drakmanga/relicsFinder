/**
 * What the read budget does, measured in minutes instead of days.
 *
 * The intervals in this app are earned rather than configured: an item is
 * re-read, the drift its price showed is compared with the drift it is allowed,
 * and the interval moves by the square of the miss — damped, so one reading
 * never moves it by more than half. Watching that settle means waiting for the
 * intervals themselves, days of them, and a change to the rule cannot be
 * checked against a wait like that.
 *
 * So the clock is moved instead of the tester. A copy of the price cache has
 * every chosen reading's `at` pushed back, which is the only thing telling a
 * fresh entry from an expired one, and a second instance is handed the copy on
 * its own port with its own paths. It sees a catalogue that expired while it
 * was not running, re-reads it, and earns a new interval per item against the
 * real market. Repeat that and the intervals walk to where they would have been
 * after that many days.
 *
 * IT SPENDS REAL REQUESTS: one per entry aged, per pass, at the rate
 * MarketRateLimiter allows. The default is about two hundred entries and four
 * minutes a pass.
 *
 * Usage: node scripts/aging-probe.mjs [--hours=25] [--passes=4] [--port=8081]
 *
 *   --hours   how far back to push each reading. Past the 24h ceiling by
 *             default, so everything aged is expired and gets re-read.
 *   --passes  how many days to simulate. One pass shows the direction, four
 *             show where the interval settles, because the damping holds each
 *             reading to half the interval it had.
 *
 * WHAT IS AGED, and this is the point of the run: the entries `RankSensitivity`
 * names — the prices that can reorder the head of the Tier List — and an equal
 * number that it does not, as the control. The two groups start in the same
 * place, are aged by the same amount on the same passes, and the measurement is
 * whether they separate.
 *
 * The operator's own `data/` is never touched: the copy, the wishlist and the
 * unknown-item report live in a temporary directory the run deletes.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SECONDS_A_DAY = 86_400;

const arg = (name, fallback) => {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`));
  return found ? Number(found.split("=")[1]) : fallback;
};

const HOURS = arg("hours", 25);
const PASSES = arg("passes", 4);
const PORT = arg("port", 8081);

const workspace = mkdtempSync(join(tmpdir(), "aging-probe-"));
const cachePath = join(workspace, "price-cache.json");
const status = () => fetch(`http://localhost:${PORT}/api/market/status`).then((r) => r.json());

/** Reads a day the whole cache is asking for, and how the two groups sit. */
function budget(cache, sensitive, control) {
  const reads = (slugs) =>
    slugs.reduce(
      (total, slug) => total + (cache[slug]?.ttl ? SECONDS_A_DAY / cache[slug].ttl : 0),
      0,
    );
  const median = (slugs) => {
    const hours = slugs
      .map((slug) => cache[slug]?.ttl)
      .filter(Boolean)
      .map((ttl) => ttl / 3600)
      .sort((a, b) => a - b);
    return hours.length ? hours[Math.floor(hours.length / 2)] : 0;
  };
  const all = Object.entries(cache).filter(([, entry]) => entry.ttl);

  return {
    total: Math.round(all.reduce((sum, [, entry]) => sum + SECONDS_A_DAY / entry.ttl, 0)),
    sensitiveReads: Math.round(reads(sensitive)),
    controlReads: Math.round(reads(control)),
    sensitiveMedian: median(sensitive),
    controlMedian: median(control),
  };
}

const report = (label, b) =>
  console.log(
    `${label.padEnd(8)} ${String(b.total).padStart(5)} reads/day · ranked ${b.sensitiveMedian
      .toFixed(1)
      .padStart(4)}h median, ${String(b.sensitiveReads).padStart(4)}/day` +
      ` · control ${b.controlMedian.toFixed(1).padStart(4)}h median, ${String(b.controlReads).padStart(4)}/day`,
  );

/**
 * Runs the instance until its queue has been empty and quiet for a while.
 *
 * `collect` is asked its question while the instance is still up. It has to be:
 * the allocation lives in memory and goes with the process, and only the
 * intervals it earned survive into the file.
 */
async function drain(collect = async () => null) {
  const server = spawn(
    "./mvnw",
    [
      "--batch-mode",
      "--quiet",
      "spring-boot:run",
      `-Dspring-boot.run.arguments=--server.port=${PORT} ` +
        `--relics.price-cache.path=${cachePath} ` +
        `--relics.wishlist.path=${join(workspace, "wishlist.json")} ` +
        `--relics.unknown-items.path=${join(workspace, "unknown-items.txt")}`,
    ],
    { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] },
  );

  // An empty queue is not the end of the work: the sweep hands out one name
  // every five seconds, so an empty queue is also the state between two of
  // them. Quiet means the queue stayed empty AND the revision stopped moving.
  let quiet = 0;
  let previous = -1;
  let last = null;

  for (let i = 0; i < 360 && quiet < 6; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    try {
      last = await status();
    } catch {
      continue;
    }
    quiet = last.queued > 0 || last.revision !== previous ? 0 : quiet + 1;
    previous = last.revision;
    process.stdout.write(
      `\r  queued ${String(last.queued).padStart(4)} · ${last.revision} changed `,
    );
  }
  process.stdout.write("\r".padEnd(60) + "\r");

  const collected = await collect();

  // SIGTERM, not a kill: the shutdown hook is what writes the cache out, and
  // the intervals it earned are the whole measurement.
  server.kill("SIGTERM");
  await new Promise((resolve) => server.on("exit", resolve));
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return { status: last, collected };
}

try {
  const original = JSON.parse(readFileSync(join(ROOT, "data/price-cache.json"), "utf8"));
  writeFileSync(cachePath, JSON.stringify(original));

  // Nothing is aged for this one, so it costs no requests: it is here to be
  // asked which entries the allocation names.
  console.log("reading the allocation…");
  const first = await drain(() =>
    fetch(`http://localhost:${PORT}/api/market/sensitive`)
      .then((r) => r.json())
      .catch(() => ({})),
  );
  const sensitive = Object.keys(first.collected ?? {}).filter((slug) => original[slug]?.ttl);

  if (sensitive.length === 0) {
    console.log("the allocation named nothing — is the cache priced?", first.status);
    process.exit(1);
  }

  // The control is the same size and picked without looking at anything the
  // rule uses: the first names in the file that the rule did not name.
  const control = Object.keys(original)
    .filter((slug) => original[slug].ttl && !sensitive.includes(slug))
    .slice(0, sensitive.length);

  console.log(
    `${sensitive.length} entries named by the ranking, ${control.length} as the control,` +
      ` aged ${HOURS}h per pass\n`,
  );
  report("before", budget(original, sensitive, control));

  for (let pass = 1; pass <= PASSES; pass++) {
    const cache = JSON.parse(readFileSync(cachePath, "utf8"));
    for (const slug of [...sensitive, ...control]) cache[slug].at -= HOURS * 3600 * 1000;
    writeFileSync(cachePath, JSON.stringify(cache));

    await drain();
    report(`day ${pass}`, budget(JSON.parse(readFileSync(cachePath, "utf8")), sensitive, control));
  }
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
