package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import relics.reliceApi.model.Relic;
import relics.reliceApi.model.Rewards;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Searching the catalogue by part name.
 *
 * <p>The answer is not "which relics" but "which relics, and which of their six
 * drops matched": the endpoint returns each relic with its rewards trimmed to
 * the matches, which is what lets a caller point at the row rather than at the
 * relic.
 */
class RelicSearchItemServiceTest {

    @TempDir
    Path temp;

    private static final String CATALOGUE = """
            {"relics":[
              {"tier":"Lith","relicName":"V9","state":"Intact","rewards":[
                {"itemName":"Volt Prime Neuroptics Blueprint","rarity":"Uncommon","chance":"2"},
                {"itemName":"Forma Blueprint","rarity":"Uncommon","chance":"25.33"}
              ]},
              {"tier":"Axi","relicName":"A1","state":"Intact","rewards":[
                {"itemName":"Volt Prime Chassis Blueprint","rarity":"Uncommon","chance":"11"}
              ]},
              {"tier":"Meso","relicName":"M1","state":"Intact","rewards":[
                {"itemName":"Braton Prime Receiver","rarity":"Uncommon","chance":"11"}
              ]}
            ]}""";

    private RelicSearchItemService service() throws IOException {
        Path file = temp.resolve("relics.json");
        Files.writeString(file, CATALOGUE);
        return new RelicSearchItemService(new RelicLoadService(file.toString()));
    }

    @Test
    void answersOnlyWithTheRelicsThatHoldTheItem() throws IOException {
        List<Relic> found = service().findRelicsByItemName("Volt Prime");

        assertThat(found).extracting(Relic::getRelicName).containsExactlyInAnyOrder("V9", "A1");
    }

    @Test
    void trimsTheRewardsToWhatMatched() throws IOException {
        // Here, unlike the relics table, trimming is the point: the caller is
        // asking which drop it is, not what else is in the relic.
        List<Relic> found = service().findRelicsByItemName("Volt Prime Neuroptics");

        assertThat(found).hasSize(1);
        assertThat(found.get(0).getRewards()).extracting(Rewards::getItemName)
                .containsExactly("Volt Prime Neuroptics Blueprint");
    }

    @Test
    void ignoresCase() throws IOException {
        assertThat(service().findRelicsByItemName("VOLT prime neuroptics")).hasSize(1);
    }

    @Test
    void carriesTheCorrectedRarityThrough() throws IOException {
        // The search reads the catalogue through the same loader, so a caller
        // cannot get the drop tables' wrong label by asking a different way.
        List<Relic> found = service().findRelicsByItemName("Forma");

        assertThat(found.get(0).getRewards().get(0).getRarity()).isEqualTo("Common");
    }

    @Test
    void answersWithNothingRatherThanEverythingForAnEmptyQuery() throws IOException {
        assertThat(service().findRelicsByItemName("")).isEmpty();
        assertThat(service().findRelicsByItemName(null)).isEmpty();
    }

    @Test
    void answersWithNothingForAnItemNobodyDrops() throws IOException {
        assertThat(service().findRelicsByItemName("Excalibur Umbra Prime")).isEmpty();
    }
}
