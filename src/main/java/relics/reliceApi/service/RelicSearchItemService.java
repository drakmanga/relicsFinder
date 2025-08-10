package relics.reliceApi.service;

import org.springframework.stereotype.Service;
import relics.reliceApi.model.Relic;
import relics.reliceApi.model.Rewards;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class RelicSearchItemService {
    private final RelicLoadService relicLoadService;

    public RelicSearchItemService(RelicLoadService relicLoadService) {
        this.relicLoadService = relicLoadService;
    }

    public List<Relic> findRelicsByItemName(String itemName) throws IOException {
        List<Relic> relics = relicLoadService.loadRelicsWithCheckData();
        if (relics == null || itemName == null || itemName.isEmpty()) {
            return Collections.emptyList();
        }

        return relics.stream()
                .map(relic -> {

                    List<Rewards> matchingRewards = relic.getRewards().stream()
                            .filter(reward -> reward.getItemName() != null &&
                                    reward.getItemName().toLowerCase().contains(itemName.toLowerCase()))
                            .collect(Collectors.toList());


                    if (matchingRewards.isEmpty()) {
                        return null;
                    }

                    return new Relic(relic.getTier(), relic.getRelicName(), relic.getState(), matchingRewards);
                })
                .filter(Objects::nonNull)
                .toList();
    }
}
