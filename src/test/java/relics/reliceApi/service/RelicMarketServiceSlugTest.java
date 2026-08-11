package relics.reliceApi.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The slugs, which is where this service has been wrong twice.
 *
 * <p>Both failures were quiet: the item came back 404 and was displayed as
 * something nobody is selling, which looks exactly like a real answer.
 */
class RelicMarketServiceSlugTest {

    @Test
    void keepsTheBlueprintSuffix() {
        // This used to be stripped, on the belief that warframe.market did not
        // carry it. The shortened slug did answer — with a 301 to the full one,
        // which the HTTP client follows silently — for as long as every part
        // had a redirect behind it. Warframes released since Hildryn have none.
        assertThat(RelicMarketService.itemSlug("Volt Prime Neuroptics Blueprint"))
                .isEqualTo("volt_prime_neuroptics_blueprint");
        assertThat(RelicMarketService.itemSlug("Revenant Prime Blueprint"))
                .isEqualTo("revenant_prime_blueprint");
    }

    @Test
    void writesAnAmpersandAsTheWordAnd() {
        // The market writes "Cobra & Crane Prime Hilt" as
        // cobra_and_crane_prime_hilt. Collapsing "&" into an underscore made a
        // slug for a weapon that does not exist, and every dual weapon in the
        // game was priced at nothing.
        assertThat(RelicMarketService.itemSlug("Cobra & Crane Prime Hilt"))
                .isEqualTo("cobra_and_crane_prime_hilt");
    }

    @Test
    void collapsesRunsOfPunctuationIntoOneUnderscore() {
        assertThat(RelicMarketService.itemSlug("Dual  Kamas   Prime Blade"))
                .isEqualTo("dual_kamas_prime_blade");
        assertThat(RelicMarketService.itemSlug("Akbolto Prime Barrel"))
                .isEqualTo("akbolto_prime_barrel");
    }

    @Test
    void leavesNoUnderscoreDanglingAtEitherEnd() {
        assertThat(RelicMarketService.itemSlug("  Volt Prime  ")).isEqualTo("volt_prime");
        assertThat(RelicMarketService.itemSlug("&Volt Prime&")).isEqualTo("and_volt_prime_and");
    }

    @Test
    void givesRelicsTheSuffixThatPartsDoNotHave() {
        // axi_a1_relic, not axi_a1: the relic and a part of the same name are
        // two different listings.
        assertThat(RelicMarketService.relicSlug("Axi A1")).isEqualTo("axi_a1_relic");
        assertThat(RelicMarketService.relicSlug("Lith V9")).isEqualTo("lith_v9_relic");
    }

    @Test
    void answersEmptyForNothing() {
        assertThat(RelicMarketService.itemSlug(null)).isEmpty();
        assertThat(RelicMarketService.itemSlug("")).isEmpty();
        assertThat(RelicMarketService.relicSlug(null)).isEqualTo("_relic");
    }
}
