package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.model.EndoOffer;
import relics.reliceApi.service.EndoService;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/endo")
public class EndoController {

    private final EndoService endoService;

    public EndoController(EndoService endoService) {
        this.endoService = endoService;
    }

    /** Ayatan sell orders from sellers who are online, best Endo per platinum first. */
    @GetMapping("/offers")
    public ResponseEntity<List<EndoOffer>> offers() {
        return ResponseEntity.ok(endoService.offers());
    }

    /**
     * When the offers were last read, as an ISO instant, or null before the
     * first read.
     *
     * <p>Its own endpoint rather than a field on {@code /offers} for the same
     * reason {@code /api/market/status} is separate from the prices: the list
     * is parsed as a bare array by everything that asks for it, and a wrapper
     * object would rewrite five call sites to carry one timestamp.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        Map<String, Object> status = new HashMap<>();
        status.put("asOf", endoService.fetchedAt().map(Instant::toString).orElse(null));
        return ResponseEntity.ok(status);
    }
}
