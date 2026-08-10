/**
 * Generates src/styles/tokens.css from design-system/tokens.json.
 *
 * The JSON is the only place a design value is authored; this file is build
 * output. Two files kept in sync by hand always drift, and this pair already
 * had: the Vanguard tier and the Orokin star reached the stylesheet days before
 * they reached the specification.
 *
 * The custom-property names are not a mechanical join of the JSON path. The
 * design system named them before the JSON existed and the stylesheets are full
 * of them, so the mapping below reproduces those names exactly rather than
 * renaming 149 variables to suit a script. `verifyAgainst` proves it: every
 * variable the previous hand-written file shipped must come out of here with
 * the same value, or the build fails.
 *
 * Run via `npm run build:tokens`, and as the first step of `npm run build`.
 */
import { readFile, writeFile } from "node:fs/promises";

const JSON_PATH = new URL("../../../design-system/tokens.json", import.meta.url);
const CSS_PATH = new URL("../src/styles/tokens.css", import.meta.url);

/**
 * How a JSON path becomes a variable name, longest prefix first.
 *
 * `drop` removes leading segments that exist to organise the JSON and were
 * never part of the name; `as` replaces them with the prefix the stylesheets
 * already use.
 */
const NAMING = [
  // The scrim was named before it was filed under `surface`.
  { prefix: "semantic.surface.scrim", drop: 3, as: "scrim" },
  { prefix: "color.signal", drop: 2, as: "" }, // color.signal.danger  -> --rf-danger
  { prefix: "color", drop: 1, as: "" }, // color.gold.500      -> --rf-gold-500
  { prefix: "semantic", drop: 1, as: "" }, // semantic.surface.1  -> --rf-surface-1
  { prefix: "font.family", drop: 2, as: "font" }, // font.family.ui      -> --rf-font-ui
  { prefix: "font.size", drop: 2, as: "font-size" },
  { prefix: "font.weight", drop: 2, as: "weight" },
  { prefix: "font.lineHeight", drop: 2, as: "leading" },
  { prefix: "font.tracking", drop: 2, as: "tracking" },
  { prefix: "motion.duration", drop: 2, as: "dur" }, // motion.duration.fast -> --rf-dur-fast
  { prefix: "motion.easing", drop: 2, as: "ease" },
  { prefix: "motion.stagger", drop: 2, as: "stagger" },
  { prefix: "zIndex", drop: 1, as: "z" }, // zIndex.modal        -> --rf-z-modal
  { prefix: "size.protected", drop: 2, as: "" }, // size.protected.hairline -> --rf-hairline
  { prefix: "size.layout", drop: 2, as: "size" },
  { prefix: "size", drop: 1, as: "size" },
  { prefix: "layout", drop: 1, as: "" }, // layout.content-max  -> --rf-content-max
  { prefix: "border", drop: 1, as: "border" },
  { prefix: "breakpoint", drop: 1, as: "bp" },
  { prefix: "space", drop: 1, as: "space" },
  { prefix: "notch", drop: 1, as: "notch" },
  { prefix: "text", drop: 1, as: "text" },
];

const variableName = (path) => {
  const joined = path.join(".");
  const rule = NAMING.find(
    (candidate) => joined === candidate.prefix || joined.startsWith(`${candidate.prefix}.`),
  ) ?? { drop: 0, as: "" };

  const tail = path.slice(rule.drop);
  const parts = rule.as ? [rule.as, ...tail] : tail;
  return `--rf-${parts.join("-")}`;
};

/** `{color.gold.500}` in the JSON is a reference to another token. */
const resolve = (value, byPath) => {
  if (typeof value !== "string") return String(value);

  return value.replace(/\{([^}]+)\}/g, (whole, reference) => {
    const target = byPath.get(reference);
    if (target === undefined) throw new Error(`token reference not found: ${whole}`);
    return `var(${variableName(reference.split("."))})`;
  });
};

