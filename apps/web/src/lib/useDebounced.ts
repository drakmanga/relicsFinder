import { useEffect, useState } from "react";

/**
 * Trails a value by `delay`.
 *
 * Used for the price batch: the visible window changes on every scroll frame,
 * and firing a request per frame would hammer the market limiter for rows the
 * user has already scrolled past.
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
