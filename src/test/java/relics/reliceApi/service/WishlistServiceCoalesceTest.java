package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import relics.reliceApi.model.WishlistEntry;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * What happens to two lines that key the same.
 *
 * <p>They can key the same without being a duplicate anyone typed twice: a
 * relic line stored before the catalogue moved off Intact carries no state, and
 * the fallback that reconstructs one now answers Radiant — which is the key an
 * explicit Radiant line already holds. Both are quantities the reader entered,
 * so the store adds them rather than keeping one and dropping the other, and
 * {@code lib/wishlist.ts} does the same on the browser side.
 */
class WishlistServiceCoalesceTest {

    private static WishlistEntry relic(String name, String refinement, int quantity) {
        return new WishlistEntry(name, "relic", "axi", name, refinement, quantity);
    }

    @Test
    void addsTheQuantitiesOfTwoLinesThatResolveToOneKey(@TempDir Path dir) {
        WishlistService service = new WishlistService(dir.resolve("wishlist.json").toString());

        List<WishlistEntry> stored =
                service.replace(List.of(relic("Axi A20", null, 2), relic("Axi A20", "radiant", 3)));

        assertThat(stored).hasSize(1);
        assertThat(stored.getFirst().getQuantity()).isEqualTo(5);
    }

    /** The resolution is written down, so the next read has nothing left to resolve. */
    @Test
    void storesTheStateTheKeyResolvedToRatherThanTheNullItArrivedWith(@TempDir Path dir) {
        WishlistService service = new WishlistService(dir.resolve("wishlist.json").toString());

        assertThat(service.replace(List.of(relic("Axi A20", null, 1))).getFirst().getRefinement())
                .isEqualTo("radiant");
    }

    /** Two states are two plans, and stay two lines. */
    @Test
    void keepsTwoStatesOfOneRelicApart(@TempDir Path dir) {
        WishlistService service = new WishlistService(dir.resolve("wishlist.json").toString());

        assertThat(service.replace(List.of(relic("Axi A20", "intact", 2), relic("Axi A20", "radiant", 3))))
                .hasSize(2);
    }

    /**
     * The file is the copy that predates the rule, so it is coalesced on the way
     * in as well: a list written before the fallback moved holds the collision,
     * and nothing would otherwise resolve it until the next edit.
     */
    @Test
    void coalescesAListReadOffDisk(@TempDir Path dir) throws Exception {
        Path file = dir.resolve("wishlist.json");
        Files.writeString(
                file,
                """
                [
                  { "itemName": "Axi A20", "kind": "relic", "tier": "axi", "quantity": 2 },
                  { "itemName": "Axi A20", "kind": "relic", "tier": "axi",
                    "refinement": "radiant", "quantity": 3 }
                ]
                """);

        List<WishlistEntry> loaded = new WishlistService(file.toString()).all();

        assertThat(loaded).hasSize(1);
        assertThat(loaded.getFirst().getQuantity()).isEqualTo(5);
    }

    /** A part is not keyed on refinement, so two of them were always one line. */
    @Test
    void stillFoldsAPartWantedTwiceForTheSameReason(@TempDir Path dir) {
        WishlistService service = new WishlistService(dir.resolve("wishlist.json").toString());

        List<WishlistEntry> stored =
                service.replace(List.of(
                        new WishlistEntry("Volt Prime Neuroptics", "part", "axi", "Axi A20", "intact", 1),
                        new WishlistEntry("Volt Prime Neuroptics", "part", "axi", "Axi A20", "radiant", 1)));

        assertThat(stored).hasSize(1);
        assertThat(stored.getFirst().getQuantity()).isEqualTo(2);
    }
}
