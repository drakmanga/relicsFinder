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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The rarity correction, which is the reason this service is not just a
 * Jackson call.
 *
 * <p>The drop tables mislabel every rarity: the string "Common" appears nowhere
 * in the file, and 2067 drops tagged Uncommon@25.33 are Commons. The chances
 * are correct, so they are the signal — and the table has to be keyed by state,
 * because at Radiant the three Commons (16.67%) sit <em>below</em> the two
 * Uncommons (20%) and any ranking-based rule inverts.
 */
class RelicLoadServiceTest {

    @TempDir
    Path temp;

    private List<Relic> load(String json) throws IOException {
        Path file = temp.resolve("relics.json");
        Files.writeString(file, json);
        return new RelicLoadService(file.toString()).loadRelicsWithCheckData();
    }

    private static String relic(String state, String... chances) {
        StringBuilder rewards = new StringBuilder();
        for (int i = 0; i < chances.length; i++) {
            if (i > 0) rewards.append(",");
            rewards.append("""
                    {"itemName":"Part %d","rarity":"Uncommon","chance":"%s"}"""
                    .formatted(i, chances[i]));
        }

        return """
                {"relics":[{"tier":"Lith","relicName":"V9","state":"%s","rewards":[%s]}]}"""
                .formatted(state, rewards);
    }

    private static List<String> raritiesOf(List<Relic> relics) {
        return relics.get(0).getRewards().stream().map(Rewards::getRarity).toList();
    }

    @Test
    void rewritesIntactRaritiesFromTheirChances() throws IOException {
        List<Relic> relics = load(relic("Intact", "25.33", "11", "2"));

        // Every one of these arrives labelled "Uncommon".
        assertThat(raritiesOf(relics)).containsExactly("Common", "Uncommon", "Rare");
    }

    @Test
    void readsRadiantWhereTheOrderInverts() throws IOException {
        List<Relic> relics = load(relic("Radiant", "16.67", "20", "10"));

        // 16.67 is the Common and 20 the Uncommon: ranking by chance would call
        // the 20% a Common and get both wrong.
        assertThat(raritiesOf(relics)).containsExactly("Common", "Uncommon", "Rare");
    }

    @Test
    void readsEveryRefinementState() throws IOException {
        assertThat(raritiesOf(load(relic("Exceptional", "23.33", "13", "4"))))
                .containsExactly("Common", "Uncommon", "Rare");
        assertThat(raritiesOf(load(relic("Flawless", "20", "17", "6"))))
                .containsExactly("Common", "Uncommon", "Rare");
    }

    @Test
    void twentyPercentMeansDifferentThingsInDifferentStates() throws IOException {
        // The same number, two answers — which is why the table is keyed by
        // state and cannot be one list.
        assertThat(raritiesOf(load(relic("Flawless", "20")))).containsExactly("Common");
        assertThat(raritiesOf(load(relic("Radiant", "20")))).containsExactly("Uncommon");
    }

    @Test
    void absorbsTheFloatNoiseOfTwoDecimalPublishing() throws IOException {
        assertThat(raritiesOf(load(relic("Intact", "25.34", "10.98")))).containsExactly(
                "Common", "Uncommon");
    }

    @Test
    void keepsTheDeclaredLabelWhenTheChanceIsNotInTheTable() throws IOException {
        // An unrecognised chance means the game changed the drop tables. The
        // declared label is then a better guess than a wrong one.
        assertThat(raritiesOf(load(relic("Intact", "42")))).containsExactly("Uncommon");
    }

    @Test
    void keepsTheDeclaredLabelWhenTheStateIsUnknown() throws IOException {
        assertThat(raritiesOf(load(relic("Pristine", "25.33")))).containsExactly("Uncommon");
    }

    @Test
    void survivesAChanceThatIsNotANumber() throws IOException {
        assertThat(raritiesOf(load(relic("Intact", "n/a")))).containsExactly("Uncommon");
    }

    @Test
    void dropsTheRelicWithNoName() throws IOException {
        // One Requiem entry in the drop tables carries no relicName. It cannot
        // be addressed by any endpoint and reached the interface as the row
        // "Requiem undefined".
        String json = """
                {"relics":[
                  {"tier":"Requiem","relicName":null,"state":"Intact","rewards":[]},
                  {"tier":"Requiem","relicName":"  ","state":"Intact","rewards":[]},
                  {"tier":"Lith","relicName":"V9","state":"Intact","rewards":[]}
                ]}""";

        assertThat(load(json)).extracting(Relic::getRelicName).containsExactly("V9");
    }

    @Test
    void refusesAFileThatIsNotTheCatalogue() {
        assertThatThrownBy(() -> load("""
                {"somethingElse":[]}"""))
                .isInstanceOf(IOException.class)
                .hasMessageContaining("Invalid relics data format");
    }

    @Test
    void refusesAFileThatIsNotThere() {
        RelicLoadService service = new RelicLoadService(temp.resolve("absent.json").toString());

        assertThatThrownBy(service::loadRelicsWithCheckData)
                .isInstanceOf(IOException.class)
                .hasMessageContaining("not found");
    }
}
