package relics.reliceApi.service;

import relics.reliceApi.model.UpdateInstall;

/**
 * One way of replacing this copy of Relic Finder with a newer one.
 *
 * <p>There is one of these per {@link InstallPlatform} that can do it, and they
 * have nothing in common underneath: Windows downloads a setup, proves it and
 * runs it; Docker asks the daemon to fetch two images and rebuild the
 * containers. What they share is the shape of the answer and the endpoint that
 * gives it, which is the whole reason for the interface — a screen showing an
 * update in progress should not have to know which of them is doing the work.
 *
 * <p>The controller picks by platform, so nothing here ever runs on an install
 * it does not belong to. Each implementation still checks the platform itself,
 * which is redundant through that route and is not redundant if one is ever
 * called directly.
 */
public interface UpdateInstaller {

    /** The kind of install this one replaces. */
    InstallPlatform platform();

    /**
     * Begins the update, or reports why it will not.
     *
     * <p>Returns at once with the first stage; the work outlives the request and
     * is watched through {@link #state()}. Calling it twice while one is running
     * is calling it once.
     */
    UpdateInstall start();

    /** How far it has got. Never throws and never blocks. */
    UpdateInstall state();
}
