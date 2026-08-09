package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import relics.reliceApi.service.OwnedService;

import java.util.List;

/**
 * The parts the player already has.
 *
 * <p>No user parameter anywhere: the service is self-hosted and single-tenant,
 * so the list belongs to whoever is running it.
 */
@RestController
@RequestMapping("/api/owned")
public class OwnedController {

    private final OwnedService ownedService;

    public OwnedController(OwnedService ownedService) {
        this.ownedService = ownedService;
    }

    @GetMapping
    public ResponseEntity<List<String>> get() {
        return ResponseEntity.ok(ownedService.all());
    }

    /** Replaces the whole list — see OwnedService for why it is not incremental. */
    @PutMapping
    public ResponseEntity<List<String>> replace(@RequestBody List<String> itemNames) {
        return ResponseEntity.ok(ownedService.replace(itemNames));
    }
}
