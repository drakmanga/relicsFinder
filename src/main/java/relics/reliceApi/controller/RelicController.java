package relics.reliceApi.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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
    public ResponseEntity<JsonNode> getAllRelics() {
        try {

            return ResponseEntity.ok(relicLoadService.loadRelicsWithCheckData());
        } catch (Exception e) {
            throw new RuntimeException("Error loading relics: " + e.getMessage());
        }
    }

    @GetMapping("/{tier}")
    public ResponseEntity<List<JsonNode>> getOnlyTierRelics(@PathVariable String tier) throws IOException {
            List<JsonNode> filteredRelics = relicService.getOnlyTierRelics(tier);
            if (filteredRelics.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(filteredRelics);
    }

    @GetMapping("/tiers")
    public ResponseEntity<Map<String, Map<String, List<String>>>> getAllTiers() throws IOException {

        Map<String, Map<String, List<String>>> response = relicService.getAllRelicTiers();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/relic/{relicName}")
    public ResponseEntity<List<JsonNode>> getRelicAllStates(@PathVariable String relicName) throws IOException {

        List<JsonNode> matchedRelics = relicService.getAllRelicStates(relicName);
        if (matchedRelics.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(matchedRelics);
    }

}

