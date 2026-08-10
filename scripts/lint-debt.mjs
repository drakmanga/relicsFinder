/**
 * Ratchets on debt that a type checker cannot see.
 *
 * Each counter is frozen at what the repo had when the gate was written. The
 * gate never fails on the debt that is already there, only on growth — which is
 * what makes a rule adoptable on a codebase that does not yet obey it. When a
 * count drops, the baseline drops with it and the old number is never reachable
 * again.
 *
 * Lower a baseline. Never raise one.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["apps/web/src", "packages/ui/src"];

const COUNTERS = [
  {
    name: "inline styles",
    baseline: 163,
    extensions: [".tsx"],
    pattern: /style=\{\{/g,
    hint: "move visual values into a CSS class",
  },
  {
    name: "px font-size in CSS",
    baseline: 0,
    extensions: [".css"],
    // tokens.css is where the scale is authored, and it is authored in rem.
    pattern: /font-size:\s*[0-9.]+px/g,
    hint: "use a --rf-text-* token; px ignores the reader's font-size preference",
  },
  {
    name: "px fontSize in JSX",
    baseline: 13,
    extensions: [".tsx"],
    pattern: /fontSize:\s*[0-9]/g,
    hint: "use a --rf-text-* token in CSS",
  },
];

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const files = ROOTS.flatMap(walk);

let failed = false;
let loosened = false;

for (const counter of COUNTERS) {
  const count = files
    .filter((file) => counter.extensions.some((extension) => file.endsWith(extension)))
    .reduce(
      (total, file) => total + (readFileSync(file, "utf8").match(counter.pattern)?.length ?? 0),
      0,
    );

  const label = `${counter.name}: ${count} / ${counter.baseline}`;

  if (count > counter.baseline) {
    console.error(`FAIL  ${label} — ${count - counter.baseline} added. ${counter.hint}.`);
    failed = true;
  } else if (count < counter.baseline) {
    console.log(`  ok  ${label} — lower the baseline in scripts/lint-debt.mjs to ${count}`);
    loosened = true;
  } else {
    console.log(`  ok  ${label}`);
  }
}

if (failed) process.exit(1);
if (loosened)
  console.log("\nA baseline is now higher than reality. Tighten it, or it protects nothing.");
