import { describe, expect, it } from "vitest";

import type { UpdateInstall } from "../api/types";
import {
  downloadedOf,
  installMessage,
  installUnderWay,
  megabytes,
  problemMessage,
  SELF_UPDATE_FILE,
  SELF_UPDATE_OPT_IN,
} from "./updateInstall";

const install = (over: Partial<UpdateInstall> = {}): UpdateInstall => ({
  stage: "idle",
  problem: null,
  downloaded: 0,
  total: 0,
  ...over,
});

describe("megabytes", () => {
  it("rounds to whole megabytes, because a moving decimal is noise", () => {
    expect(megabytes(63_400_000)).toBe("63 MB");
    expect(megabytes(63_600_000)).toBe("64 MB");
  });

  it("says 0 MB rather than a negative one", () => {
    expect(megabytes(-1)).toBe("0 MB");
  });
});

describe("downloadedOf", () => {
  it("puts the part before the whole", () => {
    expect(downloadedOf(install({ downloaded: 24_000_000, total: 63_000_000 }))).toBe(
      "24 MB of 63 MB",
    );
  });
});

describe("installMessage", () => {
  it("says nothing at all before anybody has clicked", () => {
    expect(installMessage(install())).toBeNull();
  });

  it("counts the download up", () => {
    expect(
      installMessage(install({ stage: "downloading", downloaded: 12_000_000, total: 63_000_000 })),
    ).toBe("Downloading — 12 MB of 63 MB");
  });

  it("names the check, so a reader can see that one happened", () => {
    expect(installMessage(install({ stage: "verifying" }))).toContain("real one");
  });

  it("warns that the application is about to disappear and come back", () => {
    const message = installMessage(install({ stage: "starting" }));
    expect(message).toContain("close");
    expect(message).toContain("open again");
  });

  it("says what is being fetched, without a counter it does not have", () => {
    const message = installMessage(install({ stage: "pulling" }));
    expect(message).toBe("Fetching the new version");
    expect(message).not.toMatch(/MB/);
  });

  /* The container swap takes the page down with it, and a reader who was not
     warned reads that as the update having broken something. */
  it("warns that the page itself is about to go away", () => {
    const message = installMessage(install({ stage: "recreating" }));
    expect(message).toContain("stop answering");
    expect(message).toContain("reload");
  });

  it("hands a failure straight to its explanation", () => {
    expect(installMessage(install({ stage: "failed", problem: "download-failed" }))).toBe(
      problemMessage("download-failed"),
    );
  });
});

describe("problemMessage", () => {
  /*
    The one the whole feature turns on. A user whose download did not verify has
    to be told two things and neither is the word "checksum": that nothing ran,
    and that there is still a way to get the update.
  */
  it("says nothing was run when the download did not match", () => {
    const message = problemMessage("digest-mismatch");
    expect(message).toContain("Nothing was run");
    expect(message).toContain("release");
  });

  /*
    The ending for every container install that ships, so it is the sentence
    most people will read. It has to answer the question the missing button
    raises rather than state a fact about configuration.
  */
  it("says why there is no button, and that the commands do the same job", () => {
    const message = problemMessage("self-update-off");
    expect(message).toContain("no button");
    expect(message).toContain("whole machine");
    expect(message).toContain("same job");
  });

  it("says nothing was changed when the swap did not finish", () => {
    const message = problemMessage("recreate-failed");
    expect(message).toContain("Nothing was changed");
    expect(message).toContain("old version is still running");
    expect(message).toContain("docker logs relic-finder-updater");
  });

  it("uses no word a Warframe player would have to look up", () => {
    const jargon = /checksum|digest|hash|sha-?256|CDN|payload/i;
    const problems: UpdateInstall["problem"][] = [
      "digest-mismatch",
      "download-failed",
      "no-setup",
      "no-update",
      "not-windows",
      "not-docker",
      "not-supported",
      "self-update-off",
      "recreate-failed",
      "launch-failed",
      null,
    ];

    for (const problem of problems) {
      expect(problemMessage(problem)).not.toMatch(jargon);
    }
  });

  /*
    The one exception, and it is deliberate: "this release does not publish a
    checksum" is the whole reason the button is refusing, and there is no way to
    say it without naming the thing that is missing. The sentence explains it in
    the same breath.
  */
  it("explains the word it cannot avoid", () => {
    expect(problemMessage("no-digest")).toContain("prove");
  });

  it("always leaves the reader somewhere to go", () => {
    for (const problem of [
      "digest-mismatch",
      "download-failed",
      "no-digest",
      "no-setup",
    ] as const) {
      expect(problemMessage(problem)).toMatch(/release|try again/i);
    }
  });
});

describe("the way out of self-update-off", () => {
  /*
    The reason this exists. The problem sentence explains why the button is off
    and stops; on its own that reads as "cannot be done", which is the
    conclusion an operator reached on a real install. This is the half that
    makes it a choice, so it has to say the button is real and name the file
    that produces it.
  */
  it("says the button exists and names the file that turns it on", () => {
    expect(SELF_UPDATE_OPT_IN).toContain("does exist");
    expect(SELF_UPDATE_OPT_IN).toContain(SELF_UPDATE_FILE);
  });

  /*
    The offer must not travel without the price. The problem sentence carries
    what the socket costs, and this one is only ever shown under it — so what
    is checked here is that it sends the reader to the file that explains the
    trade rather than presenting the switch as free.
  */
  it("sends the reader to the file before they run it", () => {
    expect(SELF_UPDATE_OPT_IN).toMatch(/read that file before you do/i);
    expect(SELF_UPDATE_OPT_IN).toContain("agreeing to");
  });

  it("uses no word a Warframe player would have to look up", () => {
    expect(SELF_UPDATE_OPT_IN).not.toMatch(
      /checksum|digest|hash|sha-?256|CDN|payload|socket|daemon|mount/i,
    );
  });
});

describe("installUnderWay", () => {
  it("is false before anything has been asked for", () => {
    expect(installUnderWay(undefined)).toBe(false);
    expect(installUnderWay(install())).toBe(false);
  });

  it("is true through every working stage, on either platform", () => {
    for (const stage of [
      "downloading",
      "verifying",
      "starting",
      "pulling",
      "recreating",
    ] as const) {
      expect(installUnderWay(install({ stage }))).toBe(true);
    }
  });

  /* A failure stops the poll: there is nothing further to watch, and a poll
     that kept running would ask a stopped install how it was doing forever. */
  it("is false once it has failed", () => {
    expect(installUnderWay(install({ stage: "failed", problem: "download-failed" }))).toBe(false);
  });
});
