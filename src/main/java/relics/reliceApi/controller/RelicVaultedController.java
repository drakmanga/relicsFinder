package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.model.Relic;
import relics.reliceApi.service.RelicVaultedService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/relics")
public class RelicVaultedController {
    private final RelicVaultedService vaultedRelicService;

    public RelicVaultedController(RelicVaultedService vaultedRelicService) {
        this.vaultedRelicService = vaultedRelicService;
    }

    @GetMapping("/isVaulted/{relicName}")
    public ResponseEntity<Boolean> isRelicVaulted(
            @PathVariable String relicName) throws IOException {
        boolean isVaulted = vaultedRelicService.isVaulted(relicName);
        return ResponseEntity.ok(isVaulted);
    }

    @GetMapping("/unvaulted")
    public ResponseEntity <Map<String,List<Relic>>> getUnvaultedRelics() throws IOException {
        return ResponseEntity.ok(vaultedRelicService.extractUnvaultedRelics());
    }
}
