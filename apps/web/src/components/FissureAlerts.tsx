import { Button } from "relic-finder-ui";

import { ALERT_DURATIONS } from "../lib/fissureAlerts";
import type { AlertPermission } from "../lib/useFissureAlerts";

interface Props {
  active: boolean;
  /** When they switch themselves off, while on. */
  until: number | null;
  permission: AlertPermission;
  onStart: (durationMs: number) => void;
  onStop: () => void;
}

const clock = (at: number) =>
  new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/**
 * The switch for desktop notifications about new fast fissures.
 *
 * A duration rather than an on/off: a notification that never ends is one the
 * reader forgets they asked for, so every choice here has an end, says when
 * it is, and can be stopped before it.
 */
export function FissureAlerts({ active, until, permission, onStart, onStop }: Props) {
  if (permission === "unsupported") return null;

  return (
    <div className="rf-crack-alerts" aria-live="polite">
      {active && until !== null ? (
        <>
          <span className="rf-text-body-sm">
            Notifying you of new fast fissures until {clock(until)}
          </span>
          <Button variant="outline" size="sm" className="rf-hit-block" onClick={onStop}>
            Stop
          </Button>
        </>
      ) : permission === "denied" ? (
        <span className="rf-text-body-sm rf-fg-muted">
          Notifications are blocked for this site in the browser's settings.
        </span>
      ) : (
        <>
          <span className="rf-text-body-sm rf-fg-muted">
            Notify me when a fast fissure opens for my relics, for
          </span>
          {ALERT_DURATIONS.map((duration) => (
            <Button
              key={duration.label}
              variant="ghost"
              size="sm"
              className="rf-hit-block"
              onClick={() => onStart(duration.ms)}
            >
              {duration.label}
            </Button>
          ))}
        </>
      )}
    </div>
  );
}
