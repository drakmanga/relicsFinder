import { useId, useState } from "react";
import { BellIcon, Button, Frame, Input } from "relic-finder-ui";

import { ALERT_HOURS, alertDurationMs } from "../lib/fissureAlerts";
import type { AlertPermission } from "../lib/useFissureAlerts";

interface Props {
  active: boolean;
  /** When they switch themselves off, while on. */
  until: number | null;
  permission: AlertPermission;
  onStart: (durationMs: number) => void;
  onStop: () => void;
}

/** "22:45" today, "Sat 21 Nov, 22:45" further out: 200 hours ends next week. */
function endsAt(at: number): string {
  const time = { hour: "2-digit", minute: "2-digit" } as const;
  const sameDay = new Date(at).toDateString() === new Date().toDateString();
  return new Date(at).toLocaleString(
    undefined,
    sameDay ? time : { weekday: "short", day: "numeric", month: "short", ...time },
  );
}

/**
 * The switch for desktop notifications about new fast fissures, at the top
 * right of the tab.
 *
 * In the tab's head rather than under the fissure cards: it is a setting for
 * the whole tab that outlives any one card, and among the cards and the
 * filters it read as one more line of them and went unnoticed.
 *
 * A typed number of hours rather than an on/off: a notification that never
 * ends is one the reader forgets they asked for, so every choice has an end,
 * says when it is, and can be stopped before it.
 */
export function FissureAlerts({ active, until, permission, onStart, onStop }: Props) {
  const [hours, setHours] = useState(String(ALERT_HOURS.initial));
  const fieldId = useId();
  const duration = alertDurationMs(hours);

  if (permission === "unsupported") return null;

  const on = active && until !== null;

  return (
    <Frame
      notch="sm"
      variant={on ? "gilded" : "default"}
      surface={on ? 2 : 1}
      className="rf-crack-alerts"
      innerClassName="rf-crack-alerts-inner"
      aria-live="polite"
    >
      <BellIcon
        className={on ? "rf-crack-alerts-bell rf-crack-alerts-bell-on" : "rf-crack-alerts-bell"}
      />

      {on ? (
        <>
          <span className="rf-text-body-sm">
            Alerts on <span className="rf-fg-muted">until {endsAt(until)}</span>
          </span>
          <Button variant="ghost" size="sm" className="rf-hit-block" onClick={onStop}>
            Stop
          </Button>
        </>
      ) : permission === "denied" ? (
        <span className="rf-text-caption rf-fg-muted">
          Alerts are blocked in this browser's site settings
        </span>
      ) : (
        <form
          className="rf-crack-alerts-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (duration !== null) onStart(duration);
          }}
        >
          <label htmlFor={fieldId} className="rf-text-body-sm rf-fg-secondary">
            Alert me to fast fissures for
          </label>
          {/* Text with a decimal keypad rather than type="number": the
              spinner arrows step by one hour, useless at 200, and a number
              field silently drops the "1,5" an Italian keyboard types. */}
          <Input
            id={fieldId}
            size="sm"
            inputMode="decimal"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            trailing={<span className="rf-text-caption rf-fg-muted">h</span>}
            aria-invalid={duration === null}
            aria-describedby={duration === null ? `${fieldId}-range` : undefined}
            wrapperClassName="rf-crack-alerts-hours"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="rf-hit-block"
            disabled={duration === null}
          >
            Start
          </Button>
          {duration === null && (
            <span id={`${fieldId}-range`} className="rf-text-caption rf-crack-error">
              {ALERT_HOURS.min} to {ALERT_HOURS.max} hours
            </span>
          )}
        </form>
      )}
    </Frame>
  );
}
