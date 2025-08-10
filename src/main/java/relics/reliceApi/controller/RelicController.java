package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import relics.reliceApi.model.Relic;
import relics.reliceApi.service.RelicLoadService;
import relics.reliceApi.service.RelicService;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/relics")
public class RelicController {

    private final RelicService relicService;
    private final RelicLoadService relicLoadService;

    public RelicController(RelicService relicService, RelicLoadService relicLoadService) {
        this.relicService = relicService;
        this.relicLoadService = relicLoadService;
    }

    @GetMapping
    public ResponseEntity<List<Relic>> getAllRelics() {
        try {

            return ResponseEntity.ok(relicLoadService.loadRelicsWithCheckData());
        } catch (Exception e) {
            throw new RuntimeException("Error loading relics: " + e.getMessage());
        }
    }

    @GetMapping("/{tier}")
    public ResponseEntity<List<Relic>> getOnlyTierRelics(@PathVariable String tier) throws IOException {
            List<Relic> filteredRelics = relicService.getOnlyTierRelics(tier);
            if (filteredRelics.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(filteredRelics);
    }

    @GetMapping("/tiers")
    public ResponseEntity<Map<String, Map<String, List<Relic>>>> getAllTiers() throws IOException {

        Map<String, Map<String, List<Relic>>> response = relicService.getAllRelicTiers();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/relic/{relicName}")
    public ResponseEntity<List<Relic>> getRelicAllStates(@PathVariable String relicName) throws IOException {

        List<Relic> matchedRelics = relicService.getAllRelicStates(relicName);
        if (matchedRelics.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(matchedRelics);
    }

}

