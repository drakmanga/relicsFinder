package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import relics.reliceApi.Expection.InvalidOwnedRelicException;
import relics.reliceApi.model.OwnedRelic;
import relics.reliceApi.service.OwnedRelicService;

import java.util.List;
import java.util.Map;

/**
 * The relics the player is holding.
 *
 * <p>No user parameter anywhere: the service is self-hosted and single-tenant,
 * so the list belongs to whoever is running it.
 */
@RestController
@RequestMapping("/api/owned-relics")
public class OwnedRelicController {

    private final OwnedRelicService ownedRelicService;

    public OwnedRelicController(OwnedRelicService ownedRelicService) {
        this.ownedRelicService = ownedRelicService;
    }

    @GetMapping
    public ResponseEntity<List<OwnedRelic>> get() {
        return ResponseEntity.ok(ownedRelicService.all());
    }

    /** Replaces the whole list; a 400 naming the entry when any of it is unknown. */
    @PutMapping
    public ResponseEntity<?> replace(@RequestBody List<OwnedRelic> entries) {
        try {
            return ResponseEntity.ok(ownedRelicService.replace(entries));
        } catch (InvalidOwnedRelicException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
