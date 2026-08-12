import { ALL_REFINEMENTS, type Filters, type VaultFilter } from "./rows";
import type { CatalogueView } from "./useViewState";
import type { Rarity, Refinement, Tier } from "../api/types";

/**
 * What this browser filters by, most often first.
 *
 * The filter bar is shut by default, which is right — the catalogue is what the
 * app is for — but it means the four groups inside it are invisible until
 * someone goes looking. Nobody sets a filter once: the same player asks for the
 * same two tiers most evenings, and having to open the bar to say so every time
 * is the tool forgetting something it watched happen.
 *
 * Counts, not a most-recent list. Recency swaps the suggestions around after
 * every session and there is nothing to learn from a strip that never says the
 * same thing twice; a count settles on what someone actually uses and moves
 * only when their habits do.
 *
 * Per view, because the two views are filtered differently — rarity means
 * nothing on a list of relics (see FilterBar), and a price ceiling that is
 * sensible for a part is not the same question on a relic.
 */
const STORAGE_KEY = "relic-finder.filter-memory.v1";

/** One remembered filter, in a form that survives JSON. */
export type FilterToken =
  | { kind: "tier"; value: Tier }
  | { kind: "rarity"; value: Rarity }
  | { kind: "vault"; value: VaultFilter }
  | { kind: "refinement"; value: Refinement };

type Counts = Record<string, number>;

const id = (token: FilterToken) => `${token.kind}:${token.value}`;

const parse = (key: string): FilterToken | null => {
  const [kind, value] = key.split(":");
  if (!kind || !value) return null;
  if (kind === "tier" || kind === "rarity") return { kind, value } as FilterToken;
  if (kind === "vault" && (value === "farmable" || value === "vaulted")) return { kind, value };
  if (kind === "refinement" && (ALL_REFINEMENTS as string[]).includes(value))
    return { kind, value: value as Refinement };
  return null;
};

function load(): Record<CatalogueView, Counts> {
  const empty = { relics: {}, items: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return empty;

    const record = parsed as Partial<Record<CatalogueView, unknown>>;
    const counts = (value: unknown): Counts =>
      typeof value === "object" && value !== null ? (value as Counts) : {};

    return { relics: counts(record.relics), items: counts(record.items) };
  } catch {
    // Hand-edited or half-migrated storage must not take the app down.
    return empty;
  }
}

let memory = load();

/**
 * Which filters a change switched **on**.
 *
 * Only the additions are counted. Clearing a filter is not evidence that it is
 * unwanted — it is usually the end of the question it was asked for — and
 * counting removals too would leave every token on a score of zero.
 */
export function tokensAdded(before: Filters, after: Filters): FilterToken[] {
  const added: FilterToken[] = [];

  for (const tier of after.tiers) {
    if (!before.tiers.has(tier)) added.push({ kind: "tier", value: tier });
  }
  for (const rarity of after.rarities) {
    if (!before.rarities.has(rarity)) added.push({ kind: "rarity", value: rarity });
  }
  if (after.vault !== before.vault && after.vault !== "all") {
    added.push({ kind: "vault", value: after.vault });
  }
  if (after.refinement !== before.refinement && after.refinement !== "intact") {
    added.push({ kind: "refinement", value: after.refinement });
  }

  return added;
}

export function remember(view: CatalogueView, tokens: FilterToken[]) {
  if (tokens.length === 0) return;

  const counts = { ...memory[view] };
  for (const token of tokens) counts[id(token)] = (counts[id(token)] ?? 0) + 1;
  memory = { ...memory, [view]: counts };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Private browsing or a full quota: the session still works, unremembered.
  }
}

/**
 * The filters this view is asked for most, minus whatever is already on.
 *
 * A suggestion has to have been used more than once. One use is a look around,
 * and offering it back is the tool mistaking an experiment for a habit.
 */
export function suggestions(view: CatalogueView, active: Filters, limit = 3): FilterToken[] {
  const isOn = (token: FilterToken) =>
    token.kind === "tier"
      ? active.tiers.has(token.value)
      : token.kind === "rarity"
        ? active.rarities.has(token.value)
        : token.kind === "vault"
          ? active.vault === token.value
          : active.refinement === token.value;

  return Object.entries(memory[view])
    .filter(([, count]) => count > 1)
    .sort(([leftKey, left], [rightKey, right]) => right - left || leftKey.localeCompare(rightKey))
    .map(([key]) => parse(key))
    .filter((token): token is FilterToken => token !== null && !isOn(token))
    .slice(0, limit);
}

/** Switches a suggested filter on, leaving everything else as it was. */
export function applyToken(filters: Filters, token: FilterToken): Filters {
  switch (token.kind) {
    case "tier":
      return { ...filters, tiers: new Set(filters.tiers).add(token.value) };
    case "rarity":
      return { ...filters, rarities: new Set(filters.rarities).add(token.value) };
    case "vault":
      return { ...filters, vault: token.value };
    case "refinement":
      return { ...filters, refinement: token.value };
  }
}
