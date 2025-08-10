package relics.reliceApi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import relics.reliceApi.model.Relic;
import relics.reliceApi.service.RelicSearchItemService;

import java.util.List;

@RestController
@RequestMapping("/api/search")
public class RelicSearchItemController {
    private final RelicSearchItemService relicSearchItemService;

    public RelicSearchItemController(RelicSearchItemService relicSearchItemService) {
        this.relicSearchItemService = relicSearchItemService;
    }

    @GetMapping("{name}")
    public ResponseEntity<List<Relic>> searchRelics(@PathVariable String name) {
        try {
            List<Relic> relics = relicSearchItemService.findRelicsByItemName(name);
            if (relics.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(relics);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(null);
        }
    }

}
