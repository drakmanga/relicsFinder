package relics.reliceApi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * What the item database is read for, per component.
 *
 * <p>The ducat value and the set were always taken off this node; how many
 * copies the set is built from was on it all along and thrown away. A Prime set
 * is not one of each piece — Kestrel Prime is one Blueprint, one Grip and two
 * Blades — and without the count the application reports a set as finished with
 * a Blade still missing.
 *
 * <p>The JSON below is the shape WFCD publishes, cut to the fields this reads.
 */
class DucatServiceIndexTest {

    private static final String KESTREL =
            """
            [
              {
                "name": "Kestrel Prime",
                "components": [
                  { "name": "Blueprint", "ducats": 15 },
                  { "name": "Grip", "ducats": 45, "itemCount": 1 },
                  { "name": "Blade", "ducats": 45, "itemCount": 2 },
                  { "name": "Orokin Cell", "itemCount": 10 }
                ]
              }
            ]
            """;

    private static Map<String, DucatService.ItemMeta> indexed(String json) throws Exception {
        Map<String, DucatService.ItemMeta> byName = new HashMap<>();
        DucatService.index(new ObjectMapper().readTree(json), "melee", byName);
        return byName;
    }

    @Test
    void readsHowManyCopiesOfAComponentTheSetIsBuiltFrom() throws Exception {
        assertThat(indexed(KESTREL).get("kestrel prime blade").copiesPerSet()).isEqualTo(2);
        assertThat(indexed(KESTREL).get("kestrel prime grip").copiesPerSet()).isEqualTo(1);
    }

    /**
     * Silence is not zero copies.
     *
     * <p>A component whose entry carries no count is left null here and read as
     * one copy by whoever asks — the number every set was assumed to need before
     * this was carried. Answering 0 would empty a set the moment the database
     * omitted a field.
     */
    @Test
    void leavesAComponentWithNoCountUnanswered() throws Exception {
        assertThat(indexed(KESTREL).get("kestrel prime blueprint").copiesPerSet()).isNull();
    }

    /**
     * The count rides behind the ducat guard rather than beside it.
     *
     * <p>Orokin Cell has an itemCount of ten and appears under every item in the
     * game. It is a crafting material rather than a part of the set, and the
     * ducat guard is what has always kept it out of the parts list.
     */
    @Test
    void stillKeepsASharedCraftingMaterialOutOfTheParts() throws Exception {
        assertThat(indexed(KESTREL)).doesNotContainKey("kestrel prime orokin cell");
    }

    @Test
    void stillReadsTheDucatValueAndTheSet() throws Exception {
        DucatService.ItemMeta blade = indexed(KESTREL).get("kestrel prime blade");

        assertThat(blade.ducats()).isEqualTo(45);
        assertThat(blade.setName()).isEqualTo("Kestrel Prime");
        assertThat(blade.category()).isEqualTo("melee");
    }
}
