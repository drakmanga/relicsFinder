/**
 * Over 150 lines (rule 4). Two thirds of this file is the copy itself and the
 * reasoning behind the wording, and the two halves it would split into — an
 * argument that folds and a glossary that does not — are laid out in one grid
 * and read in parallel, so splitting them would put a layout in one file and
 * both of its columns in two others.
 */
import { useState } from "react";
import { Frame } from "relic-finder-ui";

import { TREND_LABEL } from "./TrendNote";
import { primerOpen, rememberPrimerOpen } from "../lib/primerMemory";
import { VAULT_LABEL } from "../lib/rows";
import { RADSHARE_PLAYERS } from "../lib/tierList";

/** One heading, one instance: the view renders exactly one of these. */
const TITLE_ID = "rf-tier-primer-title";
const PROSE_ID = "rf-tier-primer-prose";

/**
 * The question the prose answers, as the label on the control that hides it.
 *
 * "How to read this" was the old heading and it teaches nobody: shut, it names
 * a section rather than a question, so a reader who folded it in March has
 * nothing to act on in April. This names the one thing behind it that cannot be
 * worked out from the table — the two columns are per-player numbers that
 * disagree — and both words in it are defined in the glossary below, which
 * stays on screen whether the prose is open or not.
 */
const PROSE_LABEL = "Why the Solo and Radshare columns disagree";

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
  {
    /* Added when the prose learned to fold. The word is on screen in both
       states — it is a column header and half the label on the control — and
       with the paragraphs shut this line is the only thing defining it. */
    term: "Radshare",
    means: `${RADSHARE_PLAYERS} players open the same relic Radiant, and each keeps the best of the ${RADSHARE_PLAYERS} rewards.`,
  },
  { term: VAULT_LABEL.farmable, means: "the relic is still in the drop tables." },
  { term: VAULT_LABEL.vaulted, means: "it is not. Another player is the only source." },
  {
    term: "Relic price",
    means: "what the relic itself sells for. It sits beside the letters and never moves them.",
  },
  {
    /* The last column, and the only one that answers in words. It says
       "Steady", "Nothing to compare" or a percentage, and the header's own
       one-line hint is a `title` nobody on a touch screen can reach — so what
       the number is measured against is said here instead. */
    term: "Trend",
    means:
      "how the Solo column has moved against its average over the last 90 days. " +
      "An arrow appears past 10%.",
  },
  {
    /* The two words that column prints, defined where the other seven are.
       They were the only terms on this screen the glossary never explained,
       which reads as though they were obvious — and they are not: "steady"
       suggests a price the game fixes, and the difference between a price that
       held still and one nobody measured is the whole of what `TrendCell` went
       to the trouble of separating.

       Both read their word from `TREND_LABEL` rather than repeating it, for
       the same reason the two vault terms read `VAULT_LABEL`: a glossary that
       defines a word the column no longer says is worse than no glossary. */
    term: TREND_LABEL.steady,
    means: "the price held still — within 10% of its own average.",
  },
  {
    term: TREND_LABEL["no-baseline"],
    means: "there is no 90-day average yet, so nothing is claimed.",
  },
];

/**
 * What a radshare is and what it is not.
 *
 * Never a tooltip: touch has no hover, and a reader does not point at a table
 * header hoping something appears. Behind a disclosure, though, which reverses
 * what stood here — "never behind a disclosure" and "not dismissible either".
 * Both were written about the whole block and are true of half of it. The
 * glossary is a lookup somebody needs again in April and it never folds; the
 * prose is an argument, read once, and pinning it open cost the table the head
 * it needs. Which half is which is the whole of the change, and the fold is
 * remembered per browser — see `primerMemory`.
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
  /* Read once, on mount, and written on every click: the store is where the
     next visit reads its answer, not where this one keeps its state. */
  const [open, setOpen] = useState(primerOpen);

  const fold = () => {
    setOpen((wasOpen) => {
      rememberPrimerOpen(!wasOpen);
      return !wasOpen;
    });
  };

  return (
    <Frame
      as="section"
      notch="md"
      surface={2}
      aria-labelledby={TITLE_ID}
      innerClassName="rf-primer"
    >
      <h3 id={TITLE_ID} className="rf-primer-title">
        {/* The heading is the control. A separate toggle beside it would put
            two things on the head's tightest line to say one thing, and the
            heading is already the sentence a reader would click. */}
        <button
          type="button"
          /* 20px of text inside a 44px box, grown into the frame's own padding
             (rule 7). See .rf-primer-toggle for the inline half of it. */
          className="rf-text-overline rf-fg-muted rf-primer-toggle rf-hit-block rf-focus-ring"
          aria-expanded={open}
          aria-controls={PROSE_ID}
          onClick={fold}
        >
          {PROSE_LABEL}
          <span aria-hidden="true">{open ? "▴" : "▾"}</span>
        </button>
      </h3>

      <div className="rf-primer-cols">
        {/* No `rf-prose` here: `.rf-primer-body` holds this to the reading
            measure itself, in the font it is actually set in — `rf-prose` caps
            in ch against whatever size it inherits. */}
        <div id={PROSE_ID} hidden={!open} className="rf-text-body-sm rf-primer-body">
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
              <dt>{term}</dt>
              <dd className="rf-fg-muted">{means}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Frame>
  );
}
