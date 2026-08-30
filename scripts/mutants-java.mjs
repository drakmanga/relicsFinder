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
  "RelicVaultedServiceTest,RelicSearchItemServiceTest,RelicMarketCachedTtlTest," +
  "RelicMarketSweepTest,PriceCacheStoreTest,RelicMarketNextTtlTest," +
  "RelicMarketTradeCountTest,RelicMarketTrendGapTest,RankSensitivityTest," +
  "RelicMarketRevisionTest," +
  "WishlistServiceIdentityTest,WishlistServiceCoalesceTest," +
  "DucatServiceIndexTest,DucatServiceDatesTest,PrimeLifecycleServiceTest," +
  "OwnedServiceMigrationTest" +
  " -DfailIfNoTests=false";

const MUTANTS = [
  {
    // The fault the whole phase rule exists not to have. Six sets were in the
    // drop tables on 2026-08-30 carrying a vault date from years earlier, and
    // reading the date first calls every one of them long vaulted — the exact
    // opposite of what a reader would do about it.
    name: "the vault date is read before the drop tables",
    file: `${SERVICE}/PrimeLifecycleService.java`,
    from: "        if (dropping) return PrimePhase.DROPPING;\n        if (vaultDate == null) return PrimePhase.UNKNOWN;",
    to: "        if (vaultDate == null) return dropping ? PrimePhase.DROPPING : PrimePhase.UNKNOWN;",
  },
  {
    // Defaulting puts the most confident of the three labels on the one set
    // nothing here knows anything about.
    name: "a set with no vault date falls through to long vaulted",
    file: `${SERVICE}/PrimeLifecycleService.java`,
    from: "        if (vaultDate == null) return PrimePhase.UNKNOWN;",
    to: "        if (vaultDate == null) return PrimePhase.LONG_VAULTED;",
  },
  {
    // Two years is measured, not round: at three the claim drops from 85% to
    // 70% and the badge starts being wrong about sets that are not moving.
    name: "the recently-vaulted window is widened to three years",
    file: `${SERVICE}/PrimeLifecycleService.java`,
    from: "    static final Period RECENTLY_VAULTED = Period.ofYears(2);",
    to: "    static final Period RECENTLY_VAULTED = Period.ofYears(3);",
  },
  {
    // An empty string sorts and compares as a date in the year zero, so every
    // never-vaulted set would read as vaulted before the game existed.
    name: "a set that has never been vaulted gets an empty date instead of none",
    file: `${SERVICE}/DucatService.java`,
    from: "new SetDates(setName, releaseDate, vaultDate.isEmpty() ? null : vaultDate));",
    to: "new SetDates(setName, releaseDate, vaultDate));",
  },
  {
    // The failure the owned migration must not have: the file in the wild is a
    // list of bare names, and a name has always meant one copy.
    name: "a stored name is dropped instead of read as one copy",
    file: `${SERVICE}/OwnedService.java`,
    from: "if (!name.isEmpty()) parsed.add(new OwnedEntry(name, COPIES_WHEN_UNSAID));",
    to: "",
  },
  {
    name: "an entry that names no count is read as nothing owned",
    file: `${SERVICE}/OwnedService.java`,
    from: "name, quantity.isInt() ? quantity.asInt() : COPIES_WHEN_UNSAID));",
    to: "name, quantity.isInt() ? quantity.asInt() : 0));",
  },
  {
    name: "how many copies a set needs is thrown away again",
    file: `${SERVICE}/DucatService.java`,
    from: "copies.isInt() ? copies.asInt() : null",
    to: "null",
  },
  {
    // The count would then be read off Orokin Cell, which every item in the
    // game lists and none of them is built out of.
    name: "the shared crafting materials come back into the parts list",
    file: `${SERVICE}/DucatService.java`,
    from: 'if (!component.hasNonNull("ducats")) continue;',
    to: "",
  },
  {
    // Two lines can key the same without anyone typing one twice: a relic line
    // stored before the fallback moved names no state, and reconstructing one
    // lands on the key its neighbour already holds.
    name: "a colliding line is dropped instead of added to the one already there",
    file: `${SERVICE}/WishlistService.java`,
    from: "seen.setQuantity(seen.getQuantity() + entry.getQuantity());",
    to: "",
  },
  {
    name: "the resolved state is not written back, so the file stays ambiguous",
    file: `${SERVICE}/WishlistService.java`,
    from: 'if ("relic".equals(entry.getKind()) && entry.getRefinement() == null) {\n                entry.setRefinement(DEFAULT_REFINEMENT);\n            }',
    to: "",
  },
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
    // The suffix moved into the default arm of the overrides lookup when Axi Y2
    // needed a listing of its own. Same rule, same thing worth breaking - only
    // the expression it is written in changed.
    from: 'return RELIC_LISTINGS.getOrDefault(base, base + "_relic");',
    to: "return RELIC_LISTINGS.getOrDefault(base, base);",
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
  {
    // The two below are the reason the frontend can say why a trend is missing
    // at all. Both put the four causes back into one silence — the first by
    // reporting a minute of bad network as a part nobody sells, the second by
    // moving the floor that decides which half of the catalogue gets a number.
    name: "a failed call is reported as a market with no listings",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "        if (cached.failed()) return TrendGap.NO_ANSWER;\n",
    to: "",
  },
  {
    name: "the trend floor drops by a day",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "static final int MIN_TREND_DAYS = 7;",
    to: "static final int MIN_TREND_DAYS = 6;",
  },
  {
    // The four below are the rank-aware allocation. The first three break the
    // signal — every part named, the head swallowing the crowd, a target of
    // zero seconds — and the fourth breaks what the signal is for: a floor that
    // does not follow the target is a target that cannot buy anything.
    name: "every part in the head is called sensitive",
    file: `${SERVICE}/RankSensitivity.java`,
    from: "                if (flip >= RelicMarketService.TARGET_DRIFT) continue;\n",
    to: "",
  },
  {
    name: "the ranked head reaches into the crowd",
    file: `${SERVICE}/RankSensitivity.java`,
    from: "static final int RANKED_HEAD = 50;",
    to: "static final int RANKED_HEAD = 60;",
  },
  {
    name: "two relics at the same value ask for an interval of nothing",
    file: `${SERVICE}/RankSensitivity.java`,
    from: "double target = Math.max(SENSITIVE_FLOOR, flip);",
    to: "double target = flip;",
  },
  {
    name: "the shorter floor stops following the target",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "Duration floor = target < TARGET_DRIFT ? SENSITIVE_MIN_TTL : MIN_TTL;",
    to: "Duration floor = MIN_TTL;",
  },
  {
    name: "a traded item is re-read as rarely as a dead one",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "return volume != null && volume >= ACTIVE_VOLUME ? ACTIVE_TTL : IDLE_TTL;",
    to: "return IDLE_TTL;",
  },
  {
    name: "a failed call is written down as a real answer",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "            if (failed) return RETRY_TTL;\n",
    to: "",
  },
  {
    name: "a quiet item is held for a week instead of a day",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "private static final Duration IDLE_TTL = Duration.ofHours(24);",
    to: "private static final Duration IDLE_TTL = Duration.ofDays(7);",
  },
  {
    name: "the sweep cursor stops advancing, so one name is refreshed forever",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "names.get(Math.floorMod(sweepCursor.getAndIncrement(), names.size()))",
    to: "names.get(Math.floorMod(sweepCursor.get(), names.size()))",
  },
  {
    name: "the sweep queues the whole catalogue at once",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "                enqueue(slug);\n                return;",
    to: "                enqueue(slug);",
  },
  {
    name: "a failed call blocks its own retry by counting as an answer",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "return cached == null || cached.failed();",
    to: "return cached == null;",
  },
  {
    name: "a failed call is carried across a restart",
    file: `${SERVICE}/PriceCacheStore.java`,
    from: "if (entry.getValue().failed()) continue;",
    to: "",
  },
  {
    name: "an entry with no timestamp is loaded as if it were fresh",
    file: `${SERVICE}/PriceCacheStore.java`,
    from: 'if (!node.hasNonNull("at")) return null;',
    to: "",
  },
  {
    name: "the saved cache is merged into the old file instead of replacing it",
    file: `${SERVICE}/PriceCacheStore.java`,
    from: "                json.writeStartObject();\n",
    to: "                json.writeStartObject();\n                for (Map.Entry<String, RelicMarketService.Cached> old : load().entrySet()) { json.writeFieldName(old.getKey()); writeEntry(json, old.getValue()); }\n",
  },
  {
    name: "the interval stops scaling with the square root of time",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "        double wanted = elapsed * Math.pow(target / drift, 2);",
    to: "        double wanted = elapsed * (target / drift);",
  },
  {
    name: "one quiet reading is allowed to set the interval on its own",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "        double damped = Math.max(current * MAX_STEP_DOWN, Math.min(current * MAX_STEP_UP, wanted));",
    to: "        double damped = wanted;",
  },
  {
    name: "the interval may drop below what the sweep can honour",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "        double bounded = Math.max(floor.toSeconds(), Math.min(MAX_TTL.toSeconds(), damped));",
    to: "        double bounded = Math.min(MAX_TTL.toSeconds(), damped);",
  },
  {
    name: "two readings taken at the same instant reach the arithmetic",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "        if (elapsed <= 0) return previous.earnedTtl();",
    to: "        if (elapsed < 0) return previous.earnedTtl();",
  },
  {
    name: "the drift is judged against the interval intended, not the one waited",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "        double elapsed = Duration.between(previous.at(), fresh.at()).toSeconds();",
    to: "        double elapsed = previous.ttl().toSeconds();",
  },
  {
    name: "an earned interval loses to the guess from volume",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "            if (earnedTtl != null) return earnedTtl;",
    to: "",
  },
  {
    name: "a failed call keeps the interval it earned while answering",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "            if (failed) return RETRY_TTL;\n            if (earnedTtl != null) return earnedTtl;",
    to: "            if (earnedTtl != null) return earnedTtl;\n            if (failed) return RETRY_TTL;",
  },
  {
    name: "the trade count is read off the 48-hour window instead of ninety days",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "        for (PricePoint point : cached.history()) trades += point.getVolume();",
    to: "        trades = cached.volume() == null ? 0 : cached.volume();",
  },
  {
    // The twin of "a relic line with no state falls back to Intact instead of
    // the catalogue's default" in scripts/mutants.mjs. The two sides key the
    // same line, so the same bug has to be caught on each of them.
    name: "a relic line with no state falls back to Intact instead of the catalogue's default",
    file: `${SERVICE}/WishlistService.java`,
    from: 'private static final String DEFAULT_REFINEMENT = "radiant";',
    to: 'private static final String DEFAULT_REFINEMENT = "intact";',
  },
  {
    name: "a relic nobody has looked up yet is reported as untraded",
    file: `${SERVICE}/RelicMarketService.java`,
    from: "        if (cached == null || cached.history().isEmpty()) return null;",
    to: "        if (cached == null || cached.history().isEmpty()) return 0;",
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
