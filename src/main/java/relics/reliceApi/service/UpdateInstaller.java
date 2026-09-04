package relics.reliceApi.service;

import relics.reliceApi.model.UpdateInstall;

/**
 * One way of replacing this copy of Relic Finder with a newer one.
 *
 * <p>There is one of these per {@link InstallPlatform} that can do it, which
 * today is Windows alone: it downloads a setup, proves it and runs it. A
 * container is not one of them and deliberately has none — replacing a
 * container is done by whoever runs the daemon, and the code that once did it
 * from the inside needed the Docker socket to work, which is the run of the
 * whole machine.
 *
 * <p>The interface survives one implementation because what it fixes is the
 * shape of the answer and the endpoint that gives it: a screen showing an
 * update in progress does not have to know what is doing the work, and a second
 * platform is a class rather than an edit to the controller.
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
