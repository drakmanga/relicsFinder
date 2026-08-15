import { describe, expect, it } from "vitest";

import { asOfTime, asOfTitle } from "./freshness";

/**
 * The exact string depends on the locale and zone the test runs in, so what is
 * asserted is the behaviour that does not: that a real instant produces
 * something, that the two views agree on which instant it was, and — the part
 * that matters — that every way of having no instant produces nothing.
 */
describe("asOfTime", () => {
  it("renders a real instant", () => {
    expect(asOfTime("2026-08-15T19:04:00Z")).toBeTruthy();
  });

  it("agrees with the same instant written in another offset", () => {
    expect(asOfTime("2026-08-15T19:04:00Z")).toBe(asOfTime("2026-08-15T21:04:00+02:00"));
  });

  it("tells two different instants apart", () => {
    expect(asOfTime("2026-08-15T19:04:00Z")).not.toBe(asOfTime("2026-08-15T20:37:00Z"));
  });

  // The live cache answers with an instant two days back, because the oldest
  // reading is what this label reports. Without the date that renders as a
  // time this evening.
  it("adds the date once the instant is not today", () => {
    const now = new Date("2026-08-15T21:00:00Z");

    const today = asOfTime("2026-08-15T19:04:00Z", now)!;
    const before = asOfTime("2026-08-13T19:04:00Z", now)!;

    expect(before).not.toBe(today);
    expect(before.endsWith(today)).toBe(true);
    expect(before.length).toBeGreaterThan(today.length);
  });

  it("leaves the date off for an instant earlier the same day", () => {
    const now = new Date("2026-08-15T21:00:00Z");
    expect(asOfTime("2026-08-15T06:04:00Z", now)).toBe(
      new Date("2026-08-15T06:04:00Z").toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  });

  // The server sends null before its cache holds anything. Read as a date that
  // null becomes 1 January 1970, which the topbar would print without blinking.
  it("is null for null, undefined and the empty string", () => {
    expect(asOfTime(null)).toBeNull();
    expect(asOfTime(undefined)).toBeNull();
    expect(asOfTime("")).toBeNull();
  });

  it("is null for something that is not a date", () => {
    expect(asOfTime("not an instant")).toBeNull();
  });
});

describe("asOfTitle", () => {
  it("renders a real instant", () => {
    expect(asOfTitle("2026-08-15T19:04:00Z")).toBeTruthy();
  });

  it("carries more than the clock time, which is the reason it exists", () => {
    const iso = "2026-08-15T19:04:00Z";
    expect(asOfTitle(iso)!.length).toBeGreaterThan(asOfTime(iso)!.length);
  });

  it("is null for anything unusable", () => {
    expect(asOfTitle(null)).toBeNull();
    expect(asOfTitle(undefined)).toBeNull();
    expect(asOfTitle("")).toBeNull();
    expect(asOfTitle("not an instant")).toBeNull();
  });
});
