import { BellIcon, Button, Frame } from "relic-finder-ui";

import { useTeshinAlertSwitch } from "../lib/teshinAlert";

/**
 * The switch for the notification about Teshin's 50,000 Kuva, at the top
 * right of the Kuva tab.
 *
 * Drawn with the Relic Crack's fissure-alert classes on purpose: it is the
 * same kind of control in the same place on its tab, and two alert switches
 * that looked different would read as two different features.
 */
export function TeshinAlert() {
  const { on, permission, start, stop } = useTeshinAlertSwitch();

  if (permission === "unsupported") return null;

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

      {permission === "denied" ? (
        <span className="rf-text-caption rf-fg-muted">
          Alerts are blocked in this browser's site settings
        </span>
      ) : on ? (
        <>
          <span className="rf-text-body-sm">
            Alert on <span className="rf-fg-muted">for Teshin's 50,000 Kuva</span>
          </span>
          <Button variant="ghost" size="sm" className="rf-hit-block" onClick={stop}>
            Stop
          </Button>
        </>
      ) : (
        <>
          <span className="rf-text-body-sm rf-fg-secondary">
            Alert me when Teshin's 50,000 Kuva is in the shop
          </span>
          <Button variant="outline" size="sm" className="rf-hit-block" onClick={() => start()}>
            Start
          </Button>
        </>
      )}
    </Frame>
  );
}
