package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.model.DropInfoRelic;
import relics.reliceApi.service.RelicDropInfoService;
import relics.reliceApi.service.RelicVaultedService;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/relics")
public class RelicDropInfoController {

    private final RelicDropInfoService relicDropInfoService;
    private final RelicVaultedService vaultedRelicService;

    public RelicDropInfoController(RelicDropInfoService relicDropInfoService, RelicVaultedService vaultedRelicService) {
        this.relicDropInfoService = relicDropInfoService;
        this.vaultedRelicService = vaultedRelicService;
    }

    @GetMapping("/drop-info/{relicName}")
    public ResponseEntity<List<DropInfoRelic>> getRelicDropInfo(@PathVariable String relicName) throws IOException {
        if (relicName == null || relicName.isEmpty()) {
            return ResponseEntity.badRequest().body(null);
        }

        boolean relicVaulted = vaultedRelicService.isVaulted(relicName);
        List<DropInfoRelic> dropInfo = relicDropInfoService.getRelicDropInfo(relicName);

        return ResponseEntity.ok(dropInfo);
    }
}
