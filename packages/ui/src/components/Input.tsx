import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  /** Leading icon, 20px, muted. */
  icon?: ReactNode;
  /** Trailing slot — a clear button, a unit, a shortcut hint. */
  trailing?: ReactNode;
  /** Keyboard hint chip rendered at the trailing edge, e.g. `⌘K`. */
  shortcut?: string;
  size?: InputSize;
  /** Turns the frame red and wires aria-invalid + aria-describedby. */
  error?: ReactNode;
  helper?: ReactNode;
  className?: string;
  /** Class for the outermost wrapper, so callers can size the field. */
  wrapperClassName?: string;
}

/**
 * Text input.
 *
 * The border is the only thing announcing the control, so it uses
 * `border-interactive` (#8A7423, 3.26:1 against every surface) rather than a
 * decorative gold alpha — those top out around 1.9:1 and would leave the field
 * effectively invisible.
 */
export function Input({
  label,
  icon,
  trailing,
  shortcut,
  size = "md",
  error,
  helper,
  className,
  wrapperClassName,
  id,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-msg`;
  const message = error ?? helper;

  return (
    <div className={cx("rf-field", `rf-field-${size}`, wrapperClassName)}>
      {label && (
        <label className="rf-field-label" htmlFor={inputId}>
          {label}
        </label>
      )}

      <div
        className={cx(
          "rf-frame",
          "rf-notch-sm",
          error ? "rf-frame-danger" : "rf-frame-interactive",
        )}
      >
        <div className="rf-frame-inner rf-field-box">
          <div className="rf-field-row">
            {icon}
            <input
              id={inputId}
              className={cx("rf-field-input", className)}
              aria-invalid={error ? true : undefined}
              aria-describedby={message ? messageId : undefined}
              {...rest}
            />
            {shortcut && <span className="rf-kbd rf-clip">{shortcut}</span>}
            {trailing}
          </div>
        </div>
      </div>

      {message && (
        <p
          id={messageId}
          className={cx("rf-field-helper", error ? "rf-field-helper-error" : undefined)}
        >
          {message}
        </p>
      )}
    </div>
  );
}
