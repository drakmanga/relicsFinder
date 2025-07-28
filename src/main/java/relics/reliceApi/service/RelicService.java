package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import relics.reliceApi.Expection.RelicNotFoundException;

import java.io.IOException;
import java.util.*;

@Service
public class RelicService {

    private final RelicUpdateService relicUpdateService;
    public RelicService(RelicUpdateService relicUpdateService) {
        this.relicUpdateService = relicUpdateService;
    }
    public List<JsonNode> loadOnlyTierRelics(String tier) throws IOException {
        JsonNode relicsArray = relicUpdateService.loadRelicsWithCheckData();
        if (relicsArray == null || !relicsArray.isArray()) {
            throw new RelicNotFoundException("Invalid relics data format or no relics found.");
        }

        // Filtra i relics in base al tier specificato
    List<JsonNode> filteredRelics = new ArrayList<>();
        relicsArray.forEach(relic -> {
        if (tier.equalsIgnoreCase(relic.get("tier").asText())) {
            filteredRelics.add(relic);
        }
    });
        return filteredRelics;
    }

    public Map<String, Map<String, List<String>>> loadAllTiers() throws IOException {
        JsonNode relicsArray = relicUpdateService.loadRelicsWithCheckData();
        Map<String, Set<String>> tierSetMap = new HashMap<>();
        // Estrae i tiers unici dai relics
        relicsArray.forEach(relic -> {
            String tier = relic.get("tier").asText();
            String name = relic.get("relicName").asText();
            tierSetMap.computeIfAbsent(tier, k -> new HashSet<>()).add(name);
        });

        Map<String, List<String>> tierMap = new HashMap<>();

        tierSetMap.forEach((key, value) -> {
            List<String> sortedList = new ArrayList<>(value);

            sortedList.sort(Comparator
                    .comparing((String s) -> s.replaceAll("\\d", "")) // lettere
                    .thenComparing(s -> {
                        String numberPart = s.replaceAll("\\D", "");
                        return numberPart.isEmpty() ? 0 : Integer.parseInt(numberPart);
                    }) // numeri
            );
            tierMap.put(key, sortedList);
        });

        Map<String, Map<String, List<String>>> response = new HashMap<>();
        response.put("tiers", tierMap);
        return response;
    }

    public List<JsonNode> getAllRelicStates(String tier, String relicName) throws IOException {
        JsonNode relicsArray = relicUpdateService.loadRelicsWithCheckData();
        if (relicsArray == null || !relicsArray.isArray()) {
            throw new RelicNotFoundException("Invalid relics data format or no relics found.");
        }
        List<JsonNode> matchedRelics = new ArrayList<>();
        // Estrae i tiers unici dai relics
        relicsArray.forEach(relic -> {
            String tierRelic = relic.get("tier").asText();
            String nameRelic = relic.get("relicName").asText();
            if (tierRelic.equalsIgnoreCase(tier) && nameRelic.equalsIgnoreCase(relicName)) {
                matchedRelics.add(relic);
            }
        });
        return matchedRelics;
    }
}
