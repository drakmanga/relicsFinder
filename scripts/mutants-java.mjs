/**
 * Mutation check for the backend, same contract as scripts/mutants.mjs.
 *
 * Each entry breaks one behaviour the Java tests claim to protect. The suite
 * must go red for every one; a survivor means the assertion describing it is
 * decorative.
 *
 * Only the service tests are run — the Spring context test boots the whole
 * application and would triple the time without changing any answer.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SERVICE = "src/main/java/relics/reliceApi/service";

const ONLY_SERVICE_TESTS =
  "-Dtest=RelicLoadServiceTest,RelicMarketServiceSlugTest,EndoServiceTest," +
  "RelicVaultedServiceTest,RelicSearchItemServiceTest -DfailIfNoTests=false";

const MUTANTS = [
  {
    name: "the Radiant rarity table stops inverting",
    file: `${SERVICE}/RelicLoadService.java`,
    from: '"radiant", Map.of(16.67, "Common", 20.0, "Uncommon", 10.0, "Rare")',
    to: '"radiant", Map.of(16.67, "Uncommon", 20.0, "Common", 10.0, "Rare")',
  },
  {
    name: "the chance tolerance widens until every chance matches",
    file: `${SERVICE}/RelicLoadService.java`,
    from: "private static final double CHANCE_TOLERANCE = 0.05;",
    to: "private static final double CHANCE_TOLERANCE = 100.0;",
  },
  {
    name: "the nameless Requiem relic is kept",
    file: `${SERVICE}/RelicLoadService.java`,
    from: "relics.removeIf(relic -> relic.getRelicName() == null || relic.getRelicName().isBlank());",
    to: "",
  },
  {
    name: "an unrecognised chance overwrites the declared rarity",
    file: `${SERVICE}/RelicLoadService.java`,
    from: "if (corrected != null) reward.setRarity(corrected);",
    to: "reward.setRarity(corrected);",
  },
  {
    name: "the Blueprint suffix is stripped from part slugs again",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "    static String itemSlug(String itemName) {\n        return baseSlug(itemName);",
    to: '    static String itemSlug(String itemName) {\n        return baseSlug(itemName.replaceAll("(?i)\\\\s+blueprint$", ""));',
  },
  {
    name: "an ampersand collapses into an underscore",
    file: `${SERVICE}/RelicMarketService.java`,
    from: '.replace("&", " and ")',
    to: "",
  },
  {
    name: "relic slugs lose the suffix that tells them from a part",
    file: `${SERVICE}/RelicMarketService.java`,
    from: 'return baseSlug(relicName) + "_relic";',
    to: "return baseSlug(relicName);",
  },
  {
    name: "Chattraka's multiplier is mistyped",
    file: `${SERVICE}/EndoService.java`,
    from: 'new Sculpture("Ayatan Chattraka Sculpture", "ayatan_chattraka_sculpture", 450, 2, 1, 3.0)',
    to: 'new Sculpture("Ayatan Chattraka Sculpture", "ayatan_chattraka_sculpture", 450, 2, 1, 2.0)',
  },
  {
    name: "stars beyond the sockets are counted",
    file: `${SERVICE}/EndoService.java`,
    from: "int c = Math.min(cyan, cyanSockets);\n            int a = Math.min(amber, amberSockets);",
    to: "int c = cyan;\n            int a = amber;",
  },
  {
    name: "amber and cyan stars are worth the same",
    file: `${SERVICE}/EndoService.java`,
    from: "double raw = (base + 50.0 * c + 100.0 * a)",
    to: "double raw = (base + 50.0 * c + 50.0 * a)",
  },
  {
    name: "the eras come back alphabetical",
    file: `${SERVICE}/RelicVaultedService.java`,
    from: 'List.of("Lith", "Meso", "Neo", "Axi", "Requiem");',
    to: 'List.of("Axi", "Lith", "Meso", "Neo", "Requiem");',
  },
  {
    name: "an unknown era is sorted first instead of last",
    file: `${SERVICE}/RelicVaultedService.java`,
    from: "return i < 0 ? Integer.MAX_VALUE : i;",
    to: "return i;",
  },
  {
    name: "a name that is not an era and a code is kept",
    file: `${SERVICE}/RelicVaultedService.java`,
    from: "if (parts.length != 2) continue;",
    to: "if (parts.length < 1) continue;",
  },
  {
    name: "the search stops trimming the rewards to the matches",
    file: `${SERVICE}/RelicSearchItemService.java`,
    from: "return new Relic(relic.getTier(), relic.getRelicName(), relic.getState(), matchingRewards);",
    to: "return relic;",
  },
  {
    name: "an empty query returns the whole catalogue",
    file: `${SERVICE}/RelicSearchItemService.java`,
    from: "if (relics == null || itemName == null || itemName.isEmpty()) {",
    to: "if (relics == null || itemName == null) {",
  },
];

let killed = 0;
const survivors = [];

for (const mutant of MUTANTS) {
  const path = `${ROOT}${mutant.file}`;
  const original = readFileSync(path, "utf8");

  if (!original.includes(mutant.from)) {
    survivors.push(`${mutant.name} — PATTERN NOT FOUND, mutation never applied`);
    console.log(`  SKIPPED  ${mutant.name}`);
    continue;
  }

  writeFileSync(path, original.replace(mutant.from, mutant.to));

  let failed = false;
  try {
    execSync(`./mvnw --batch-mode --quiet ${ONLY_SERVICE_TESTS} test`, {
      cwd: ROOT,
      stdio: "pipe",
    });
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
