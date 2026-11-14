package relics.reliceApi.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.Expection.FissureUnavailableException;
import relics.reliceApi.service.FissureService;

import java.util.Map;

/**
 * The Void Fissures open right now.
 *
 * <p>503 with a message when the worldstate cannot be read, never 200 with an
 * empty list: the screen has to be able to say "fissure data unavailable"
 * rather than "no fissures open".
 */
@RestController
@RequestMapping("/api/fissures")
public class FissureController {

    private final FissureService fissureService;

    public FissureController(FissureService fissureService) {
        this.fissureService = fissureService;
    }

    @GetMapping
    public ResponseEntity<?> current() {
        try {
            return ResponseEntity.ok(fissureService.current());
        } catch (FissureUnavailableException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
