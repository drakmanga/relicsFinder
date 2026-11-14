package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import relics.reliceApi.Expection.InvalidOwnedRelicException;
import relics.reliceApi.model.OwnedRelic;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OwnedRelicServiceTest {

    private static final Map<String, String> CATALOGUE = Map.of(
            "neo n16", "Neo N16",
            "axi a20", "Axi A20");

    @TempDir
    Path dir;

    private OwnedRelicService service() {
        return new OwnedRelicService(dir.resolve("owned-relics.json").toString(), () -> CATALOGUE);
    }

    @Test
    void storesAnEntryAndFindsItAfterARestart() {
        service().replace(List.of(new OwnedRelic("Neo N16", "radiant", 3)));

        assertThat(service().all()).containsExactly(new OwnedRelic("Neo N16", "radiant", 3));
    }

    @Test
    void aChangedQuantityReplacesTheOldOne() {
        OwnedRelicService service = service();
        service.replace(List.of(new OwnedRelic("Neo N16", "radiant", 3)));

        service.replace(List.of(new OwnedRelic("Neo N16", "radiant", 2)));

        assertThat(service().all()).containsExactly(new OwnedRelic("Neo N16", "radiant", 2));
    }

    @Test
    void aRemovedEntryStaysRemoved() {
        OwnedRelicService service = service();
        service.replace(List.of(new OwnedRelic("Neo N16", "radiant", 3)));

        service.replace(List.of());

        assertThat(service().all()).isEmpty();
    }

    @Test
    void theSameRelicInTwoRefinementsIsTwoEntries() {
        List<OwnedRelic> stored = service().replace(List.of(
                new OwnedRelic("Neo N16", "intact", 4),
                new OwnedRelic("Neo N16", "radiant", 1)));

        assertThat(stored).hasSize(2);
    }

    @Test
    void anUnknownRelicIsRefusedWithAMessageSayingWhy() {
        assertThatThrownBy(() -> service().replace(List.of(new OwnedRelic("Neo Z99", "intact", 1))))
                .isInstanceOf(InvalidOwnedRelicException.class)
                .hasMessageContaining("Neo Z99")
                .hasMessageContaining("not in the relic catalogue");
    }

    /** All or nothing: one typo must not leave half a list saved. */
    @Test
    void oneUnknownRelicRefusesTheWholeListAndKeepsTheStoredOne() {
        OwnedRelicService service = service();
        service.replace(List.of(new OwnedRelic("Axi A20", "intact", 1)));

        assertThatThrownBy(() -> service.replace(List.of(
                new OwnedRelic("Neo N16", "intact", 1),
                new OwnedRelic("Lith Nope", "intact", 1))))
                .isInstanceOf(InvalidOwnedRelicException.class);

        assertThat(service().all()).containsExactly(new OwnedRelic("Axi A20", "intact", 1));
    }

    @Test
    void anUnknownRefinementIsRefused() {
        assertThatThrownBy(() -> service().replace(List.of(new OwnedRelic("Neo N16", "shiny", 1))))
                .isInstanceOf(InvalidOwnedRelicException.class)
                .hasMessageContaining("shiny");
    }

    @Test
    void storesTheCatalogueSpellingOfAHastilyTypedName() {
        List<OwnedRelic> stored = service().replace(List.of(new OwnedRelic("  neo   n16 ", "Radiant", 1)));

        assertThat(stored).containsExactly(new OwnedRelic("Neo N16", "radiant", 1));
    }

    @Test
    void twoEntriesForOneKeyAreAddedTogether() {
        List<OwnedRelic> stored = service().replace(List.of(
                new OwnedRelic("Neo N16", "radiant", 2),
                new OwnedRelic("neo n16", "radiant", 1)));

        assertThat(stored).containsExactly(new OwnedRelic("Neo N16", "radiant", 3));
    }

    @Test
    void anEntryHoldingNothingIsDropped() {
        assertThat(service().replace(List.of(new OwnedRelic("Neo N16", "radiant", 0)))).isEmpty();
    }

    @Test
    void aCorruptFileStartsEmptyRatherThanStoppingTheApplication() throws Exception {
        Files.writeString(dir.resolve("owned-relics.json"), "{not json");

        assertThat(service().all()).isEmpty();
    }
}
