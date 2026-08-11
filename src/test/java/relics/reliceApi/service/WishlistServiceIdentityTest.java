package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.model.WishlistEntry;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * What makes two wishlist lines the same line.
 *
 * <p>The rule is duplicated in the browser, in {@code lib/wishlist.ts}, and the
 * two have to agree: whichever is coarser wins on the next reload, and the loser
 * is a line the user kept apart being merged into another with its quantity
 * added on.
 */
class WishlistServiceIdentityTest {

    private static WishlistEntry entry(String name, String kind, String refinement) {
        return new WishlistEntry(name, kind, "axi", name, refinement, 1);
    }

    @Test
    void aPartIsIdentifiedByKindAndNameAlone() {
        assertThat(WishlistService.identityOf(entry("Volt Prime Neuroptics", "part", "intact")))
                .isEqualTo(WishlistService.identityOf(entry("Volt Prime Neuroptics", "part", "radiant")));
    }

    @Test
    void theSameNameWantedForTwoReasonsIsTwoLines() {
        assertThat(WishlistService.identityOf(entry("Volt Prime Neuroptics", "part", "intact")))
                .isNotEqualTo(WishlistService.identityOf(entry("Volt Prime Neuroptics", "ducat", "intact")));
    }

    @Test
    void aRelicIsIdentifiedByTheStateItIsWantedIn() {
        assertThat(WishlistService.identityOf(entry("Axi A20", "relic", "intact")))
                .isNotEqualTo(WishlistService.identityOf(entry("Axi A20", "relic", "exceptional")));

        assertThat(WishlistService.identityOf(entry("Axi A20", "relic", "intact")))
                .isEqualTo(WishlistService.identityOf(entry("Axi A20", "relic", "intact")));
    }

    /** A line written before the state was part of the key reads as Intact. */
    @Test
    void aRelicWithNoStateCountsAsIntact() {
        assertThat(WishlistService.identityOf(entry("Axi A20", "relic", null)))
                .isEqualTo(WishlistService.identityOf(entry("Axi A20", "relic", "intact")));
    }
}
