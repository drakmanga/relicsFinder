package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import relics.reliceApi.model.ItemPrice;
import relics.reliceApi.model.PricePoint;
import relics.reliceApi.model.RelicPrice;
import relics.reliceApi.service.RelicMarketService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/market")
public class RelicMarketController {

    /**
     * The whole catalogue is about 770 relics and the client asks for all of
     * them at once — the server answers from cache, so this is map lookups, not
     * network calls. The cap only guards against a nonsense request.
     *
     * <p>Raised from 1.000, which the relics table was within 230 rows of: the
     * failure it would have produced is a 400 and a table with no prices in it
     * at all, several Prime releases from now and with nothing to point at.
     */
    private static final int MAX_BATCH = 5000;

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

    /**
     * Ninety days of completed trades, for the price chart.
     *
     * <p>warframe.market keeps this itself, so nothing needs storing on our
     * side — the series arrives in the same response the price comes from.
     */
    @GetMapping("/item/{itemName}/history")
    public ResponseEntity<List<PricePoint>> getItemHistory(@PathVariable String itemName) {
        if (itemName == null || itemName.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(relicMarketService.getHistory(itemName));
    }

    /**
     * How much of the catalogue is priced.
     *
     * <p>The cache fills in the background over a few minutes; the UI reads this
     * to say so instead of showing a table full of dashes with no explanation.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(relicMarketService.cacheStatus());
    }

    /**
     * Prices for many relics in one call, e.g. every row of the relics table.
     *
     * <p>Separate from {@code /items} because a relic and a part of the same
     * name are two different listings on the market, and the slug that reaches
     * it differs — a relic's ends in {@code _relic}.
     *
     * <p>A relic with no listing comes back with a null price rather than being
     * dropped, so the response lines up with the request.
     */
    @PostMapping("/relics")
    public ResponseEntity<List<RelicPrice>> getRelicPrices(@RequestBody List<String> relicNames) {
        if (relicNames == null || relicNames.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        if (relicNames.size() > MAX_BATCH) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(relicMarketService.getRelicPrices(relicNames));
    }

    /**
     * Price, median, trades and trend for a whole relic, e.g. "Lith V9".
     *
     * <p>Under {@code /relic/} rather than at the root so it does not collide
     * with the single-segment mapping below, which predates it and answers a
     * bare average.
     */
    @GetMapping("/relic/{relicName}")
    public ResponseEntity<ItemPrice> getRelicDetail(@PathVariable String relicName) {
        if (relicName == null || relicName.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(relicMarketService.getRelicPrice(relicName));
    }

    /**
     * Says which rows are on screen, so those get priced first.
     *
     * <p>Not a request for data: the tables go on asking for the whole catalogue
     * in one batch, because sorting by price is only correct when every row has
     * a price. This carries the one thing the server cannot work out for itself
     * — which thirty of those rows someone is actually looking at.
     *
     * <p>Answers 204 whatever happens. A hint that arrives late, twice or not at
     * all changes an order of work, never an answer, so there is nothing here
     * for the client to handle.
     */
    @PostMapping("/priority")
    public ResponseEntity<Void> prioritise(@RequestBody(required = false) PriorityRequest request) {
        if (request != null) {
            relicMarketService.prioritise(
                    request.items() == null ? List.of() : request.items(),
                    request.relics() == null ? List.of() : request.relics());
        }
        return ResponseEntity.noContent().build();
    }

    /** Item names, relic names, or both — whichever table is on screen. */
    public record PriorityRequest(List<String> items, List<String> relics) {}

    /** Ninety days of completed trades for a whole relic, for the price chart. */
    @GetMapping("/relic/{relicName}/history")
    public ResponseEntity<List<PricePoint>> getRelicHistory(@PathVariable String relicName) {
        if (relicName == null || relicName.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(relicMarketService.getRelicHistory(relicName));
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
