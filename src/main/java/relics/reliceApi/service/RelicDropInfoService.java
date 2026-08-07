package relics.reliceApi.service;

import org.springframework.stereotype.Service;
import relics.reliceApi.model.DropInfoRelic;

import java.util.List;

/**
 * Drop sites of a relic.
 *
 * <p>Previously this scraped warframe.fandom.com and returned an empty list for
 * every relic. Two reasons it could not work: Fandom answers a Cloudflare
 * challenge to server-side clients, and the per-relic page holds only the
 * wikitext {@code {{RelicPage}}} — the table is rendered from a template, so the
 * HTML never carried the data. The column indexing was also out of bounds
 * ({@code cols.size() >= 3} guarding a read of {@code cols.get(4)}), which the
 * broad catch turned into the same silent empty list.
 *
 * <p>The work now lives in {@link DropTableService}, reading the official drop
 * tables.
 */
@Service
public class RelicDropInfoService {

    private final DropTableService dropTableService;

    public RelicDropInfoService(DropTableService dropTableService) {
        this.dropTableService = dropTableService;
    }

    /**
     * Accepts "Lith V9" and "lith_v9" alike. A vaulted relic drops nowhere, so
     * an empty list is the correct answer rather than an error.
     */
    public List<DropInfoRelic> getRelicDropInfo(String relicName) {
        return dropTableService.getRelicDropInfo(relicName);
    }
}
