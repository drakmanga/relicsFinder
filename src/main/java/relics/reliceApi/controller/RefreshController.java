package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.model.RefreshOutcome;
import relics.reliceApi.model.RefreshView;
import relics.reliceApi.service.SnapshotRefresher;

import java.util.Map;

/**
 * "Go and read it again", for the three views whose whole subject is a number.
 *
 * <p>Thin, like the controllers around it: a view name to parse, one call, and
 * the outcome as it came back. Which source a view rests on, how long the
 * cooldown is and what happens when the source is down are all
 * {@link SnapshotRefresher}'s business.
 *
 * <p>POST rather than GET because it has an effect on the server, and because
 * that is what keeps it out of every cache between here and the browser — the
 * one request in this application that must never be answered from one.
 */
@RestController
@RequestMapping("/api/refresh")
public class RefreshController {

    private final SnapshotRefresher refresher;

    public RefreshController(SnapshotRefresher refresher) {
        this.refresher = refresher;
    }

    /**
     * @param view {@code ducats}, {@code endo} or {@code tiers}
     * @return what came of it, including when this view may be asked again. A
     *         source that did not answer comes back 200 carrying
     *         {@code source-unavailable}: the request did exactly what was
     *         asked of it, and the state of somebody else's host is the answer
     *         rather than a failure of this one — see {@link RefreshOutcome}
     */
    @PostMapping("/{view}")
    public ResponseEntity<?> refresh(@PathVariable String view) {
        RefreshView which;
        try {
            which = RefreshView.parse(view);
        } catch (IllegalArgumentException e) {
            // A 200 refreshing something else would hide the typo behind an
            // answer that looks like it worked.
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }

        return ResponseEntity.ok(refresher.refresh(which));
    }
}
