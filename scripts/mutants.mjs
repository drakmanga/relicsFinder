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
    // The two absences a phase cell has to tell apart. A landed answer that
    // does not name the set is Kavasa Prime, and drawing a skeleton for it
    // leaves a row waiting forever for a row that is never coming.
    name: "a set the lifecycle answer never mentions waits instead of answering",
    file: "apps/web/src/lib/lifecycle.ts",
    from: '  if (!row) return { kind: "phase", phase: "unknown", releaseDate: null, vaultDate: null };',
    to: "  if (!row) return WAITING;",
  },
  {
    // Six sets are in the drop tables today carrying the date they were FIRST
    // vaulted, years ago. Printing it under a badge reading "Dropping" puts a
    // date on screen that contradicts the line above it.
    name: "a dropping set prints the date it was first vaulted",
    file: "apps/web/src/lib/lifecycle.ts",
    from: '    return cell.releaseDate ? { label: "Released", date: cell.releaseDate } : null;',
    to: '    return cell.vaultDate ? { label: "Released", date: cell.vaultDate } : null;',
  },
  {
    // The explanation may not lean on the word it explains, or it explains
    // nothing to the reader AGENTS.md is written about.
    name: "the phase sentences go back to in-game vocabulary",
    file: "apps/web/src/lib/lifecycle.ts",
    from: '    "Stopped dropping from relics less than two years ago. What players already hold is the only supply, and prices usually climb.",',
    to: '    "Vaulted less than two years ago, so prices usually climb.",',
  },
  {
    // The table must not empty and refill while the lifecycle request lands. A
    // set whose phase has not arrived is a wait, not a set that failed to
    // match, and dropping the guard makes every row vanish for a second on a
    // view somebody arrived at through a link with a phase chip in it.
    name: "the phase chips filter a table whose phases have not arrived",
    file: "apps/web/src/lib/setCategories.ts",
    from: "  if (phases.size === 0 || !lifecycle) return sets;",
    to: "  if (phases.size === 0) return sets;",
  },
  {
    // Multi-select, and the union is the point: "just vaulted plus long
    // vaulted" is "everything I can no longer farm", which is a real question
    // and the reason this row is not exclusive like the one above it.
    name: "a second phase chip empties the list instead of widening it",
    file: "apps/web/src/lib/setCategories.ts",
    from: '    return cell.kind === "phase" && phases.has(cell.phase);',
    to: '    return cell.kind === "phase" && phases.size === 1 && phases.has(cell.phase);',
  },
  {
    // The fault the whole step exists to close: 28 sets read as finished with a
    // piece still missing.
    name: "a piece is done as soon as one copy of it is in hand",
    file: "apps/web/src/lib/setCompletion.ts",
    from: "          complete: ownedCopies >= needed,",
    to: "          complete: ownedCopies > 0,",
  },
  {
    name: "the platinum to finish counts one copy of a doubled piece",
    file: "apps/web/src/lib/setCompletion.ts",
    from: "        (sum, part) => sum + (part.price ?? 0) * (part.needed - part.ownedCopies),",
    to: "        (sum, part) => sum + (part.price ?? 0),",
  },
  {
    name: "how many copies a set needs is ignored and read as one",
    file: "apps/web/src/lib/setCompletion.ts",
    from: "        const needed = prices?.get(itemName)?.copiesPerSet ?? 1;",
    to: "        const needed = 1;",
  },
  {
    name: "the unfinished filter goes back to counting names",
    file: "apps/web/src/lib/setCategories.ts",
    from: '    status === "complete" ? set.ownedCount === set.neededCount : set.ownedCount < set.neededCount,',
    to: '    status === "complete"\n      ? set.ownedCount === set.parts.length\n      : set.ownedCount < set.parts.length,',
  },
  {
    // The failure this migration exists not to have: the stored list is a list
    // of names, and a name has always meant one copy.
    name: "a name stored before pieces had counts reads as nothing owned",
    file: "apps/web/src/lib/owned.ts",
    from: 'if (typeof entry === "string") return entry.trim() === "" ? null : [entry, 1];',
    to: 'if (typeof entry === "string") return null;',
  },
  {
    name: "an entry that names no count reads as nothing owned",
    file: "apps/web/src/lib/owned.ts",
    from: '    typeof quantity === "number" && Number.isFinite(quantity) ? Math.trunc(quantity) : 1;',
    to: '    typeof quantity === "number" && Number.isFinite(quantity) ? Math.trunc(quantity) : 0;',
  },
  {
    // An empty map answers "you own nothing" and the list of names is never
    // read, so the migration silently never happens.
    name: "an unusable storage key answers empty instead of nothing",
    file: "apps/web/src/lib/owned.ts",
    from: "  if (!raw) return null;",
    to: "  if (!raw) return new Map();",
  },
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
    name: "the set search forgets the relics that drop each piece",
    file: "apps/web/src/lib/setCompletion.ts",
    from: "          relicNames: relicsByItem.get(itemName) ?? [],",
    to: "          relicNames: [],",
  },
  {
    name: "searchedPartsOf marks a piece by the relic it does not name",
    file: "apps/web/src/lib/setCompletion.ts",
    from: "    const relic = part.relicNames.find((name) => matchesRelic(name, term));",
    to: "    const relic = part.relicNames[0];",
  },
  {
    name: "searchedPartsOf loses which relic matched",
    file: "apps/web/src/lib/setCompletion.ts",
    from: "    if (relic) marked.set(part.itemName, relic);",
    to: "    if (relic) marked.set(part.itemName, null);",
  },
  {
    name: "setMatchesTerm goes back to the set name and its pieces only",
    file: "apps/web/src/lib/setCompletion.ts",
    from: "  return set.setName.toLowerCase().includes(term) || searchedPartsOf(set, term).size > 0;",
    to: "  return set.setName.toLowerCase().includes(term);",
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
    // Was "marketUrl strips the suffix off the set's own blueprint", which
    // patched the guard inside the stripping branch. There is no branch left
    // to patch: the name is kept whole now, because the shortened slug is a
    // redirect on the older frames and a 404 on everything since Hildryn. So
    // the mutation runs the other way and puts the stripping back — the same
    // shape as "the Blueprint suffix is stripped from part slugs again" on the
    // Java side, which is the rule this one has to stay in step with.
    name: "marketUrl strips the Blueprint suffix off a part again",
    file: "apps/web/src/lib/format.ts",
    from: '    .replace(/&/g, " and ")',
    to: '    .replace(/ blueprint$/, "")\n    .replace(/&/g, " and ")',
  },
  {
    name: "stillFilling waits for the untraded parts too",
    file: "apps/web/src/api/queries.ts",
    from: "  return total - priced > total * PRICE_RESIDUE;",
    to: "  return total - priced > 0;",
  },
  {
    name: "the residue boundary lets one price too many count as a wait",
    file: "apps/web/src/api/queries.ts",
    from: "  return total - priced > total * PRICE_RESIDUE;",
    to: "  return total - priced >= total * PRICE_RESIDUE;",
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
  {
    name: "a cell still being fetched is labelled instead of waiting",
    file: "apps/web/src/lib/trend.ts",
    from: 'if (trend === "no-baseline" && filling) return WAITING;',
    to: 'if (trend === "no-baseline") return WAITING;',
  },
  {
    // A price standing exactly on its ninety-day average is the one movement
    // that is both measured and falsy.
    name: "a trend of zero is read as no trend at all",
    file: "apps/web/src/lib/trend.ts",
    from: 'if (price.trend !== null) return { kind: "moved", percent: price.trend };',
    to: 'if (price.trend) return { kind: "moved", percent: price.trend };',
  },
  {
    // The two below are the last hop to an open tab. The first spends a second
    // batch of six hundred prices the moment the app opens; the second spends
    // one every time the warmer moves any of 1.500 numbers.
    name: "the first marker a tab sees is treated as news",
    file: "apps/web/src/lib/priceRefresh.ts",
    from: "if (revision === undefined || seen === null) return false;",
    to: "if (revision === undefined) return false;",
  },
  {
    name: "an open tab re-reads the prices as fast as the marker moves",
    file: "apps/web/src/lib/priceRefresh.ts",
    from: "return now - lastRefreshedAt >= REFRESH_FLOOR_MS;",
    to: "return true;",
  },
  {
    // The bug this step closed: the fallback was its own literal, so moving the
    // catalogue's default left the wishlist keying lines under a state nothing
    // showed any more. Its twin is on the Java side, one constant apart.
    name: "a relic line with no state falls back to Intact instead of the catalogue's default",
    file: "apps/web/src/lib/wishlist.ts",
    from: "? `relic|${entry.itemName}|${entry.refinement ?? DEFAULT_REFINEMENT}`",
    to: '? `relic|${entry.itemName}|${entry.refinement ?? "intact"}`',
  },
  {
    // The half of that bug the constant did not close: once the fallback moved,
    // a stored line with no state started keying as the line beside it, and the
    // store kept both under one key.
    name: "two lines that key the same keep the first instead of adding up",
    file: "apps/web/src/lib/wishlist.ts",
    from: "      seen.qty += line.qty;",
    to: "      seen.qty = Math.max(seen.qty, line.qty);",
  },
  {
    // A reader who has never met the two columns sees them disagree and
    // concludes a squad earns double. The first visit is what answers that.
    name: "a browser that has stored nothing gets the primer folded shut",
    file: "apps/web/src/lib/primerMemory.ts",
    from: "  if (raw === null) return PRIMER_DEFAULT_OPEN;",
    to: "  if (raw === null) return false;",
  },
  {
    name: "storage the primer cannot read is treated as a choice to fold",
    file: "apps/web/src/lib/primerMemory.ts",
    from: '  return typeof open === "boolean" ? open : PRIMER_DEFAULT_OPEN;',
    to: "  return open === true;",
  },
  {
    // The ranking itself moved to the backend with brief-020 and its mutants
    // went with it — see scripts/mutants-java.mjs, which carries the six that
    // used to be here. What is left on this side is the translation and the
    // order, and these are its two halves.
    name: "a movement with no number behind it becomes a movement of zero",
    file: "apps/web/src/api/normalize.ts",
    from: 'if (wire.trend === "moved" && wire.trendPercent !== null) return wire.trendPercent;',
    to: 'if (wire.trend === "moved") return wire.trendPercent as number;',
  },
  {
    // The two batches behind the ranking fill at different speeds, and reading
    // one of them for both puts the price column's skeleton under the trend
    // column's answer.
    name: "the ranking reports one coverage for both of its batches",
    file: "apps/web/src/lib/priceProgress.ts",
    from: "    relicPricesFilling: stillFillingCount(coverage.relicsPriced, coverage.relics),",
    to: "    relicPricesFilling: stillFillingCount(coverage.partsPriced, coverage.parts),",
  },
  {
    // The podium follows the population, which is a request, and not the sort,
    // which is a click. The reversal run 006 made.
    name: "the podium follows the table's own sort again",
    file: "apps/web/src/lib/tierList.ts",
    from: '  return sortTierRows(rows, { column: DEFAULT_TIER_SORT, direction: "desc" }).slice(0, count);',
    to: "  return rows.slice(0, count);",
  },
  {
    name: "the split reports the state being asked about as though it were elsewhere",
    file: "apps/web/src/lib/wishlist.ts",
    from: '        line.kind === "relic" && line.itemName === itemName && line.refinement !== refinement,',
    to: '        line.kind === "relic" && line.itemName === itemName,',
  },
  {
    // A skip that silences every future release turns "not this one" into
    // "never again", and the release that mattered goes with it.
    name: "skipping one version silences every version after it",
    file: "apps/web/src/lib/updateMemory.ts",
    from: "  return latest !== skipped;",
    to: "  return skipped === null;",
  },
  {
    // The offline answer carries a null latest. Announcing it puts a notice on
    // screen about a version nothing could read.
    name: "the notice is announced when there is no release to announce",
    file: "apps/web/src/lib/updateMemory.ts",
    from: "  if (!latest) return false;",
    to: "  if (latest === undefined) return false;",
  },
  {
    // Storage that cannot be read must mean nothing was skipped. Reading it as
    // a skip of the empty string silences whatever the notice was about.
    name: "an empty stored version counts as a version that was skipped",
    file: "apps/web/src/lib/updateMemory.ts",
    from: '    return typeof version === "string" && version.length > 0 ? version : null;',
    to: '    return typeof version === "string" ? version : null;',
  },
  {
    // The one thing the tidy must never do: swallow a line because its shape
    // was not one of the five it recognises.
    name: "a list marker takes the line with it instead of becoming a bullet",
    file: "apps/web/src/lib/releaseNotes.ts",
    from: '    .replace(BULLET, "• ")',
    to: '    .replace(BULLET, "")',
  },
  {
    // The unit switches partway through a download, so a bar reading 900 KB
    // jumps to 1 MB and back. Nobody would call it a bug; everybody would
    // notice it.
    name: "megabytes grows a scale and switches units mid-download",
    file: "apps/web/src/lib/updateInstall.ts",
    from: "  return `${Math.round(Math.max(bytes, 0) / BYTES_PER_MB)} MB`;",
    to: "  return bytes < BYTES_PER_MB ? `${Math.round(bytes / 1000)} KB` : `${Math.round(bytes / BYTES_PER_MB)} MB`;",
  },
  {
    // The sentence a user reads when the download did not verify. Dropping
    // "nothing was run" leaves them believing something was installed, which is
    // the one thing they must not conclude.
    name: "the mismatch sentence stops saying that nothing was run",
    file: "apps/web/src/lib/updateInstall.ts",
    from: '      return "What downloaded is not the file the release published, so nothing was installed. Nothing was run and the download has been deleted. Try again, and if it happens twice, download the release yourself instead.";',
    to: '      return "The update failed a checksum verification.";',
  },
  {
    // The dialog is inside a Warframe companion. A reader who has never heard
    // the word cannot act on a sentence built out of it.
    name: "the failures go back to the vocabulary of a package manager",
    file: "apps/web/src/lib/updateInstall.ts",
    from: '      return "The download did not finish. That is usually the connection. Try again, or open the release page and download it yourself.";',
    to: '      return "The payload transfer aborted before the digest could be computed.";',
  },
  {
    // The poll stops the moment an install stops running. Reading the failed
    // stage as still running leaves it asking a finished install how it is
    // doing, twice a second, for as long as the page is open.
    name: "a failed install is read as one still under way",
    file: "apps/web/src/lib/updateInstall.ts",
    from: '    install?.stage === "starting"',
    to: '    install?.stage === "starting" ||\n    install?.stage === "failed"',
  },
  {
    // The whole of what "starting" tells a user: the window is about to
    // vanish and come back on its own. Without it, an application that closes
    // itself reads as a crash.
    name: "the last stage stops warning that the application will close",
    file: "apps/web/src/lib/updateInstall.ts",
    from: '      return "Installing. Relic Finder will close and open again on its own.";',
    to: '      return "Installing.";',
  },
  {
    // The ending every container install reaches, and the only thing on it. A
    // reader who is told what to run and not why gets an instruction where the
    // question they arrived with was whether this can be done at all.
    name: "the container ending stops saying why there is no button",
    file: "apps/web/src/lib/updateInstall.ts",
    from: '  "control of Docker, and that is control of this whole machine rather than of Relic " +',
    to: '  "" +',
  },
  {
    // The line exists for the reader who was handed a compose file and never
    // cloned anything: without it the second command is an error in a dialog
    // whose job is to remove doubt.
    name: "the caveat stops covering the install that never cloned anything",
    file: "apps/web/src/lib/updateInstall.ts",
    from: '  "never cloned the repository.";',
    to: '  "";',
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
