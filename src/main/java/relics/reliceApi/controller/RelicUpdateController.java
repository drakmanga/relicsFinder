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
            // Scarica e aggiorna i relics
            // Questo metodo scarica il file JSON da un URL e lo salva in un file locale
            relicUpdateService.downloadAndUpdateRelics();
            return ("Relics updated successfully.");
        } catch (Exception e) {
            return ("Error updating relics: " + e.getMessage());
        }
    }
}
