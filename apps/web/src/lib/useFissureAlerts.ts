import { useEffect, useRef, useState } from "react";

import type { FissureFeed, OwnedRelic } from "../api/types";
import type { CrackOptions } from "./crackOptions";
import { alertText, alertWorthy, copiesFor, heldByTier } from "./fissureAlerts";

/**
 * When notifications end, kept in this browser so a reload does not switch
 * them off halfway. Per-viewer convenience, which is what localStorage is for
 * here; every read and write is guarded, and losing it only means the reader
 * turns them on again.
 */
const STORAGE_KEY = "relic-finder.fissure-alerts.until";

export type AlertPermission = NotificationPermission | "unsupported";

const supported = () => typeof window !== "undefined" && "Notification" in window;

function readUntil(): number | null {
  try {
    const until = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(until) && until > Date.now() ? until : null;
  } catch {
    return null;
  }
}

function writeUntil(until: number | null) {
  try {
    if (until === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(until));
  } catch {
    // Private window or blocked storage: notifications still run this session.
  }
}

/**
 * Desktop notifications for fast fissures the reader holds relics for, for a
 * set time and never open-ended.
 *
 * Only fissures that appear after notifications are switched on are announced:
 * the ones already open are on screen in the cards, and announcing all of
 * them at once would be the burst that gets notifications blocked for good.
 * The same holds after a reload, which is why the first feed seen is taken as
 * the baseline rather than as news.
 */
export function useFissureAlerts(
  feed: FissureFeed | undefined,
  owned: readonly OwnedRelic[],
  options: CrackOptions,
  now: number,
) {
  const [until, setUntil] = useState<number | null>(readUntil);
  const [permission, setPermission] = useState<AlertPermission>(() =>
    supported() ? Notification.permission : "unsupported",
  );
  /** Fissure ids already announced or already open when the watch began. Null: take the next feed as that baseline. */
  const seen = useRef<Set<string> | null>(null);

  // Past `until` this is simply false: the watch ends on its own, which is the
  // point of a duration, and a stale `until` left in storage is ignored by
  // `readUntil` on the next load.
  const active = until !== null && now < until;

  const stop = () => {
    setUntil(null);
    writeUntil(null);
    seen.current = null;
  };

  const start = async (durationMs: number) => {
    if (!supported()) return;
    const answer =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    setPermission(answer);
    if (answer !== "granted") return;

    const next = Date.now() + durationMs;
    seen.current = null;
    setUntil(next);
    writeUntil(next);
  };

  useEffect(() => {
    if (!active || !feed || permission !== "granted") return;

    const held = heldByTier(owned);
    const worthy = alertWorthy(feed, options, held, Date.now());

    if (seen.current === null) {
      seen.current = new Set(worthy.map((fissure) => fissure.id));
      return;
    }

    for (const fissure of worthy) {
      if (seen.current.has(fissure.id)) continue;
      seen.current.add(fissure.id);
      const { title, body } = alertText(fissure, copiesFor(fissure, held));
      // `tag` makes a repeat of the same fissure replace its notification
      // rather than stack a second one.
      new Notification(title, { body, tag: fissure.id });
    }
  }, [active, feed, owned, options, permission]);

  return { active, until: active ? until : null, permission, start, stop };
}