/**
 * Arrays mean two different things in this file: an easing is four control
 * points and a font stack is a list of families, so the path decides.
 *
 * A family name is quoted only when it has to be — when it contains a space.
 * `"Cinzel"` and `Cinzel` are the same family to a browser.
 */
const formatValue = (path, value, byPath) => {
  if (Array.isArray(value)) {
    return path[0] === "motion" && path[1] === "easing"
      ? `cubic-bezier(${value.join(", ")})`
      : value.map((entry) => (/\s/.test(entry) ? `"${entry}"` : entry)).join(", ");
  }

  // Hex lowercase, which is what the stylesheets already ship.
  return resolve(value, byPath).replace(/#[0-9A-Fa-f]{3,8}\b/g, (hex) => hex.toLowerCase());
};

function* walk(node, path = []) {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    if ("$value" in node) {
      yield [path, node.$value];
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith("$")) continue;
      yield* walk(value, [...path, key]);
    }
  }
}

const tokens = JSON.parse(await readFile(JSON_PATH, "utf8"));
const entries = [...walk(tokens)];
const byPath = new Map(entries.map(([path, value]) => [path.join("."), value]));

const seen = new Map();
const lines = [];

for (const [path, value] of entries) {
  const name = variableName(path);
  const formatted = formatValue(path, value, byPath);

  if (seen.has(name) && seen.get(name) !== formatted) {
    throw new Error(
      `two tokens claim ${name}: ${seen.get(name)} and ${formatted} (${path.join(".")})`,
    );
  }
  if (seen.has(name)) continue;

  seen.set(name, formatted);
  lines.push(`  ${name}: ${formatted};`);
}

// Not generated: it is a hook a component overrides at runtime, not a design
// value, so it has no place in the specification.
/*
  Runtime hooks, not design values: a component sets --rf-notch to pick which
  notch size its own silhouette uses, and the frame pair is read by any element
  wearing .rf-frame. They have defaults here and no place in the specification,
  which describes what the system offers rather than what one element chose.
*/
lines.push("", "  /* Runtime hooks, overridden per element. Not design values. */");
lines.push("  --rf-notch: var(--rf-notch-md);");
lines.push("  --rf-frame-width: 1px;");
lines.push("  --rf-frame-color: var(--rf-border-default);");

const css = `/* ============================================================================
   Relic Finder — Orokin design tokens

   GENERATED by packages/ui/scripts/build-tokens.mjs — do not edit.
   Author values in design-system/tokens.json and run \`npm run build:tokens\`.
   ========================================================================= */

:root {
${lines.join("\n")}
}
`;

// Proof that generation did not rename or drop anything the stylesheets use.
const previous = await readFile(CSS_PATH, "utf8").catch(() => "");
const declared = (text) =>
  new Map(
    [...text.matchAll(/^\s*(--rf-[a-z0-9-]+):\s*([^;]+);/gim)].map((m) => [m[1], m[2].trim()]),
  );

/*
  Compared with quotes stripped: `"Cinzel", Georgia` and `Cinzel, Georgia` name
  the same two families, and a gate that fails on the difference would be
  guarding the old file's typing habits rather than its values.
*/
const comparable = (value) => value.replace(/["']/g, "").replace(/\s+/g, " ").trim();

const before = declared(previous);
const after = declared(css);
const lost = [...before].filter(([name]) => !after.has(name));
const changed = [...before].filter(
  ([name, value]) => after.has(name) && comparable(after.get(name)) !== comparable(value),
);

if (process.argv.includes("--verify") && (lost.length || changed.length)) {
  for (const [name] of lost) console.error(`lost: ${name}`);
  for (const [name, value] of changed)
    console.error(`changed: ${name}: ${value} -> ${after.get(name)}`);
  console.error(`\n${lost.length} lost, ${changed.length} changed — refusing to overwrite.`);
  process.exit(1);
}

await writeFile(CSS_PATH, css);
console.log(
  `tokens: ${after.size} variables from ${entries.length} tokens` +
    (lost.length || changed.length
      ? ` (${lost.length} lost, ${changed.length} changed)`
      : " — no variable lost or changed"),
);
