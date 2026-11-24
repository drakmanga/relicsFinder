package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import relics.reliceApi.Expection.InvalidKuvaPurchasesException;
import relics.reliceApi.model.KuvaPurchases;
import relics.reliceApi.service.KuvaPurchaseService;

import java.util.Map;

/**
 * This week's ticks on the Kuva tab.
 *
 * <p>No user parameter, as for the owned relics: the service is self-hosted
 * and single-tenant, so the list belongs to whoever is running it.
 */
@RestController
@RequestMapping("/api/kuva/purchases")
public class KuvaPurchaseController {

    private final KuvaPurchaseService service;

    public KuvaPurchaseController(KuvaPurchaseService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<KuvaPurchases> get() {
        return ResponseEntity.ok(service.get());
    }

    /** Replaces the stored week; a 400 naming the value when any of it is out of shape. */
    @PutMapping
    public ResponseEntity<?> replace(@RequestBody KuvaPurchases next) {
        try {
            return ResponseEntity.ok(service.replace(next));
        } catch (InvalidKuvaPurchasesException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
