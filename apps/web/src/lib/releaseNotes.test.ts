import { describe, expect, it } from "vitest";

import { plainReleaseNotes } from "./releaseNotes";

describe("plainReleaseNotes", () => {
  it("has nothing to show for a release with no body", () => {
    // Null rather than "": the dialog leaves the whole section out, and a
    // heading over nothing reads as a release that changed nothing.
    expect(plainReleaseNotes(null)).toBeNull();
    expect(plainReleaseNotes(undefined)).toBeNull();
    expect(plainReleaseNotes("   \n\n  ")).toBeNull();
  });

  it("drops the heading markers and keeps the heading", () => {
    expect(plainReleaseNotes("## What's Changed")).toBe("What's Changed");
    expect(plainReleaseNotes("###### Deep")).toBe("Deep");
  });

  it("turns list markers into a bullet a reader recognises", () => {
    expect(plainReleaseNotes("* One\n- Two")).toBe("• One\n• Two");
  });

  it("unwraps emphasis and links to what they were standing for", () => {
    expect(plainReleaseNotes("**Full Changelog**: v0.1.0...v0.2.0")).toBe(
      "Full Changelog: v0.1.0...v0.2.0",
    );
    expect(plainReleaseNotes("See [the compare](https://example.test/c) for it")).toBe(
      "See the compare for it",
    );
  });

  it("collapses the run of blank lines GitHub leaves before the changelog", () => {
    expect(plainReleaseNotes("One\n\n\n\nTwo")).toBe("One\n\nTwo");
  });

  it("leaves a line it does not recognise exactly as written", () => {
    // The failure it must not have: swallowing a line because the shape was
    // unexpected. Unrecognised is rendered, not dropped.
    expect(plainReleaseNotes("2 * 3 = 6 and 4 - 1 = 3")).toBe("2 * 3 = 6 and 4 - 1 = 3");
    expect(plainReleaseNotes("C:\\Program Files\\RelicFinder")).toBe(
      "C:\\Program Files\\RelicFinder",
    );
  });

  it("reads a whole set of generated notes", () => {
    const body =
      "## What's Changed\r\n" +
      "* Let a long name clip by @drakmanga in https://example.test/pull/12\r\n" +
      "\r\n\r\n" +
      "**Full Changelog**: https://example.test/compare/v0.1.0...v0.2.0\r\n";

    expect(plainReleaseNotes(body)).toBe(
      "What's Changed\n" +
        "• Let a long name clip by @drakmanga in https://example.test/pull/12\n" +
        "\n" +
        "Full Changelog: https://example.test/compare/v0.1.0...v0.2.0",
    );
  });
});
