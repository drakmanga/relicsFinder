package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import relics.reliceApi.model.ItemPrice;
import relics.reliceApi.model.RelicPrice;
import relics.reliceApi.service.RelicMarketService;

import java.util.List;

@RestController
@RequestMapping("/api/market")
public class RelicMarketController {

    /** A single screenful of results is far below this; the cap is a guard, not a page size. */
    private static final int MAX_BATCH = 100;

    private final RelicMarketService relicMarketService;

    public RelicMarketController(RelicMarketService relicMarketService) {
        this.relicMarketService = relicMarketService;
    }

    /** Average price of a single Prime part. */
    @GetMapping("/item/{itemName}")
    public ResponseEntity<ItemPrice> getItemPrice(@PathVariable String itemName) {
        if (itemName == null || itemName.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(relicMarketService.getItemPrice(itemName));
    }

    /**
     * Prices for many items in one call.
     *
     * <p>The reason this exists: a results table needs twenty to forty prices at
     * once, and warframe.market allows about three requests a second. Firing
     * them as individual GETs gets the caller throttled; here they queue behind
     * one server-side rate limiter and share the cache.
     *
     * <p>An item with no listings comes back with a null price rather than being
     * dropped, so the response lines up with the request.
     */
    @PostMapping("/items")
    public ResponseEntity<List<ItemPrice>> getItemPrices(@RequestBody List<String> itemNames) {
        if (itemNames == null || itemNames.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        if (itemNames.size() > MAX_BATCH) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(relicMarketService.getItemPrices(itemNames));
    }

    /** Average price of a whole relic, e.g. "Lith V9". */
    @GetMapping("/{relicName}")
    public ResponseEntity<RelicPrice> getAvaragePrice(@PathVariable String relicName) {
        double avgPrice = relicMarketService.getAveragePrice(relicName);
        if (avgPrice < 0) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new RelicPrice(relicName, avgPrice));
    }
}
