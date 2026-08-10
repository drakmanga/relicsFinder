import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { cx } from "../lib/cx";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  /** The visible label. Also the control's accessible name. */
  children: ReactNode;
}

/**
 * Checkbox with its label.
 *
 * The two are tied by `htmlFor`/`id` rather than by nesting alone: nesting
 * associates them for a browser, but only the explicit pair survives a label
 * whose text sits inside a styled span, which is how both of this app's
 * checkboxes were written and why neither had an accessible name a checker
 * could find.
 *
 * The id is generated unless one is passed, so two of these on a page never
 * collide.
 */
export function Checkbox({ children, className, id, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cx("rf-checkbox", className)}>
      <input id={inputId} type="checkbox" className="rf-checkbox-input" {...rest} />
      <label htmlFor={inputId} className="rf-checkbox-label">
        {children}
      </label>
    </div>
  );
}
