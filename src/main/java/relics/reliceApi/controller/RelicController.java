package relics.reliceApi.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import relics.reliceApi.service.RelicService;
import relics.reliceApi.service.RelicUpdateService;
import relics.reliceApi.service.VaultedRelicService;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/relics")
public class RelicController {

    private final RelicUpdateService relicUpdateService;
    private final VaultedRelicService vaultedRelicService;
    private final RelicService relicService;

    public RelicController(RelicUpdateService reliceService, VaultedRelicService vaultedRelicService, RelicService relicService) {
        this.relicUpdateService = reliceService;
        this.vaultedRelicService = vaultedRelicService;
        this.relicService = relicService;
    }

    @PostMapping("/update")
    public String updateRelics() {
        try {
            // Scarica e aggiorna i relics
            // Questo metodo scarica il file JSON da un URL e lo salva in un file locale
            relicUpdateService.downloadAndUpdateRelics();
            return ("Relics updated successfully.");
        } catch (Exception e) {
            return ("Error updating relics: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<JsonNode> getAllRelics() {
        try {
            // Carica i relics dal file
            return ResponseEntity.ok(relicUpdateService.loadRelicsWithCheckData());
        } catch (Exception e) {
            throw new RuntimeException("Error loading relics: " + e.getMessage());
        }
    }

    @GetMapping("/{tier}")
    public ResponseEntity<List<JsonNode>> getOnlyTierRelics(@PathVariable String tier) throws IOException {
            List<JsonNode> filteredRelics = relicService.loadOnlyTierRelics(tier);
            if (filteredRelics.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(filteredRelics);
    }

    @GetMapping("/tiers")
    public ResponseEntity<Map<String, Map<String, List<String>>>> getAllTiers() throws IOException {

        Map<String, Map<String, List<String>>> response = relicService.loadAllTiers();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{tier}/{relicName}")
    public ResponseEntity<List<JsonNode>> getRelicAllStates(
            @PathVariable String tier,
            @PathVariable String relicName) throws IOException {

        List<JsonNode> matchedRelics = relicService.getAllRelicStates(tier, relicName);
        if (matchedRelics.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(matchedRelics);
    }

    @GetMapping("/isVaulted/{tier}/{relicName}")
    public ResponseEntity<Boolean> isRelicVaulted(
            @PathVariable String tier,
            @PathVariable String relicName) throws IOException {
        boolean isVaulted = vaultedRelicService.isVaulted(tier, relicName);
        return ResponseEntity.ok(isVaulted);
    }

    @GetMapping("/unvaulted")
    public ResponseEntity<List<String>> getUnvaultedRelics() throws IOException {
        return ResponseEntity.ok(vaultedRelicService.extractUnvaultedRelics());
    }
}

