package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import relics.reliceApi.model.ItemPrice;
import relics.reliceApi.model.RelicPrice;
import relics.reliceApi.model.TierListQuery;
import relics.reliceApi.model.TierListResponse;
import relics.reliceApi.model.TierListRow;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * A catalogue, a market and a vault rotation, assembled for one test.
 *
 * <p>The catalogue is written out as the file {@link RelicLoadService} reads,
 * rather than handed over as objects: that service is the one place a relic
 * enters this application, and a fixture that bypassed it would be testing a
 * shape it had chosen itself. The same reason the browser's own tier-list tests
 * feed their payload through {@code normalizeRelic}.
 *
 * <p>The market and the vault are mocks. Standing up the real
 * {@link RelicMarketService} means seven collaborators, a queue and a file, none
 * of which the ranking has an opinion about — it asks for prices by name and is
 * handed prices by name.
 */
final class TierListFixture {

    private final ObjectMapper mapper = new ObjectMapper();
    private final ArrayNode relics = mapper.createArrayNode();

    /** Platinum by item name. An absent name is a part nobody has listed. */
    private final Map<String, Double> prices = new LinkedHashMap<>();
    /** Ninety-day trend by item name, where the market measured one. */
    private final Map<String, Double> trends = new HashMap<>();
    private final Map<String, Double> relicPrices = new HashMap<>();
    private final Set<String> droppable = new HashSet<>();

    private Instant newest;
    private Instant earliestDue;

    private final Path catalogue;

    TierListFixture(Path directory) {
        this.catalogue = directory.resolve("relics.json");
    }

    /** One relic in one state. Rewards are {@code itemName, chance} pairs. */
    TierListFixture relic(String tier, String name, String state, String... itemsAndChances) {
        ObjectNode relic = relics.addObject();
        relic.put("tier", tier);
        relic.put("relicName", name);
        relic.put("state", state);

        ArrayNode rewards = relic.putArray("rewards");
        for (int i = 0; i < itemsAndChances.length; i += 2) {
            ObjectNode reward = rewards.addObject();
            reward.put("_id", tier + name + i);
            reward.put("itemName", itemsAndChances[i]);
            reward.put("rarity", "Common");
            reward.put("chance", itemsAndChances[i + 1]);
        }
        return this;
    }

    /** The same six drops Intact and Radiant, at the chances the game uses. */
    TierListFixture bothStates(String tier, String name, String... items) {
        String[] intactChances = {"25.33", "25.33", "25.33", "11", "11", "2"};
        String[] radiantChances = {"16.67", "16.67", "16.67", "20", "20", "10"};

        relic(tier, name, "Intact", interleave(items, intactChances));
        relic(tier, name, "Radiant", interleave(items, radiantChances));
        return this;
    }

    private static String[] interleave(String[] items, String[] chances) {
        List<String> pairs = new ArrayList<>();
        for (int i = 0; i < items.length; i++) {
            pairs.add(items[i]);
            pairs.add(chances[Math.min(i, chances.length - 1)]);
        }
        return pairs.toArray(String[]::new);
    }

    /**
     * A catalogue captured off the wire, added as it arrived.
     *
     * <p>The array is the body of {@code GET /api/relics}, which is also the
     * shape of the file the catalogue is read from — so a captured response can
     * be replayed without being reshaped by a test that would then be checking
     * its own reshaping.
     */
    TierListFixture catalogue(JsonNode relicsArray) {
        relicsArray.forEach(relics::add);
        return this;
    }

    /** The same, for a captured {@code POST /api/market/items}. */
    TierListFixture listings(JsonNode pricesArray) {
        for (JsonNode listing : pricesArray) {
            String name = listing.path("itemName").asText();
            JsonNode price = listing.path("averagePrice");
            JsonNode trend = listing.path("trend");

            price(name,
                    price.isNumber() ? price.asDouble() : null,
                    trend.isNumber() ? trend.asDouble() : null);
        }
        return this;
    }

    TierListFixture price(String itemName, Double platinum) {
        return price(itemName, platinum, null);
    }

    TierListFixture price(String itemName, Double platinum, Double trend) {
        if (platinum != null) prices.put(itemName, platinum);
        if (trend != null) trends.put(itemName, trend);
        return this;
    }

    TierListFixture relicPrice(String relicName, Double platinum) {
        relicPrices.put(relicName, platinum);
        return this;
    }

    /** Relics currently in the drop tables. Everything else is vaulted. */
    TierListFixture droppable(String... relicNames) {
        droppable.addAll(List.of(relicNames));
        return this;
    }

    /** What the market service reports about the age of the prices behind a ranking. */
    TierListFixture readAt(Instant newest, Instant earliestDue) {
        this.newest = newest;
        this.earliestDue = earliestDue;
        return this;
    }

    TierListService build() {
        try {
            ObjectNode root = mapper.createObjectNode();
            root.set("relics", relics);
            Files.writeString(catalogue, mapper.writeValueAsString(root));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }

        RelicMarketService market = mock(RelicMarketService.class);

        when(market.getItemPrices(anyList())).thenAnswer(call -> {
            List<String> names = call.getArgument(0);
            List<ItemPrice> out = new ArrayList<>();
            for (String name : names) {
                out.add(new ItemPrice(name, prices.get(name), null, null, trends.get(name),
                        null, null, null, null, null, null));
            }
            return out;
        });

        when(market.getRelicPrices(anyList())).thenAnswer(call -> {
            List<String> names = call.getArgument(0);
            List<RelicPrice> out = new ArrayList<>();
            for (String name : names) out.add(new RelicPrice(name, relicPrices.get(name), null));
            return out;
        });

        when(market.freshnessOf(anyCollection(), anyCollection())).thenAnswer(call -> {
            List<String> items = List.copyOf(call.getArgument(0, Collection.class));
            List<String> relicNames = List.copyOf(call.getArgument(1, Collection.class));

            return new RelicMarketService.Freshness(newest, earliestDue,
                    (int) items.stream().filter(prices::containsKey).count(),
                    (int) relicNames.stream().filter(name -> relicPrices.get(name) != null).count());
        });

        RelicVaultedService vaulted = mock(RelicVaultedService.class);
        when(vaulted.isVaulted(anyString()))
                .thenAnswer(call -> !droppable.contains(call.getArgument(0, String.class)));

        return new TierListService(new RelicLoadService(catalogue.toString()), market, vaulted);
    }

    /** The ranking of everything, best solo relic first — what a bare GET means. */
    TierListResponse rank() {
        return rank(TierListQuery.defaults());
    }

    TierListResponse rank(TierListQuery query) {
        try {
            return build().rank(query);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** The query a caller writes as {@code ?vault=…}, with everything else default. */
    static TierListQuery vault(TierListQuery.Vault vault) {
        TierListQuery defaults = TierListQuery.defaults();
        return new TierListQuery(vault, defaults.sort(), defaults.direction(), defaults.limit());
    }

    static TierListQuery sortedBy(TierListQuery.Sort sort, TierListQuery.Direction direction) {
        return new TierListQuery(TierListQuery.Vault.ALL, sort, direction, null);
    }

    /** Every row's relic name, in the order the ranking answered with. */
    static List<String> names(TierListResponse ranking) {
        return ranking.rows().stream().map(TierListRow::relic).toList();
    }

    static Map<String, TierListRow> byName(TierListResponse ranking) {
        Map<String, TierListRow> rows = new HashMap<>();
        for (TierListRow row : ranking.rows()) rows.put(row.relic(), row);
        return rows;
    }
}
