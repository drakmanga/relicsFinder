package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.model.PrimeLifecycle;
import relics.reliceApi.service.PrimeLifecycleService;

import java.io.IOException;
import java.util.List;

/**
 * Where every Prime set sits in the cycle its price follows.
 *
 * <p>Its own endpoint rather than four more fields on every part price. The
 * phase is a property of a set, roughly 160 rows against the 600-odd parts the
 * price batch carries, and it moves only when a set is released or leaves the
 * drop tables — so riding the price batch would repeat one set's answer across
 * its six parts and re-send it every time a price is refreshed.
 */
@RestController
@RequestMapping("/api/sets")
public class PrimeLifecycleController {

    private final PrimeLifecycleService lifecycleService;

    public PrimeLifecycleController(PrimeLifecycleService lifecycleService) {
        this.lifecycleService = lifecycleService;
    }

    @GetMapping("/lifecycle")
    public ResponseEntity<List<PrimeLifecycle>> lifecycle() throws IOException {
        return ResponseEntity.ok(lifecycleService.lifecycles());
    }
}
