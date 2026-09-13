/**
 * Deletes the key an older build used to silence the update notice.
 *
 * TEMPORARY, added in 0.4.6, and meant to be deleted a release or two later:
 * once every browser that ran a build with `Skip this version` in it has loaded
 * one that does not, this clears nothing and the key name below is the only
 * place it survives. Deleting it early only costs the stragglers their badge,
 * so there is nothing to be careful about — remove it.
 *
 * Why it exists at all: up to 0.4.5 the dialog had a third button that wrote
 * the release it was clicked on into storage, and the notice then compared the
 * two and rendered nothing when they matched. That button is gone, but the
 * value it wrote is not, and without this every reader who ever clicked it
 * would keep a permanently silent badge with nothing on screen or in the
 * release notes to explain why. The reason the button went is on
 * `AppUpdateNotice`, where the notice now lives.
 */
const SKIPPED_VERSION_KEY = "relic-finder.update-skipped.v1";

export function forgetSkippedVersion() {
  try {
    localStorage.removeItem(SKIPPED_VERSION_KEY);
  } catch {
    // Private browsing with storage blocked: there was nothing stored to clear,
    // which is the same wrap the code this replaces carried for the same reason.
  }
}
