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
 * What a radshare is and what it is not.
 *
 * Always on screen, never a tooltip and never behind a disclosure. Every word
 * this tab uses is vocabulary the game teaches and the screen does not, and a
 * title attribute teaches nobody: touch has no hover, and a reader does not
 * point at a table header hoping something appears. Not dismissible either —
 * whoever dismissed it in March is the same reader coming back in April.
 *
 * The second paragraph is the load-bearing one. Without it the reader sees 30p
 * beside 17p and concludes that a squad earns double, which is false in the
 * worst available way: it looks true. Four relics go in and four rewards come
 * out, one each — the squad is not multiplying the loot, it is buying four
 * looks at each reward and keeping the best.
 *
 * A third paragraph used to say that neither column subtracts the 100 void
 * traces a Radiant costs. It went for the head height: the Radiant term below
 * already carries the price, so the fact survives, and the rest of it was an
 * argument for a decision rather than something needed to read the table.
 *
 * The prose and the glossary sit side by side where the pane can hold two
 * reading measures, and stack where it cannot — see `.rf-primer-cols`. They are
 * read in parallel rather than in sequence: the words the paragraphs use are
 * the words the list defines.
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

      <div className="rf-primer-cols">
        {/* No `rf-prose` here: `.rf-primer-body` holds this to the reading
            measure itself, in the font it is actually set in — `rf-prose` caps
            in ch against whatever size it inherits. */}
        <div className="rf-text-body-sm rf-primer-body">
          {/* "each player takes the best one", not "the group keeps one": the
              column is a per-player number, the same thing the Solo column is,
              or the two would not be comparable at all. The paragraph under
              this one says so too, and the two have to say it the same way — a
              reader who takes this one literally reads the Radshare figure as a
              squad total and divides it by four. */}
          <p>
            <strong>Radshare</strong> means {RADSHARE_PLAYERS} players open the same relic, each one
            refined to Radiant. All {RADSHARE_PLAYERS} rewards are revealed and every player takes
            the best one on the table. You need {RADSHARE_PLAYERS - 1} other people for that column
            to mean anything — on your own, the Solo column is your number.
          </p>
          <p>
            A squad of {RADSHARE_PLAYERS} is not {RADSHARE_PLAYERS} times the loot. Every player
            spends a relic and every player keeps one reward — but each of those rewards is picked
            from the best of the {RADSHARE_PLAYERS} reveals. That is why the two columns disagree.
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
      </div>
    </Frame>
  );
}
