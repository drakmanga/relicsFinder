import { describe, expect, it } from "vitest";

import { shouldAnnounce, skippedVersionFrom } from "./updateMemory";

describe("skippedVersionFrom", () => {
  it("has nothing skipped before anything was skipped", () => {
    expect(skippedVersionFrom(null)).toBeNull();
  });

  it("reads back the version that was skipped", () => {
    expect(skippedVersionFrom(JSON.stringify({ version: "0.2.0" }))).toBe("0.2.0");
  });

  it("treats storage it cannot read as nothing skipped", () => {
    // The safe side is showing a notice rather than silencing one: a reader who
    // sees it twice is annoyed, a reader who never sees it is on March's build.
    expect(skippedVersionFrom("{not json")).toBeNull();
    expect(skippedVersionFrom("null")).toBeNull();
    expect(skippedVersionFrom("42")).toBeNull();
    expect(skippedVersionFrom(JSON.stringify({ version: 2 }))).toBeNull();
    expect(skippedVersionFrom(JSON.stringify({ version: "" }))).toBeNull();
    expect(skippedVersionFrom(JSON.stringify({}))).toBeNull();
  });
});

describe("shouldAnnounce", () => {
  it("announces a release nobody has skipped", () => {
    expect(shouldAnnounce("0.2.0", null)).toBe(true);
  });

  it("stays quiet about the release that was skipped", () => {
    expect(shouldAnnounce("0.2.0", "0.2.0")).toBe(false);
  });

  it("asks again about the next one", () => {
    // The whole point of storing a version rather than a flag.
    expect(shouldAnnounce("0.3.0", "0.2.0")).toBe(true);
  });

  it("says nothing when there is no release to announce", () => {
    // The offline answer. A notice about null is worse than no notice.
    expect(shouldAnnounce(null, null)).toBe(false);
    expect(shouldAnnounce(undefined, "0.2.0")).toBe(false);
    expect(shouldAnnounce("", null)).toBe(false);
  });
});
