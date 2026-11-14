import { useEffect, useState } from "react";

/**
 * The current time, re-read every `intervalMs`.
 *
 * For lines that count down ("expires in 18 min"): a value computed once at
 * render would sit on the screen getting older while the fissure it describes
 * closes. Re-rendering on a timer is cheaper than tracking each deadline.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
