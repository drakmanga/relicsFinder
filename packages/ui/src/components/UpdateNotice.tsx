import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { cx } from "../lib/cx";

interface Versions {
  /** The version there is. Shown in full: a reader should not have to decode it. */
  latestVersion: string;

  /** The version they are running. */
  currentVersion: string;

  /** What changed, as plain text. Nothing is rendered when there is none. */
  notes?: string | null;

  /**
   * The ending this dialog does not supply.
   *
   * What the button does is not the same on every platform — a Windows install
   * replaces an .exe, a container pulls an image, and a copy that can do
   * neither can still be shown where the release is. So the last thing in the
   * footer comes from whoever renders this, and the dialog holds the two
   * versions and the notes either way.
   */
  action?: ReactNode;

  /** They chose not to be asked about this version again. */
  onSkip: () => void;
}

export interface UpdateDialogProps extends Versions {
  open: boolean;
  onClose: () => void;
}

export interface UpdateNoticeProps extends Versions {
  className?: string;
}

/**
 * The two versions, what changed between them, and whatever ending the caller
 * brought.
 *
 * Separate from the notice below because the notice is not the only thing that
 * will ever open it: a tray icon has the same dialog to show, and a component
 * that owns its own open state cannot be opened by anything else.
 *
 * The words are the long ones on purpose. "Version 0.2.0 is out" costs a few
 * characters over "Update" and assumes nothing of a reader who has never
 * thought about software versions — which is the project's standing rule, and
 * the reason none of this is in a tooltip either.
 */
export function UpdateDialog({
  open,
  onClose,
  latestVersion,
  currentVersion,
  notes,
  action,
  onSkip,
}: UpdateDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Version ${latestVersion} is out`}
      description={`You have version ${currentVersion}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onClose();
              onSkip();
            }}
          >
            Skip this version
          </Button>
          {action}
        </>
      }
    >
      {notes && (
        <>
          <p className="rf-text-overline rf-fg-muted">What changed</p>
          <div className="rf-update-notes rf-text-body-sm">{notes}</div>
        </>
      )}
    </Dialog>
  );
}

/**
 * A newer version exists, said once in a bar and explained on a click.
 *
 * Nothing here knows what the application is, which is why it is in the
 * library: it takes two version strings, some text and an ending, and the thing
 * that knows where those came from stays in the app.
 *
 * Skipping unmounts the notice, so focus lands on the document and the next Tab
 * starts at the first control in the bar. That is deliberate rather than
 * unhandled: the element focus would otherwise return to is the one being
 * removed, and the top of the bar is where the notice was.
 */
export function UpdateNotice({ className, ...versions }: UpdateNoticeProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cx("rf-update-notice", "rf-focus-ring", "rf-hit-block", className)}
        onClick={() => setOpen(true)}
      >
        Version {versions.latestVersion} is out
      </button>

      <UpdateDialog open={open} onClose={() => setOpen(false)} {...versions} />
    </>
  );
}
