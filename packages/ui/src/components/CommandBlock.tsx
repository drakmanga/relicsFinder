import { useState } from "react";
import { Button } from "./Button";
import { cx } from "../lib/cx";

export interface CommandBlockProps {
  /** One command per line, in the order they are meant to be run. */
  commands: string[];

  /** Names what the copy button copies, for a reader who cannot see the block. */
  label: string;

  className?: string;
}

/** Long enough to be read as an answer, short enough not to look stuck. */
const CONFIRMATION_MS = 2000;

/**
 * Commands somebody is meant to run themselves, ready to copy.
 *
 * The text is selectable whether or not the button is there, which matters more
 * than it looks: `navigator.clipboard` exists only in a secure context, and a
 * container install reached at http://192.168.1.20 is not one. Rather than a
 * button that silently fails on exactly the setup most likely to see this, the
 * button is not rendered at all when the API is missing — the commands are still
 * on screen, still selectable, and nothing has lied about what it will do.
 *
 * A `<pre>` rather than styled divs because these are commands: the whitespace
 * is part of them, and so is the ability to select the block and get back what
 * was shown.
 */
export function CommandBlock({ commands, label, className }: CommandBlockProps) {
  const [copied, setCopied] = useState(false);

  const text = commands.join("\n");
  const canCopy = typeof navigator !== "undefined" && Boolean(navigator.clipboard);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), CONFIRMATION_MS);
    } catch {
      // Permission refused, or a context that turned out not to be secure after
      // all. The commands are on screen either way, so there is nothing to
      // report and nothing for the reader to do about it.
      setCopied(false);
    }
  }

  return (
    <div className={cx("rf-commands", className)}>
      {/*
        Focusable because it scrolls sideways: a command longer than the block is
        unreachable to a keyboard otherwise, which axe reports and a mouse never
        notices. `role="group"` is what makes the label count — a bare <pre> maps
        to generic, and an aria-label on a generic element is thrown away.

        The lint rule below and axe's scrollable-region-focusable are in direct
        conflict here, and axe is the one that is right: WCAG 2.1.1 wants
        scrolling content operable by keyboard, and the rule is guarding against
        tab stops on things that do nothing, which this is not.
      */}
      {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
      <pre
        className="rf-commands-text rf-focus-ring rf-text-body-sm"
        tabIndex={0}
        role="group"
        aria-label={label}
      >
        {text}
      </pre>
      {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}

      {canCopy && (
        <Button variant="ghost" onClick={copy} aria-label={`Copy ${label}`}>
          {copied ? "Copied" : "Copy"}
        </Button>
      )}
    </div>
  );
}
