package relics.reliceApi.service;

import org.springframework.stereotype.Service;
import relics.reliceApi.Expection.RelicNotFoundException;
import relics.reliceApi.model.Relic;

import java.io.IOException;
import java.util.*;

@Service
public class RelicService {

    private final RelicLoadService relicLoadService;
    public RelicService(RelicLoadService relicLoadService) {
        this.relicLoadService = relicLoadService;
    }


    public List<Relic> getOnlyTierRelics(String tier) throws IOException {
        List<Relic> relicsArray = relicLoadService.loadRelicsWithCheckData();
        if(relicsArray == null || relicsArray.isEmpty()) {
            throw new RelicNotFoundException("No relics found.");
        }

        List<Relic> filteredRelics = new ArrayList<>();
        relicsArray.forEach(relic -> {
        if (tier.equalsIgnoreCase(relic.getTier())) {
            filteredRelics.add(relic);
        }
        });
        return filteredRelics;
    }

    public Map<String, Map<String, List<String>>> getAllRelicTiers() throws IOException {
        List<Relic> relicsArray = relicLoadService.loadRelicsWithCheckData();
        Map<String, Set<String>> tierSetMap = new HashMap<>();
        // Estrae i tiers unici dai relics
        relicsArray.forEach(relic ->
            tierSetMap.computeIfAbsent(relic.getTier(), k -> new HashSet<>()).add(relic.getRelicName()));

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

    public List<Relic> getAllRelicStates(String relicName) throws IOException {
        List<Relic> relicsArray = relicLoadService.loadRelicsWithCheckData();
        if (relicsArray == null || relicsArray.isEmpty()) {
            throw new RelicNotFoundException("No relics found.");
        }
        List<Relic> matchedRelics = new ArrayList<>();

        // Estrae i tiers unici dai relics
        relicsArray.forEach(relic -> {
            String tierNameRelic = relic.getTier() + " " + relic.getRelicName();
            if (tierNameRelic.equalsIgnoreCase(relicName.replace("_", " ").trim())){
                matchedRelics.add(relic);
            }
        });
        return matchedRelics;
    }
}
