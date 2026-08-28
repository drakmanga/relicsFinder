import { describe, expect, it } from "vitest";

import { parseEntry, parseStoredList } from "./owned";

/**
 * What a collection stored before pieces had counts is worth.
 *
 * A name has always meant "I have this", which is one copy. Reading one as zero
 * would empty a list somebody spent months ticking, and that is the only way
 * this migration can do real damage — `OwnedServiceMigrationTest` asserts the
 * same thing about the file on the server.
 */
describe("parseEntry", () => {
  it("reads a bare name as one copy", () => {
    expect(parseEntry("Kestrel Prime Blade")).toEqual(["Kestrel Prime Blade", 1]);
  });

  it("reads a counted entry as its count", () => {
    expect(parseEntry({ itemName: "Kestrel Prime Blade", quantity: 2 })).toEqual([
      "Kestrel Prime Blade",
      2,
    ]);
  });

  it("reads an entry that names no count as one copy", () => {
    expect(parseEntry({ itemName: "Kestrel Prime Blade" })).toEqual(["Kestrel Prime Blade", 1]);
  });

  it("drops an entry holding nothing", () => {
    expect(parseEntry({ itemName: "Kestrel Prime Blade", quantity: 0 })).toBeNull();
    expect(parseEntry({ itemName: "Kestrel Prime Blade", quantity: -1 })).toBeNull();
  });

  it("drops anything that is not an entry at all", () => {
    expect(parseEntry("")).toBeNull();
    expect(parseEntry(null)).toBeNull();
    expect(parseEntry({ quantity: 2 })).toBeNull();
  });
});

describe("parseStoredList", () => {
  it("reads the list of names this replaces", () => {
    expect(parseStoredList('["Volt Prime Chassis Blueprint", "Kestrel Prime Blade"]')).toEqual(
      new Map([
        ["Volt Prime Chassis Blueprint", 1],
        ["Kestrel Prime Blade", 1],
      ]),
    );
  });

  it("reads counts, and both shapes in one list", () => {
    expect(
      parseStoredList(
        '["Volt Prime Chassis Blueprint", {"itemName": "Kestrel Prime Blade", ' + '"quantity": 2}]',
      ),
    ).toEqual(
      new Map([
        ["Volt Prime Chassis Blueprint", 1],
        ["Kestrel Prime Blade", 2],
      ]),
    );
  });

  it("keeps one entry per name", () => {
    const stored = '[{"itemName": "Kestrel Prime Blade", "quantity": 1}, "Kestrel Prime Blade"]';

    expect(parseStoredList(stored)?.size).toBe(1);
  });

  it("says nothing rather than empty when the key holds nothing usable", () => {
    // Null is what sends the reader to the key this replaced; an empty map
    // would answer "you own nothing" and stop the migration from running.
    expect(parseStoredList(null)).toBeNull();
    expect(parseStoredList("")).toBeNull();
    expect(parseStoredList('{"itemName": "Kestrel Prime Blade"}')).toBeNull();
  });
});
