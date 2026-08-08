package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.model.EndoOffer;
import relics.reliceApi.service.EndoService;

import java.util.List;

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
}
