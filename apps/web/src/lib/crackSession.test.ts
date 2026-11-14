import { describe, expect, it } from "vitest";

import { appendEntry, sessionTotals, type SessionEntry } from "./crackSession";

const entry = (id: string, value: number, ducats: number): SessionEntry => ({
  id,
  relicName: "Neo N16",
  refinement: "radiant",
  value,
  ducats,
  at: 0,
});

describe("the session log", () => {
  it("adds up what was opened", () => {
    expect(sessionTotals([entry("a", 12.7, 29.5), entry("b", 1, 100)])).toEqual({
      opened: 2,
      value: 13.7,
      ducats: 129.5,
    });
  });

  it("keeps the newest 500 openings and drops the oldest", () => {
    let log: SessionEntry[] = [];
    for (let i = 0; i < 501; i++) log = appendEntry(log, entry(String(i), 1, 1));

    expect(log).toHaveLength(500);
    expect(log[0]!.id).toBe("1");
    expect(log.at(-1)!.id).toBe("500");
  });
});
