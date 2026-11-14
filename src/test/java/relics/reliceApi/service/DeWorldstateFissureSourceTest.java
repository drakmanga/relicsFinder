package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeWorldstateFissureSourceTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** One star-chart fissure, one Void Storm and one node the table lacks, as the game serves them. */
    private static final String WORLDSTATE = """
            {"ActiveMissions":[
              {"_id":{"$oid":"m1"},"Node":"SolNode401","MissionType":"MT_CAPTURE","Modifier":"VoidT3",
               "Expiry":{"$date":{"$numberLong":"1794699525060"}},"Hard":true},
              {"_id":{"$oid":"m2"},"Node":"SolNode9999","MissionType":"MT_NEW","Modifier":"VoidT6",
               "Expiry":{"$date":{"$numberLong":"1794699525060"}}}
            ],"VoidStorms":[
              {"_id":{"$oid":"s1"},"Node":"CrewBattleNode522","ActiveMissionTier":"VoidT1",
               "Expiry":{"$date":{"$numberLong":"1794700203351"}}}
            ]}
            """;

    private static final String NODES = """
            {"SolNode401":{"value":"Hepit (Void)","enemy":"Orokin","type":"Capture"},
             "CrewBattleNode522":{"value":"Bendar Cluster (Earth)","enemy":"Grineer","type":"Skirmish"}}
            """;

    private static JsonNode json(String text) throws IOException {
        return MAPPER.readTree(text);
    }

    @Test
    void rewritesAFissureIntoWarframestatsShape() throws IOException {
        JsonNode first = DeWorldstateFissureSource.toFissureArray(json(WORLDSTATE), json(NODES)).get(0);

        assertThat(first.path("id").asText()).isEqualTo("m1");
        assertThat(first.path("node").asText()).isEqualTo("Hepit (Void)");
        assertThat(first.path("missionType").asText()).isEqualTo("Capture");
        assertThat(first.path("tier").asText()).isEqualTo("Neo");
        assertThat(first.path("isHard").asBoolean()).isTrue();
        assertThat(first.path("isStorm").asBoolean()).isFalse();
        assertThat(first.path("expiry").asText()).isEqualTo("2026-11-14T23:38:45.060Z");
    }

    @Test
    void keepsAnUnknownNodeByIdWithNoMissionTypeSoItIsNeverRanked() throws IOException {
        JsonNode unknown = DeWorldstateFissureSource.toFissureArray(json(WORLDSTATE), json(NODES)).get(1);

        assertThat(unknown.path("node").asText()).isEqualTo("SolNode9999");
        assertThat(unknown.path("missionType").asText()).isEmpty();
        assertThat(unknown.path("tier").asText()).isEqualTo("Omnia");
        assertThat(unknown.path("isHard").asBoolean()).isFalse();
    }

    @Test
    void marksAVoidStormAsOne() throws IOException {
        JsonNode storm = DeWorldstateFissureSource.toFissureArray(json(WORLDSTATE), json(NODES)).get(2);

        assertThat(storm.path("node").asText()).isEqualTo("Bendar Cluster (Earth)");
        assertThat(storm.path("tier").asText()).isEqualTo("Lith");
        assertThat(storm.path("isStorm").asBoolean()).isTrue();
    }

    @Test
    void fallbackAnswersWhenThePrimaryFails() throws Exception {
        var primary = new WarframestatFissureSource("http://unused") {
            @Override
            public String fetch() throws IOException {
                throw new IOException("HTTP 521 from warframestat");
            }
        };
        var fallback = new DeWorldstateFissureSource("http://unused", "http://unused") {
            @Override
            public String fetch() {
                return "[]";
            }
        };

        assertThat(new FallbackFissureSource(primary, fallback).fetch()).isEqualTo("[]");
    }

    @Test
    void bothFailuresAreNamedWhenBothHostsAreDown() {
        var primary = new WarframestatFissureSource("http://unused") {
            @Override
            public String fetch() throws IOException {
                throw new IOException("HTTP 521 from warframestat");
            }
        };
        var fallback = new DeWorldstateFissureSource("http://unused", "http://unused") {
            @Override
            public String fetch() throws IOException {
                throw new IOException("HTTP 503 from worldstate");
            }
        };

        assertThatThrownBy(() -> new FallbackFissureSource(primary, fallback).fetch())
                .isInstanceOf(IOException.class)
                .hasMessage("HTTP 521 from warframestat; fallback: HTTP 503 from worldstate");
    }
}
