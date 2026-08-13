/**
 * Mutation check: a suite that cannot fail is not a suite.
 *
 * Each entry breaks one real behaviour the tests claim to protect. The suite
 * must go red for every one of them; a mutant that survives means the assertion
 * describing it is decorative.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url).pathname;

const MUTANTS = [
  {
    name: "matchesRelic stops guarding a complete code",
    file: "apps/web/src/lib/rows.ts",
    from: "if (!/[0-9]$/.test(term)) return name.includes(term);",
    to: "return name.includes(term);",
  },
  {
    name: "squadValue averages instead of taking the best of n",
    file: "apps/web/src/lib/rows.ts",
    from: "total += value * (Math.pow(tailAbove, players) - Math.pow(tailBelow, players));",
    to: "total += value * (tailAbove - tailBelow);",
  },
  {
    name: "expectedValue forgets the drop chance is a percentage",
    file: "apps/web/src/lib/rows.ts",
    from: "(sum, reward) => sum + (reward.chance / 100) * (prices.get(reward.itemName)?.averagePrice ?? 0),",
    to: "(sum, reward) => sum + reward.chance * (prices.get(reward.itemName)?.averagePrice ?? 0),",
  },
  {
    name: "the relic ceiling drops relics with nothing listed",
    file: "apps/web/src/lib/rows.ts",
    from: "return best === null || best <= maxPrice;",
    to: "return best !== null && best <= maxPrice;",
  },
  {
    name: "sortRelicRows puts the unpriced relics first",
    file: "apps/web/src/lib/rows.ts",
    from: "if (av === null) return 1;",
    to: "if (av === null) return -1;",
  },
  {
    name: "bestRefinementByTrace accepts a losing trade",
    file: "apps/web/src/lib/rows.ts",
    from: "if (rate <= 0) return best;",
    to: "if (rate < -1e9) return best;",
  },
  {
    name: "the item ceiling excludes a part priced exactly at it",
    file: "apps/web/src/lib/items.ts",
    from: "return price == null || price <= maxPrice;",
    to: "return price == null || price < maxPrice;",
  },
  {
    name: "buildItemRows keeps the quantity rewards ahead of the A's",
    file: "apps/web/src/lib/items.ts",
    from: "Number(startsWithQuantity(a.itemName)) - Number(startsWithQuantity(b.itemName)) ||",
    to: "",
  },
  {
    name: "synthesiseItemRow reads any refinement, not Intact",
    file: "apps/web/src/lib/items.ts",
    from: 'if (relic.refinement !== "intact") continue;',
    to: "",
  },
  {
    name: "setOf matches Prime inside a longer word",
    file: "apps/web/src/lib/sets.ts",
    from: 'const index = words.findIndex((word) => word.toLowerCase() === "prime");',
    to: 'const index = words.findIndex((word) => word.toLowerCase().includes("prime"));',
  },
  {
    name: "the farm cost stops subtracting what the runs hand back",
    file: "apps/web/src/lib/setCompletion.ts",
    from: "? runs * (relicPrice - source.expected) + price",
    to: "? runs * relicPrice + price",
  },
  {
    name: "a missing price stops flagging the total as incomplete",
    file: "apps/web/src/lib/setCompletion.ts",
    from: "costIncomplete: missing.some((part) => part.price === null),",
    to: "costIncomplete: false,",
  },
  {
    name: "verdictFor gives a tie to farming",
    file: "apps/web/src/lib/setCompletion.ts",
    from: 'return part.price <= part.netFarmCost ? "buy" : "farm";',
    to: 'return part.price < part.netFarmCost ? "buy" : "farm";',
  },
  {
    name: "verdictFor guesses instead of admitting it cannot tell",
    file: "apps/web/src/lib/setCompletion.ts",
    from: 'if (part.price === null || part.netFarmCost === null) return "unknown";',
    to: "",
  },
  {
    name: "fromSearch trusts a view name it does not know",
    file: "apps/web/src/lib/urlState.ts",
    from: '(allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;',
    to: "(raw as T) ?? fallback;",
  },
  {
    name: "toSearch treats a ceiling of zero as no ceiling",
    file: "apps/web/src/lib/urlState.ts",
    from: 'if (filters.maxPrice !== null) params.set("max", String(filters.maxPrice));',
    to: 'if (filters.maxPrice) params.set("max", String(filters.maxPrice));',
  },
  {
    name: "marketUrl strips the suffix off the set's own blueprint",
    file: "apps/web/src/lib/format.ts",
    from: 'if (remainder.includes("prime") && !remainder.endsWith("prime")) {',
    to: 'if (remainder.includes("prime")) {',
  },
  {
    name: "stillFilling waits for the untraded parts too",
    file: "apps/web/src/api/queries.ts",
    from: "return missing > values.length * PRICE_RESIDUE;",
    to: "return missing > 0;",
  },
  {
    name: "the residue boundary lets one price too many count as a wait",
    file: "apps/web/src/api/queries.ts",
    from: "return missing > values.length * PRICE_RESIDUE;",
    to: "return missing >= values.length * PRICE_RESIDUE;",
  },
  {
    name: "progress forgets a first request is a wait of its own",
    file: "apps/web/src/lib/priceProgress.ts",
    from: "if (!prices) return { ...NOTHING, filling: pending };",
    to: "if (!prices) return NOTHING;",
  },
  {
    name: "the estimate waits for prices that never arrive",
    file: "apps/web/src/lib/priceEta.ts",
    from: "const target = total * (1 - PRICE_RESIDUE);",
    to: "const target = total;",
  },
  {
    name: "a stalled queue keeps promising the wait it promised before",
    file: "apps/web/src/lib/priceEta.ts",
    from: "if (!last || now - last.at < STALL_AFTER_MS) return samples;",
    to: "if (!last) return samples;\n  return samples;",
  },
  {
    name: "the half-poll reading stays in the window",
    file: "apps/web/src/lib/priceEta.ts",
    from: "const burst = last && next.at - last.at < COALESCE_MS && next.total === last.total;",
    to: "const burst = false;",
  },
  {
    name: "coalescing swallows the first reading of a new batch",
    file: "apps/web/src/lib/priceEta.ts",
    from: "const burst = last && next.at - last.at < COALESCE_MS && next.total === last.total;",
    to: "const burst = last && next.at - last.at < COALESCE_MS;",
  },
];

let killed = 0;
const survivors = [];

for (const mutant of MUTANTS) {
  const path = `${ROOT}/${mutant.file}`;
  const original = readFileSync(path, "utf8");

  if (!original.includes(mutant.from)) {
    survivors.push(`${mutant.name} — PATTERN NOT FOUND, mutation never applied`);
    continue;
  }

  writeFileSync(path, original.replace(mutant.from, mutant.to));

  let failed = false;
  try {
    execSync("npx vitest run --silent", { cwd: ROOT, stdio: "pipe" });
  } catch {
    failed = true;
  }

  writeFileSync(path, original);

  if (failed) {
    killed += 1;
    console.log(`  killed   ${mutant.name}`);
  } else {
    survivors.push(mutant.name);
    console.log(`  SURVIVED ${mutant.name}`);
  }
}

console.log(`\n${killed}/${MUTANTS.length} mutants killed`);
if (survivors.length > 0) {
  console.log("\nSurvivors — the tests do not actually check these:");
  for (const s of survivors) console.log(`  - ${s}`);
  process.exit(1);
}
