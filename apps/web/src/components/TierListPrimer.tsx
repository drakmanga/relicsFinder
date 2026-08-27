import { Frame } from "relic-finder-ui";

import { VAULT_LABEL } from "../lib/rows";
import { RADSHARE_PLAYERS } from "../lib/tierList";

/** One heading, one instance: the view renders exactly one of these. */
const TITLE_ID = "rf-tier-primer-title";

/**
 * The words on this screen, defined on this screen.
 *
 * Terms rather than sentences, and each one placed where the word it defines is
 * used. The two vault words read their labels from `VAULT_LABEL` rather than
 * repeating them: they are the text on the three population buttons a few
 * pixels above, and a glossary that defines a word the button no longer says is
 * worse than no glossary. The wording follows that constant's own comment —
 * what is being named is whether the relic is in the drop tables at all, not
 * how hard it would be to farm.
 */
const TERMS: readonly { readonly term: string; readonly means: string }[] = [
  { term: "Intact", means: "the state a relic is found in. Costs nothing to open." },
  {
    term: "Radiant",
    means: "the same relic fully refined, for 100 void traces. Better odds on the rare drop.",
  },
  { term: VAULT_LABEL.farmable, means: "the relic is still in the drop tables." },
  { term: VAULT_LABEL.vaulted, means: "it is not. Another player is the only source." },
  {
    term: "Relic price",
    means: "what the relic itself sells for. It sits beside the letters and never moves them.",
  },
];

/**
 * What a radshare is, what it is not, and what neither column subtracts.
 *
 * Always on screen, never a tooltip and never behind a disclosure. Every word
 * this tab uses is vocabulary the game teaches and the screen does not, and a
 * title attribute teaches nobody: touch has no hover, and a reader does not
 * point at a table header hoping something appears. Not dismissible either —
 * whoever dismissed it in March is the same reader coming back in April.
 *
 * The middle paragraph is the load-bearing one. Without it the reader sees 30p
 * beside 17p and concludes that a squad earns double, which is false in the
 * worst available way: it looks true. Four relics go in and four rewards come
 * out, one each — the squad is not multiplying the loot, it is buying four
 * looks at each reward and keeping the best.
 *
 * In `apps/web` and not in `packages/ui`, on the placement test: the shape is
 * generic, the copy is about relics and void traces, and a library component
 * carrying this text would have to know what a radshare is. `Frame` is the part
 * another app could use, and it is already there.
 */
export function TierListPrimer() {
  return (
    <Frame
      as="section"
      notch="md"
      surface={2}
      aria-labelledby={TITLE_ID}
      innerClassName="rf-primer"
    >
      <h3 id={TITLE_ID} className="rf-text-overline rf-fg-muted rf-primer-title">
        How to read this
      </h3>

      {/* No `rf-prose` here: `.rf-ranked-note` already holds the whole block to
          the reading measure, and a second cap inside the first is one of them
          nobody can find later. */}
      <div className="rf-text-body-sm rf-primer-body">
        <p>
          <strong>Radshare</strong> means {RADSHARE_PLAYERS} players open the same relic, each one
          refined to Radiant, and the group keeps the single best reward revealed. You need{" "}
          {RADSHARE_PLAYERS - 1} other people for that column to mean anything — on your own, the
          Solo column is your number.
        </p>
        <p>
          A squad of {RADSHARE_PLAYERS} is not {RADSHARE_PLAYERS} times the loot. Every player
          spends a relic and every player keeps one reward — but each of those rewards is picked
          from the best of the {RADSHARE_PLAYERS} reveals. That is why the two columns disagree.
        </p>
        <p>
          Neither column subtracts the 100 void traces a Radiant costs. Traces have no market price,
          and putting one on them would be inventing an exchange rate.
        </p>
      </div>

      <dl className="rf-text-caption rf-primer-terms">
        {TERMS.map(({ term, means }) => (
          <div key={term} className="rf-primer-term">
            <dt className="rf-fg-secondary">{term}</dt>
            <dd className="rf-fg-muted">{means}</dd>
          </div>
        ))}
      </dl>
    </Frame>
  );
}
