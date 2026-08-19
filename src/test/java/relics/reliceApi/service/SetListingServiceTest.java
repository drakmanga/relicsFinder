package relics.reliceApi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SetListingServiceTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private Map<String, String> index(String json) throws Exception {
        return SetListingService.index(mapper.readTree(json));
    }

    @Test
    void keepsOnlyTheAssembledSets() throws Exception {
        Map<String, String> sets = index("""
                {"data":[
                  {"slug":"volt_prime_set","i18n":{"en":{"name":"Volt Prime Set"}}},
                  {"slug":"volt_prime_neuroptics","i18n":{"en":{"name":"Volt Prime Neuroptics"}}},
                  {"slug":"kavasa_prime_kubrow_collar_set",
                   "i18n":{"en":{"name":"Kavasa Prime Kubrow Collar Set"}}}
                ]}
                """);

        assertEquals(2, sets.size());
        assertEquals("volt_prime_set", sets.get("volt prime set"));
        assertTrue(sets.containsKey("kavasa prime kubrow collar set"));
    }

    @Test
    void readsTheOlderPayloadShapeToo() throws Exception {
        Map<String, String> sets = index("""
                {"payload":[{"slug":"ash_prime_set","i18n":{"en":{"name":"Ash Prime Set"}}}]}
                """);

        assertEquals("ash_prime_set", sets.get("ash prime set"));
    }

    @Test
    void answersEmptyRatherThanFailingOnAnUnexpectedBody() throws Exception {
        assertTrue(index("{}").isEmpty());
    }

    @Test
    void anythingThatIsNotASetNameHasNoListing() {
        SetListingService service = new SetListingService(new MarketRateLimiter());

        // Asked about a part rather than a set: the caller falls back to the
        // plain slug, which is right for every part in the catalogue.
        assertNull(service.slugFor("Volt Prime Neuroptics"));
        assertNull(service.slugFor(null));
    }
}
