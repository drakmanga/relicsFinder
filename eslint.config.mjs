import js from "@eslint/js";
import ts from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";
import globals from "globals";

/**
 * Accessibility violations are errors, not warnings.
 *
 * That is the whole point of the gate: a warning nobody reads is not a gate,
 * and this project reached 81 `aria-*` attributes with nothing checking a single
 * one of them.
 *
 * `eslint-config-prettier` goes last so it can switch off the stylistic rules
 * that would otherwise argue with the formatter.
 */
export default ts.config(
  {
    // Build output, vendored bundles and dependency pre-bundles. Linting
    // generated code reports on decisions nobody in this repo made: the first
    // run was 1258 problems, 1150 of them inside a vendored copy of React.
    ignores: [
      "**/dist/**",
      "**/target/**",
      "**/node_modules/**",
      "**/.vite/**",
      "**/.ds-verify/**",
      "**/.ds-sync/**",
      "**/.design-sync/**",
      "**/design-imports/**",
      "ds-bundle/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    languageOptions: { globals: globals.browser },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...Object.fromEntries(
        Object.keys(jsxA11y.configs.recommended.rules).map((rule) => [rule, "error"]),
      ),

      /*
       * Two adjustments to the a11y set, both narrowing what it asks rather
       * than what it protects.
       */

      // `label-has-for` is deprecated and, by default, demands a label both
      // nest its control *and* carry `htmlFor`. `label-has-associated-control`
      // is its replacement and is still on: it accepts either, which is what
      // the HTML specification accepts.
      "jsx-a11y/label-has-for": "off",

      // A `<td>` is not a control. The rule reaches empty cells through their
      // implicit `cell` role, which on this project means the spacer rows a
      // virtualiser needs — they sit inside a `<tr aria-hidden="true">` and
      // exist only to give the scrollbar the height of the rows that are not
      // rendered. Labelling them would put twelve invented strings into the
      // accessibility tree.
      // `depth: 3` because the label text is wrapped in a styled span, one
      // level deeper than the default reaches: `<label><input><span>text`.
      "jsx-a11y/control-has-associated-label": [
        "error",
        { ignoreElements: ["td", "th"], depth: 3 },
      ],

      // A scrollable box has to be focusable or a keyboard cannot scroll it —
      // that is WCAG 2.1.1, and it is why every wide table here is a named
      // `region` with `tabindex="0"`. The rule's own allow-list already carries
      // `tabpanel` for the same reason; `region` belongs beside it.
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { tags: [], roles: ["tabpanel", "region"], allowExpressionValues: true },
      ],
    },
  },
  // Build and lint scripts run in Node, not in a browser.
  {
    files: ["**/*.mjs", "**/scripts/**"],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
