package relics.reliceApi.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.service.RelicUpdateService;

@RestController
@RequestMapping("/api/relics")
public class RelicUpdateController {

    private final RelicUpdateService relicUpdateService;
    public RelicUpdateController(RelicUpdateService relicUpdateService) {
        this.relicUpdateService = relicUpdateService;
    }

    @PostMapping("/update")
    public String updateRelics() {
        try {
            int relics = relicUpdateService.downloadAndUpdateRelics();
            return "Relics updated successfully: " + relics + " entries.";
        } catch (Exception e) {
            return ("Error updating relics: " + e.getMessage());
        }
    }
}
