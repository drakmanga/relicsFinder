package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import relics.reliceApi.Expection.RelicNotFoundException;

import java.io.IOException;
import java.util.*;

@Service
public class RelicService {

    private final RelicLoadService relicLoadService;
    public RelicService(RelicLoadService relicLoadService) {
        this.relicLoadService = relicLoadService;
    }


    public List<JsonNode> getOnlyTierRelics(String tier) throws IOException {
        JsonNode relicsArray = relicLoadService.loadRelicsWithCheckData();
        if (relicsArray == null || !relicsArray.isArray()) {
            throw new RelicNotFoundException("Invalid relics data format or no relics found.");
        }
        List<JsonNode> filteredRelics = new ArrayList<>();
        relicsArray.forEach(relic -> {
        if (tier.equalsIgnoreCase(relic.get("tier").asText())) {
            filteredRelics.add(relic);
        }
        });
        return filteredRelics;
    }

    public Map<String, Map<String, List<String>>> getAllRelicTiers() throws IOException {
        JsonNode relicsArray = relicLoadService.loadRelicsWithCheckData();
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

    public List<JsonNode> getAllRelicStates(String relicName) throws IOException {
        JsonNode relicsArray = relicLoadService.loadRelicsWithCheckData();
        if (relicsArray == null || !relicsArray.isArray()) {
            throw new RelicNotFoundException("Invalid relics data format or no relics found.");
        }
        List<JsonNode> matchedRelics = new ArrayList<>();

        // Estrae i tiers unici dai relics
        relicsArray.forEach(relic -> {

            String tierNameRelic = relic.get("tier").asText() + " " + relic.get("relicName").asText();
            if (tierNameRelic.equalsIgnoreCase(relicName.replace("_", " ").trim())){
                matchedRelics.add(relic);
            }
        });
        return matchedRelics;
    }
}
