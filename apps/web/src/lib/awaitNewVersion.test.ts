import { describe, expect, it } from "vitest";

import { awaitNewVersion } from "./awaitNewVersion";

/**
 * The clock is handed in, so none of this waits for anything: `wait` records
 * that a pause was asked for and returns at once. What the tests are about is
 * the sequence of answers, not the seconds between them.
 */
function clock() {
  const pauses: number[] = [];
  return {
    pauses,
    wait: (ms: number) => {
      pauses.push(ms);
      return Promise.resolve();
    },
  };
}

/** A server that gives these answers in order; `null` is one that is not there. */
function answers(...replies: (string | null)[]) {
  let asked = 0;
  return {
    asked: () => asked,
    read: () => {
      // Past the end is the last answer repeated, and an empty script is a
      // server that is not there — which is what `null` means here anyway.
      const reply = replies[Math.min(asked, replies.length - 1)] ?? null;
      asked += 1;
      return reply === null
        ? Promise.reject(new Error("connection refused"))
        : Promise.resolve(reply);
    },
  };
}

describe("awaitNewVersion", () => {
  it("waits out the seconds when nothing is listening, then sees the new build", async () => {
    const server = answers(null, null, null, "0.4.8");
    const { wait, pauses } = clock();

    await expect(
      awaitNewVersion({ was: "0.4.7", read: server.read, wait, everyMs: 1000 }),
    ).resolves.toBe(true);

    expect(server.asked()).toBe(4);
    expect(pauses).toEqual([1000, 1000, 1000, 1000]);
  });

  /* The half that keeps a failed update from looking like a successful one. The
     setup can stop after closing the application, and Windows then starts the
     version that was already there — so a page that reloaded the moment
     anything answered would show the old build with nothing saying why. */
  it("goes on waiting while the old version is the one answering", async () => {
    const server = answers("0.4.7", "0.4.7", "0.4.8");
    const { wait } = clock();

    await expect(
      awaitNewVersion({ was: "0.4.7", read: server.read, wait, everyMs: 1000 }),
    ).resolves.toBe(true);

    expect(server.asked()).toBe(3);
  });

  it("gives up rather than asking forever", async () => {
    const server = answers(null);
    const { wait, pauses } = clock();

    await expect(
      awaitNewVersion({
        was: "0.4.7",
        read: server.read,
        wait,
        everyMs: 1000,
        giveUpAfterMs: 5000,
      }),
    ).resolves.toBe(false);

    expect(pauses).toHaveLength(5);
  });

  /* An empty answer is not a version. Treating it as one would reload the page
     onto whatever a half-started server happened to say. */
  it("does not take an empty answer for a new version", async () => {
    const server = answers("", "", "0.4.8");
    const { wait } = clock();

    await expect(
      awaitNewVersion({ was: "0.4.7", read: server.read, wait, everyMs: 1000 }),
    ).resolves.toBe(true);

    expect(server.asked()).toBe(3);
  });

  /* It waits before the first ask rather than after it: at the moment this
     starts, the server is still the old one and still answering, and asking
     straight away would read the version being replaced. */
  it("pauses before asking anything", async () => {
    const server = answers("0.4.8");
    const { wait, pauses } = clock();

    await awaitNewVersion({ was: "0.4.7", read: server.read, wait, everyMs: 1000 });

    expect(pauses[0]).toBe(1000);
    expect(server.asked()).toBe(1);
  });
});
