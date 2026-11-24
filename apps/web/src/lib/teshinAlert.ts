import { useEffect, useState, useSyncExternalStore } from "react";

import { countdownLabel, steelPathKuvaRotation, WEEK_MS } from "./kuva";

/**
 * A desktop notification when Teshin's 50,000 Kuva comes into the Steel Path
 * Honors shop, switched on and off from the Kuva tab.
 *
 * An on/off switch rather than the fissure alerts' typed hours: those are cut
 * short on purpose because fissures would notify every few minutes, and this
 * fires once in eight weeks — a duration would only be something to forget
 * to renew.
 *
 * In this browser, like the fissure alerts: a notification is shown by the
 * browser that asked for it, so the setting belongs to that browser. Every
 * read and write is guarded, as storage can be blocked.
 */
const ENABLED_KEY = "relic-finder.teshin-alert";
/** The week start of the last rotation already announced, so a reload does not repeat it. */
const NOTIFIED_KEY = "relic-finder.teshin-alert.notified";

/** Often enough that the alert lands within a minute of Monday's reset. */
const CHECK_EVERY = 60_000;

export type AlertPermission = NotificationPermission | "unsupported";

const supported = () => typeof window !== "undefined" && "Notification" in window;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Blocked storage: the switch still works until the page reloads.
  }
}

/* A one-value store, so the switch on the Kuva tab and the watcher in the
   shell agree without threading a prop through every view between them. */
let enabled = read(ENABLED_KEY) === "on";
const listeners = new Set<() => void>();

function setEnabled(next: boolean) {
  enabled = next;
  write(ENABLED_KEY, next ? "on" : null);
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * The week start to announce, or null when there is nothing new to say: off,
 * the bundle is not in the shop, or this rotation was announced already.
 * Pure, so the rule is tested without a browser.
 */
export function rotationToAnnounce(
  on: boolean,
  now: number,
  lastNotified: number | null,
): number | null {
  if (!on) return null;
  const rotation = steelPathKuvaRotation(now);
  if (!rotation.thisWeek) return null;
  const weekStart = rotation.at - WEEK_MS;
  return lastNotified === weekStart ? null : weekStart;
}

/** The switch, for the Kuva tab. */
export function useTeshinAlertSwitch() {
  const on = useSyncExternalStore(subscribe, () => enabled);
  // State rather than read at render: a refusal changes no stored value, so
  // nothing else would re-render the switch into its "blocked" line.
  const [permission, setPermission] = useState<AlertPermission>(() =>
    supported() ? Notification.permission : "unsupported",
  );

  const start = async () => {
    if (!supported()) return;
    const answer =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    setPermission(answer);
    // Not marked as already announced: switching on during the bundle's own
    // week should say so at once, which is the moment it is most useful.
    if (answer === "granted") setEnabled(true);
  };

  return { on, permission, start, stop: () => setEnabled(false) };
}

/**
 * The watcher, mounted once in the shell so it runs whichever tab is open.
 * It keeps its own timer rather than taking a clock from the shell, because a
 * clock state there would re-render every view once a minute for one check.
 */
export function useTeshinAlertWatcher() {
  const on = useSyncExternalStore(subscribe, () => enabled);

  useEffect(() => {
    if (!on || !supported()) return;

    const check = () => {
      if (Notification.permission !== "granted") return;
      const now = Date.now();
      const last = Number(read(NOTIFIED_KEY));
      const weekStart = rotationToAnnounce(on, now, Number.isFinite(last) ? last : null);
      if (weekStart === null) return;
      write(NOTIFIED_KEY, String(weekStart));
      const left = countdownLabel(weekStart + WEEK_MS - now);
      new Notification("Teshin's 50,000 Kuva is in the shop", {
        body: `55 Steel Essence at the Steel Path Honors, for ${left} more.`,
        // Replaces rather than stacks if two open tabs both announce it.
        tag: `teshin-kuva-${weekStart}`,
      });
    };

    check();
    const timer = setInterval(check, CHECK_EVERY);
    return () => clearInterval(timer);
  }, [on]);
}
