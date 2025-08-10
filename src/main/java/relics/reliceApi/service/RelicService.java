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

    public Map<String, Map<String, List<Relic>>> getAllRelicTiers() throws IOException {
        List<Relic> relicsArray = relicLoadService.loadRelicsWithCheckData();
        Map<String, Set<String>> tierSetMap = new HashMap<>();
        if (relicsArray == null || relicsArray.isEmpty()) {
            throw new RelicNotFoundException("No relics found.");
        }
        relicsArray.forEach(relic ->
                tierSetMap.computeIfAbsent(relic.getTier(), _ -> new HashSet<>()).add(relic.getRelicName())
        );
        // Ordina i tiers in un ordine specifico
        List<String> tierOrder = List.of("Lith", "Meso", "Axi", "Requiem");

        Map<String, List<Relic>> tierMap = new LinkedHashMap<>();

        tierOrder.forEach(tier -> {
            if (tierSetMap.containsKey(tier)) {
                List<String> sortedList = new ArrayList<>(tierSetMap.get(tier));

                sortedList.sort(Comparator
                        .comparing((String s) -> s.replaceAll("\\d", "")) // lettere
                        .thenComparing(s -> {
                            String numberPart = s.replaceAll("\\D", "");
                            return numberPart.isEmpty() ? 0 : Integer.parseInt(numberPart);
                        })
                );

                List<Relic> relicList = sortedList.stream()
                        .map(Relic::new)
                        .toList();

                tierMap.put(tier, relicList);
            }
        });

        Map<String, Map<String, List<Relic>>> response = new HashMap<>();
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
