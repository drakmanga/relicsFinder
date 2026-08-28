import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cx } from "../lib/cx";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "children"
> {
  /** The visible label. Also the control's accessible name. */
  children: ReactNode;
}

/**
 * Checkbox with its label.
 *
 * The label WRAPS the input and also names it by `htmlFor`/`id`. Both, and for
 * two different reasons. The explicit pair is what survives a label whose text
 * sits inside a styled span, which is how both of this app's checkboxes were
 * written and why neither had an accessible name a checker could find. The
 * wrapping is rule 7: a native tick is 13x13 and cannot be given a bigger box —
 * Chrome ignores border and padding on a checkbox, and width and height grow
 * the tick itself rather than the target — so the thing that carries the 44px
 * hit area is the other element that activates one. `rf-hit-block` grows the
 * label's box to the minimum by 12px of transparent border, and hands the same
 * 12px back as margin, so the row stays exactly as tall as it was drawn.
 *
 * The id is generated unless one is passed, so two of these on a page never
 * collide.
 */
export function Checkbox({ children, className, id, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label htmlFor={inputId} className={cx("rf-checkbox", "rf-hit-block", className)}>
      <input id={inputId} type="checkbox" className="rf-checkbox-input" {...rest} />
      <span className="rf-checkbox-label">{children}</span>
    </label>
  );
}
