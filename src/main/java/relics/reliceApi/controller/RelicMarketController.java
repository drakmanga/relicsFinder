package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.model.RelicPrice;
import relics.reliceApi.service.RelicMarketService;

@RestController
@RequestMapping("/api/market")
public class RelicMarketController {
    private final RelicMarketService relicMarketService;

    public RelicMarketController(RelicMarketService relicMarketService) {
        this.relicMarketService = relicMarketService;
    }

    @GetMapping("/{relicName}")
    public ResponseEntity<RelicPrice> getAvaragePrice(@PathVariable String relicName) {
        double avgPrice = relicMarketService.getAveragePrice(relicName);
        if (avgPrice < 0) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new RelicPrice(relicName, avgPrice));
    }
}
