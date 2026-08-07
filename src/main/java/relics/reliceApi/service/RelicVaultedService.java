package relics.reliceApi.service;

import org.springframework.stereotype.Service;
import relics.reliceApi.model.Relic;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Which relics are currently obtainable.
 *
 * <p>A relic is unvaulted exactly when it appears in the drop tables, so this
 * reads the same cached source as {@link RelicDropInfoService} rather than
 * scraping the wiki's "Unvaulted/Available Relics" table.
 *
 * <p>The scraping version answered HTTP 500 on every call, for two independent
 * reasons. It connected to Fandom without a user agent and Cloudflare replied
 * 403, which surfaced as an IOException. And had it got through, the comparison
 * could not have matched: it joined tier and name without a separator
 * ({@code "LithV9"}) against a space-separated input, and read the tier from
 * objects that {@code extractUnvaultedRelics} had deliberately stripped of it,
 * so every tier was literally the string "null".
 */
@Service
public class RelicVaultedService {

    /** Display order of the eras, rather than alphabetical. */
    private static final List<String> TIER_ORDER =
            List.of("Lith", "Meso", "Neo", "Axi", "Requiem");

    private final DropTableService dropTableService;

    public RelicVaultedService(DropTableService dropTableService) {
        this.dropTableService = dropTableService;
    }

    /**
     * Currently obtainable relics, grouped by era and sorted within it.
     *
     * <p>The relics carry only their short name — the era is the map key, so
     * repeating it in every entry would be noise.
     */
    public Map<String, List<Relic>> extractUnvaultedRelics() {
        Map<String, List<Relic>> grouped = new LinkedHashMap<>();

        for (String fullName : dropTableService.unvaultedRelicNames()) {
            String[] parts = fullName.split(" ", 2);
            if (parts.length != 2) continue;

            String tier = capitalize(parts[0]);
            String shortName = parts[1].toUpperCase(Locale.ROOT);

            grouped.computeIfAbsent(tier, t -> new ArrayList<>()).add(new Relic(shortName));
        }

        grouped.values().forEach(list ->
                list.sort(Comparator.comparing(Relic::getRelicName, String.CASE_INSENSITIVE_ORDER)));

        return grouped.entrySet().stream()
                .sorted(Comparator.comparingInt(e -> {
                    int i = TIER_ORDER.indexOf(e.getKey());
                    return i < 0 ? Integer.MAX_VALUE : i;
                }))
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new));
    }

    /** Accepts "Lith V9" and "lith_v9" alike. */
    public boolean isVaulted(String relicName) {
        return dropTableService.isVaulted(relicName);
    }

    private static String capitalize(String value) {
        if (value.isEmpty()) return value;
        return Character.toUpperCase(value.charAt(0)) + value.substring(1).toLowerCase(Locale.ROOT);
    }
}
