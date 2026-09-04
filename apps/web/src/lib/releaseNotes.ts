/**
 * GitHub's release notes, made readable without a markdown renderer.
 *
 * What arrives is the body GitHub generated: `## What's Changed`, a list of
 * `* ` lines, `**Full Changelog**` and a compare link. Rendered raw, a reader
 * is shown punctuation that means something only to somebody who already knows
 * markdown — which is the project's rule about unexplained jargon, applied to a
 * syntax rather than to a Warframe word.
 *
 * A markdown library would be the other answer, and it is a dependency and a
 * sanitiser for one paragraph in one dialog. This is five substitutions over
 * text that is already close to plain, and it degrades into "the line, as
 * written" for anything it does not recognise rather than into an empty box.
 */

/** How many blank lines in a row survive. GitHub's generated notes carry three. */
const MAX_BLANK_LINES = 1;

const HEADING = /^#{1,6}\s+/;
const BULLET = /^[*-]\s+/;
const BOLD_OR_ITALIC = /\*{1,2}([^*]+)\*{1,2}/g;
const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

/** One line, with its markers turned into what they were standing for. */
function plainLine(line: string): string {
  return line
    .replace(HEADING, "")
    .replace(BULLET, "• ")
    .replace(LINK, "$1")
    .replace(BOLD_OR_ITALIC, "$1")
    .trimEnd();
}

/**
 * The notes as plain text, or null when there are none.
 *
 * Null rather than an empty string so the dialog can leave the whole section
 * out: a heading over nothing reads as a release that changed nothing.
 */
export function plainReleaseNotes(body: string | null | undefined): string | null {
  if (!body) return null;

  const lines = body.replace(/\r\n/g, "\n").split("\n").map(plainLine);

  const kept: string[] = [];
  let blanks = 0;

  for (const line of lines) {
    if (line.trim() === "") {
      blanks += 1;
      if (blanks > MAX_BLANK_LINES) continue;
    } else {
      blanks = 0;
    }
    kept.push(line);
  }

  const text = kept.join("\n").trim();
  return text === "" ? null : text;
}
