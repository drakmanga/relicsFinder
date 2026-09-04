package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.model.UpdateStatus;
import relics.reliceApi.service.UpdateCheckService;

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

    public AppUpdateController(UpdateCheckService updateCheckService) {
        this.updateCheckService = updateCheckService;
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
}
