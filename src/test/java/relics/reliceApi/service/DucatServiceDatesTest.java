package relics.reliceApi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The two dates a Prime set carries, read off the item rather than its parts.
 *
 * <p>The JSON below is the shape WFCD publishes, cut to the fields this reads,
 * and the three entries are the three cases that exist in it: a set vaulted
 * years ago, a set that has never been vaulted, and a set the database dates
 * while flagging it vaulted although it is in the drop tables today.
 */
class DucatServiceDatesTest {

    private static final String SETS =
            """
            [
              {
                "name": "Ash Prime",
                "releaseDate": "2015-07-07",
                "vaulted": true,
                "vaultDate": "2017-05-30"
              },
              {
                "name": "Oraxia Prime",
                "releaseDate": "2026-06-17",
                "vaulted": false
              },
              {
                "name": "Excalibur",
                "vaulted": false
              }
            ]
            """;

    private static Map<String, DucatService.SetDates> indexed() throws Exception {
        Map<String, DucatService.SetDates> dates = new HashMap<>();
        DucatService.indexDates(new ObjectMapper().readTree(SETS), dates);
        return dates;
    }

    @Test
    void readsBothDatesOfAVaultedSet() throws Exception {
        DucatService.SetDates ash = indexed().get("ash prime");

        assertThat(ash.setName()).isEqualTo("Ash Prime");
        assertThat(ash.releaseDate()).isEqualTo("2015-07-07");
        assertThat(ash.vaultDate()).isEqualTo("2017-05-30");
    }

    /**
     * A set with no vault date has never been vaulted, and that is an answer.
     *
     * <p>Null rather than the empty string the JSON reader hands back for an
     * absent field: 29 of the 159 sets in the relic catalogue are in this case,
     * and {@code ""} would sort and compare as a date from the year zero.
     */
    @Test
    void leavesANeverVaultedSetsVaultDateNull() throws Exception {
        DucatService.SetDates oraxia = indexed().get("oraxia prime");

        assertThat(oraxia.releaseDate()).isEqualTo("2026-06-17");
        assertThat(oraxia.vaultDate()).isNull();
    }

    /**
     * The gate is the release date, not the {@code isPrime} flag.
     *
     * <p>An item with no release date carries nothing this can date, so it is
     * left out entirely rather than stored with two nulls — but the reason it is
     * gated on the date is the opposite case: Galariak Prime is a Prime-named
     * melee weapon whose {@code isPrime} is false, and gating on the flag would
     * silently drop a set the relic catalogue holds.
     */
    @Test
    void skipsAnItemWithNoReleaseDate() throws Exception {
        assertThat(indexed()).doesNotContainKey("excalibur");
    }

    /** Looked up the way a part names its set: whatever the case and spacing. */
    @Test
    void isKeyedSoASetNameFoundOnAPartMatchesIt() throws Exception {
        assertThat(indexed()).containsKey("ash prime");
    }
}
