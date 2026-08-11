package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.model.Relic;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Grouping the relics still in rotation.
 *
 * <p>The names arrive from the drop tables in whatever case and order that
 * source happens to use, and the interface reads them as eras in the game's own
 * order — which is not alphabetical, and would put Axi first if it were.
 */
class RelicVaultedServiceTest {

    /**
     * A LinkedHashSet rather than Set.of: the service iterates what it is given,
     * so a test about ordering must control the order going in.
     */
    private RelicVaultedService withNames(String... names) {
        DropTableService tables = mock(DropTableService.class);
        when(tables.unvaultedRelicNames()).thenReturn(new LinkedHashSet<>(List.of(names)));
        return new RelicVaultedService(tables);
    }

    @Test
    void ordersTheErasAsTheGameDoes() {
        Map<String, List<Relic>> grouped =
                withNames("Axi A1", "Lith V9", "Requiem I", "Neo N1", "Meso M1")
                        .extractUnvaultedRelics();

        assertThat(grouped.keySet()).containsExactly("Lith", "Meso", "Neo", "Axi", "Requiem");
    }

    @Test
    void sortsWithinAnEra() {
        Map<String, List<Relic>> grouped =
                withNames("Lith V9", "Lith A1", "Lith K2").extractUnvaultedRelics();

        assertThat(grouped.get("Lith")).extracting(Relic::getRelicName)
                .containsExactly("A1", "K2", "V9");
    }

    @Test
    void normalisesWhateverCaseTheSourceUses() {
        Map<String, List<Relic>> grouped =
                withNames("lith v9", "LITH A1").extractUnvaultedRelics();

        assertThat(grouped).containsOnlyKeys("Lith");
        assertThat(grouped.get("Lith")).extracting(Relic::getRelicName).containsExactly("A1", "V9");
    }

    @Test
    void dropsANameItCannotSplitIntoEraAndCode() {
        // A single word is not a relic name, and a row that cannot be addressed
        // is worse than a row that is not there.
        Map<String, List<Relic>> grouped = withNames("Lith V9", "Nonsense").extractUnvaultedRelics();

        assertThat(grouped).containsOnlyKeys("Lith");
    }

    @Test
    void putsAnUnknownEraLastRatherThanFirst() {
        Map<String, List<Relic>> grouped =
                withNames("Vanguard C1", "Lith V9").extractUnvaultedRelics();

        assertThat(grouped.keySet()).containsExactly("Lith", "Vanguard");
    }

    @Test
    void answersWithNothingWhenNothingIsInRotation() {
        assertThat(withNames().extractUnvaultedRelics()).isEmpty();
    }
}
