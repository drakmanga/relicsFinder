import { ALL_PRIME_PHASES, PHASE_LABEL } from "../lib/lifecycle";

/**
 * The four words the Status column says, in the colours it says them in.
 *
 * It replaces `SetPhaseLegend`, which put the same four terms above the table
 * with a sentence each. The sentences were not the problem; the height was.
 * Four term-and-definition pairs stood between the search band and the first
 * row on the two busiest views, so the reader paid a band of vertical space
 * before a single result had been read, and giving the block more air would
 * only have made it taller.
 *
 * The definitions do not come with them. They stay in `PHASE_MEANS`, which the
 * detail panels render as full sentences, and that is a trade taken with
 * drakmanga on 2026-09-02 rather than an oversight: it overrides the standing
 * rule that no in-game word is left unexplained on screen — "vaulted" is one —
 * and what it buys is the space back. A reader who wants the sentence opens the
 * panel, which is one click from every row that carries the word.
 *
 * What survives the definitions is the colour. The terms are drawn in the same
 * four tones the badges use, so the bar is a key to the column rather than a
 * list of words: green is still droppable, gold is the one to act on, and the
 * two greys are the settled end. The words are the answer and the colour only
 * makes it scannable — the rule `SetPhaseBadge` was drawn to.
 *
 * They stay plain text. Making them buttons would bring the 44x44 rule with it
 * for four controls that would do nothing — and where a control over these four
 * values does belong, it exists: the Sets view has the chips, which is why this
 * bar renders on Prime Items alone.
 *
 * `PHASE_LABEL` is the source, read and never retyped. A glossary defining a
 * word the column no longer says is worse than no glossary.
 */
export function StatusTerms() {
  return (
    <p className="rf-status-terms rf-text-caption">
      <span className="rf-fg-muted">Status</span>
      {ALL_PRIME_PHASES.map((phase) => (
        <span key={phase} className={`rf-phase rf-phase-${phase}`}>
          {PHASE_LABEL[phase]}
        </span>
      ))}
    </p>
  );
}
