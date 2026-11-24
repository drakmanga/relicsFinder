package relics.reliceApi.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.Expection.ClanInitiativeUnavailableException;
import relics.reliceApi.service.ClanInitiativeService;

import java.util.Map;

/**
 * What the Clan Weekly Initiative pays this week and the next.
 *
 * <p>503 with a message when the worldstate cannot be read, never 200 with an
 * empty list, for the reason the fissures give.
 */
@RestController
@RequestMapping("/api/kuva/clan-initiative")
public class ClanInitiativeController {

    private final ClanInitiativeService service;

    public ClanInitiativeController(ClanInitiativeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<?> weeks() {
        try {
            return ResponseEntity.ok(service.weeks());
        } catch (ClanInitiativeUnavailableException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", e.getMessage()));
        }
    }
}
