package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The Endo formula, checked against the numbers the game publishes.
 *
 * <p>Endo = (B + 50C + 100A) × (1 + M(C + A) / S). Every sculpture's filled
 * value is public, so this is not a test of what the code does — it is a test
 * against an external source. If a multiplier is ever mistyped, the ranking
 * this whole view exists for puts the wrong sculpture first, and nothing on the
 * screen would look wrong.
 */
class EndoServiceTest {

    private static EndoService.Sculpture sculpture(String name) {
        return EndoService.SCULPTURES.stream()
                .filter(s -> s.name().equals(name))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no sculpture named " + name));
    }

    /** Filled value as Warframe publishes it, per sculpture. */
    private static final Map<String, Integer> PUBLISHED_FILLED = Map.of(
            "Ayatan Anasa Sculpture", 3450,
            "Ayatan Kitha Sculpture", 3000,
            "Ayatan Orta Sculpture", 2700,
            "Ayatan Chattraka Sculpture", 2600,
            "Ayatan Hemakara Sculpture", 2600,
            "Ayatan Zambuka Sculpture", 2600,
            "Ayatan Vaya Sculpture", 1800,
            "Ayatan Piv Sculpture", 1725,
            "Ayatan Valana Sculpture", 1575,
            "Ayatan Sah Sculpture", 1500);

    @Test
    void everySculptureFilledMatchesItsPublishedValue() {
        for (EndoService.Sculpture s : EndoService.SCULPTURES) {
            Integer published = PUBLISHED_FILLED.get(s.name());
            if (published == null) continue;

            assertThat(s.endoFor(s.cyanSockets(), s.amberSockets()))
                    .as("%s filled", s.name())
                    .isEqualTo(published);
        }
    }

    @Test
    void ayrIsTheOneWithNoAmberSocket() {
        EndoService.Sculpture ayr = sculpture("Ayatan Ayr Sculpture");

        assertThat(ayr.amberSockets()).isZero();
        assertThat(ayr.endoFor(3, 0)).isEqualTo(1425);
    }

    @ParameterizedTest
    @CsvSource({
            "Ayatan Anasa Sculpture, 2000",
            "Ayatan Kitha Sculpture, 450",
            "Ayatan Sah Sculpture, 300",
    })
    void anEmptySculptureIsWorthItsBase(String name, int base) {
        assertThat(sculpture(name).endoFor(0, 0)).isEqualTo(base);
    }

    @Test
    void everyStarAddedIsWorthMoreThanTheOneBefore() {
        // The multiplier applies to the whole value, so filling is not linear —
        // which is exactly why a half-filled sculpture is a bad buy and the
        // view ranks on the filled figure.
        EndoService.Sculpture anasa = sculpture("Ayatan Anasa Sculpture");

        int empty = anasa.endoFor(0, 0);
        int oneCyan = anasa.endoFor(1, 0);
        int twoCyan = anasa.endoFor(2, 0);

        assertThat(oneCyan - empty).isLessThan(twoCyan - oneCyan);
    }

    @Test
    void refusesToCountStarsThatWouldNotFit() {
        // Stars beyond the sockets cannot exist. If the market API ever reports
        // one, it must not inflate the ranking.
        EndoService.Sculpture sah = sculpture("Ayatan Sah Sculpture");

        assertThat(sah.endoFor(99, 99)).isEqualTo(sah.endoFor(sah.cyanSockets(), sah.amberSockets()));
    }

    @Test
    void amberIsWorthMoreThanCyan() {
        EndoService.Sculpture anasa = sculpture("Ayatan Anasa Sculpture");

        assertThat(anasa.endoFor(0, 1)).isGreaterThan(anasa.endoFor(1, 0));
    }

    @Test
    void carriesNoLooseStars() {
        // Loose Cyan and Amber stars are bought to fill a sculpture, not to be
        // dissolved: ranking them by Endo per platinum answers a question
        // nobody asks.
        assertThat(EndoService.SCULPTURES)
                .allSatisfy(s -> assertThat(s.name()).startsWith("Ayatan "))
                .allSatisfy(s -> assertThat(s.name()).endsWith(" Sculpture"));
    }

    @Test
    void everySlugMatchesItsName() {
        // The slug is what the market is asked for; a mismatch prices the wrong
        // sculpture under the right label.
        assertThat(EndoService.SCULPTURES).allSatisfy(s ->
                assertThat(s.slug()).isEqualTo(s.name().toLowerCase().replace(' ', '_')));
    }
}
