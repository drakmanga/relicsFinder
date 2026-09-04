import type { UpdateInstall } from "../api/types";

/**
 * What the update dialog says on screen.
 *
 * Every sentence here is written for somebody who has never thought about
 * checksums, installers or CDNs, because that is who is looking at it: the
 * dialog is in a Warframe companion, not in a package manager. "The download
 * did not match what the release published" over "digest mismatch", and never
 * a word that only makes sense if you already knew what went wrong.
 *
 * Pure, and separate from the component, so the wording is testable without a
 * browser and a browser is not where a wrong sentence gets found.
 */

/**
 * Why a container install has no button, and what it has instead.
 *
 * <p>Not a refusal and not a fault: a container is replaced from outside by
 * whoever runs the daemon, and the code that once did it from the inside is
 * gone. It needed the Docker control socket, which is the run of the whole
 * machine rather than of Relic Finder alone, and no button is worth handing
 * that over on every install that wanted one.
 *
 * Here rather than in the component so the test that forbids a word a Warframe
 * player would have to look up reaches it.
 */
export const DOCKER_UPDATE =
  "Relic Finder does not replace its own containers. Doing that would mean giving it " +
  "control of Docker, and that is control of this whole machine rather than of Relic " +
  "Finder alone. These four commands do it in a few seconds:";

/**
 * The one line under the commands, and it exists for the two ways they can fail
 * somebody: a folder that is not theirs, and a `git pull` in a directory that
 * was never a clone. Whoever was handed a compose file and nothing else gets an
 * error from the second line otherwise, in the dialog that was supposed to
 * remove their doubt.
 */
export const DOCKER_UPDATE_CAVEAT =
  "Use the folder your own docker-compose.yaml is in, and skip the git pull if you " +
  "never cloned the repository.";

/** A megabyte, as a person means it — the number on the release page. */
const BYTES_PER_MB = 1_000_000;

/**
 * Bytes as megabytes, which is the only unit this ever shows.
 *
 * The setup is sixty-odd megabytes and always will be — it carries a Java
 * runtime — so a scale that switches between KB, MB and GB would exist to
 * handle sizes that cannot occur, and would make the number jump units halfway
 * through a download.
 */
export function megabytes(bytes: number): string {
  return `${Math.round(Math.max(bytes, 0) / BYTES_PER_MB)} MB`;
}

/** "24 MB of 63 MB", or just the total when nothing has arrived yet. */
export function downloadedOf(install: UpdateInstall): string {
  return `${megabytes(install.downloaded)} of ${megabytes(install.total)}`;
}

/**
 * The one line under the bar, saying what is happening now.
 *
 * Null when there is nothing to say, which is the state before anybody clicked
 * anything: a dialog that has been opened and not acted on should hold no
 * status line at all.
 */
export function installMessage(install: UpdateInstall): string | null {
  switch (install.stage) {
    case "idle":
      return null;
    case "downloading":
      return `Downloading — ${downloadedOf(install)}`;
    case "verifying":
      return "Checking that the download is the real one";
    case "starting":
      return "Installing. Relic Finder will close and open again on its own.";
    case "failed":
      return problemMessage(install.problem);
  }
}

/**
 * Why it stopped, and what the reader can do instead.
 *
 * Each of these ends somewhere rather than describing a fault: the release page
 * is still there, and a person told only that something failed will go looking
 * for it anyway.
 */
export function problemMessage(problem: UpdateInstall["problem"]): string {
  switch (problem) {
    case "not-supported":
      return "This copy cannot replace itself. Update it the way you started it.";
    case "digest-mismatch":
      return "What downloaded is not the file the release published, so nothing was installed. Nothing was run and the download has been deleted. Try again, and if it happens twice, download the release yourself instead.";
    case "download-failed":
      return "The download did not finish. That is usually the connection. Try again, or open the release page and download it yourself.";
    case "no-digest":
      return "This release does not publish a checksum, so there is no way to prove a download is really it. Open the release page and download it yourself.";
    case "no-setup":
      return "This release has no installer attached to it. Open the release page to see what it does have.";
    case "no-update":
      return "There is nothing newer to install.";
    case "not-windows":
      return "This copy was not installed by the Windows installer, so it cannot update itself this way.";
    case "launch-failed":
      return "The installer downloaded and was checked, but Windows would not start it. Open the release page and run it yourself.";
    case null:
      // Unreachable: the backend sends a problem with every failure. Said
      // rather than thrown, because a dialog is not the place to crash.
      return "The update stopped, and did not say why.";
  }
}

/** Whether the update is under way, and so whether the poll should be running. */
export function installUnderWay(install: UpdateInstall | undefined): boolean {
  return (
    install?.stage === "downloading" ||
    install?.stage === "verifying" ||
    install?.stage === "starting"
  );
}
