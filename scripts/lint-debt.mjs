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
    baseline: 47,
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
    baseline: 11,
    extensions: [".tsx"],
    pattern: /fontSize:\s*[0-9]/g,
    hint: "use a --rf-text-* token in CSS",
  },
  {
    /*
      AGENTS.md §5.2's rule, made mechanical: `--rf-fg-disabled` is bone 600 at
      2.57:1, and WCAG exempts that only for a control that is actually
      disabled. Text carrying information is not disabled text, whatever it is
      standing in for.

      A rule rather than a baseline, and it is at zero because the tree is at
      zero: the three places that had drifted onto this token were each found
      by a person rather than by a gate — `Unlisted`, `.rf-highlight-rank`, and
      `.rf-phase-unknown` on 2026-09-03, which axe reported only because a key
      in the search band happened to print all four phases on every load.

      NOTHING IN A BROWSER CATCHES THIS. Measured on 2026-09-03 with an unpriced
      item forced onto the page: the em dash rendered at rgb(92, 86, 72) and
      axe-core returned zero colour-contrast violations for it, so a green
      `npm run axe` says nothing at all about this class of fault. That is the
      reason the check is here, in the source, rather than in the walk.
    */
    name: "fg-disabled outside a :disabled rule",
    baseline: 0,
    extensions: [".css"],
    count: countUndisabled,
    hint: "text that carries information is not disabled text — see AGENTS.md §5.2",
  },
];

/**
 * Uses of the disabled tone in a rule whose selector never says `:disabled`.
 *
 * Blocks are split on the brace rather than parsed, which is enough for this
 * file's flat CSS and wrong for nesting — if a rule ever nests, this reads the
 * inner selector and that is the one it should be reading anyway.
 *
 * `tokens.css` is skipped: it is generated, and the line that DEFINES the token
 * is not a use of it.
 */
function countUndisabled(source, file) {
  if (file.endsWith("tokens.css")) return 0;

  let count = 0;
  for (const block of source.split("}")) {
    const brace = block.lastIndexOf("{");
    if (brace === -1) continue;

    const selector = block.slice(0, brace);
    const body = block.slice(brace);
    if (selector.includes(":disabled")) continue;

    count += body.match(/--rf-fg-disabled/g)?.length ?? 0;
  }
  return count;
}

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
    .reduce((total, file) => {
      const source = readFileSync(file, "utf8");
      // A counter either matches a shape or asks a question a regex cannot:
      // "is this use inside a rule that says :disabled" is the second kind.
      return total + (counter.count?.(source, file) ?? source.match(counter.pattern)?.length ?? 0);
    }, 0);

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
