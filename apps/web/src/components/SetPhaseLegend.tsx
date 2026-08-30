import { PHASE_LABEL } from "../lib/lifecycle";

/**
 * What the four words in the Status column mean, on the screen that uses them.
 *
 * Not a tooltip and not a `title` on the header: touch has no hover, a screen
 * reader gets neither, and nobody can search for a string that only exists on
 * pointer-over. AGENTS.md asks for no unexplained in-game vocabulary, and
 * "vaulted" is in-game vocabulary — the panels carry the full sentence, and a
 * reader who never opens one still meets the word here.
 *
 * Never folded, unlike the tier list's prose beside its own glossary. That
 * distinction is `primerMemory`'s: an argument is read once and understood for
 * good, a lookup is needed again in April. This is a lookup.
 *
 * The labels are read from `PHASE_LABEL` rather than retyped. A glossary
 * defining a word the column no longer says is worse than no glossary.
 */
const TERMS: readonly { readonly term: string; readonly means: string }[] = [
  { term: PHASE_LABEL.dropping, means: "still comes out of relics." },
  { term: PHASE_LABEL["recently-vaulted"], means: "stopped dropping under two years ago." },
  { term: PHASE_LABEL["long-vaulted"], means: "stopped dropping over two years ago." },
  { term: PHASE_LABEL.unknown, means: "nothing here records when it stopped." },
];

export function SetPhaseLegend() {
  return (
    <dl className="rf-text-caption rf-primer-terms" aria-label="What the Status column means">
      {TERMS.map(({ term, means }) => (
        <div key={term} className="rf-primer-term">
          <dt>{term}</dt>
          <dd className="rf-fg-muted">{means}</dd>
        </div>
      ))}
    </dl>
  );
}
