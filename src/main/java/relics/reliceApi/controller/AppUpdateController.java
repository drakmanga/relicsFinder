package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.model.UpdateInstall;
import relics.reliceApi.model.UpdateStatus;
import relics.reliceApi.service.InstallPlatform;
import relics.reliceApi.service.UpdateCheckService;
import relics.reliceApi.service.UpdateInstaller;

import java.util.List;
import java.util.Optional;

/**
 * Whether the application itself is out of date.
 *
 * <p>Under {@code /api/app} rather than {@code /api/relics}, and named for the
 * application rather than for relics, because {@link RelicUpdateController}
 * already owns {@code /api/relics/update} — which downloads new relic DATA into
 * a running build. The two words mean different things and the paths say so.
 */
@RestController
@RequestMapping("/api/app")
public class AppUpdateController {

    private final UpdateCheckService updateCheckService;

    /**
     * One per platform that can replace itself, and the detected platform picks.
     *
     * <p>Injected as a list rather than one by one so that adding a third — a
     * package manager, a Flatpak — is a class and not an edit here. Nothing in
     * this file knows what any of them do.
     */
    private final List<UpdateInstaller> installers;

    public AppUpdateController(
            UpdateCheckService updateCheckService,
            List<UpdateInstaller> installers) {
        this.updateCheckService = updateCheckService;
        this.installers = installers;
    }

    /**
     * The updater for how this copy was installed, if there is one.
     *
     * <p>Asked per request rather than resolved once: the answer is two property
     * reads and a file check, and resolving it at startup would mean a container
     * that gained its socket on a restart went on reporting that it had none.
     */
    private Optional<UpdateInstaller> installer() {
        InstallPlatform platform = InstallPlatform.detect();
        return installers.stream()
                .filter(installer -> installer.platform() == platform)
                .findFirst();
    }

    /**
     * Always 200, including with no network at all. Offline is an answer this
     * endpoint can give — {@code known: false} — and not a server error: a 500
     * would put a page into an error state over a machine being on a train.
     */
    @GetMapping("/update")
    public ResponseEntity<UpdateStatus> update() {
        return ResponseEntity.ok(updateCheckService.status());
    }

    /**
     * Asks the application to update itself, and answers with the first stage.
     *
     * <p>Returns before the download starts — the work outlives the request by
     * a minute or so — so the caller polls {@link #installProgress()} from
     * here. Calling this twice is calling it once: an install already running
     * answers with itself.
     */
    @PostMapping("/update/install")
    public ResponseEntity<UpdateInstall> install() {
        return ResponseEntity.ok(installer()
                .map(UpdateInstaller::start)
                .orElseGet(AppUpdateController::unsupported));
    }

    /**
     * How far the update has got.
     *
     * <p>200 for a refusal too, carrying the same record with {@code stage:
     * failed} and a problem code. A 409 would be defensible and would cost the
     * client a second shape to read, for a distinction it has nothing different
     * to do about: every refusal is a state the screen already renders.
     */
    @GetMapping("/update/install")
    public ResponseEntity<UpdateInstall> installProgress() {
        return ResponseEntity.ok(installer()
                .map(UpdateInstaller::state)
                .orElseGet(AppUpdateController::unsupported));
    }

    /**
     * A jar somebody started from a shell, which is the one install this cannot
     * replace and must not try to: they chose where it lives and how it runs.
     */
    private static UpdateInstall unsupported() {
        return UpdateInstall.failed(UpdateInstall.Problem.NOT_SUPPORTED);
    }
}
