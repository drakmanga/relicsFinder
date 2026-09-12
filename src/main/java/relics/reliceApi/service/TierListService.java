package relics.reliceApi.service;

import org.springframework.stereotype.Service;
import relics.reliceApi.model.ItemPrice;
import relics.reliceApi.model.Relic;
import relics.reliceApi.model.RelicPrice;
import relics.reliceApi.model.Rewards;
import relics.reliceApi.model.TierBand;
import relics.reliceApi.model.TierListQuery;
import relics.reliceApi.model.TierListResponse;
import relics.reliceApi.model.TierListRow;
import relics.reliceApi.model.TierTrend;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Every relic ranked twice: solo and radshare.
 *
 * <p>The two columns are fixed at "solo, Intact" and "radshare, Radiant"
 * because those are the two ways relics are actually opened, and pairing each
 * play pattern with the refinement it uses is what makes the ranking worth
 * building: the two columns share 4 of their top 20, the median relic moves 111
 * places between them, and 59% of the catalogue lands in a different band
 * depending on which column is read. Solo does not refine — a hundred void
 * traces per run is a cost a solo player is not paying to open a Lith relic —
 * and a radshare has spent them before anyone looks at the reward screen.
 *
 * <p>The population, and therefore both medians, is whatever the vault filter
 * leaves. Ranking the farmable relics against the whole catalogue would put
 * essentially all of them in D or F: only 34 of 772 relics are currently
 * dropping and they cluster at the bottom, so "which of the relics I can still
 * farm is worth farming" — the actual question — would come back as "none of
 * them".
 *
 * <p>The owned-parts list is deliberately not a parameter. A duplicate still
 * sells, so a part already in the foundry does not make the relic that drops it
 * worth less; and a ranking personalised per reader cannot be shared through a
 * URL, which is how every screen in this application is handed over.
 *
 * <p>This used to run in the browser, in {@code apps/web/src/lib/tierList.ts},
 * and it runs here now so that the screen and {@code GET /api/tiers} cannot
 * disagree. Everything below that reads like an argument rather than a step is
 * why: those arguments came with the arithmetic they defend, because a decision
 * about the bands applied on one side only would break the agreement between
 * the API and the screen with no test failing.
 */
@Service
public class TierListService {

    /**
     * Where each band starts, as a multiple of the population's median.
     *
     * <p>Multiples rather than percentiles, and that is the whole design.
     * Percentiles would guarantee a fixed slice of the catalogue per letter,
     * which sounds fairer and is not: over thirty days the median relic moves 43
     * places on a 0.39p change, because 327 relics are packed between 4p and 6p.
     * A percentile band cuts straight through that crowd, so a relic crosses a
     * letter boundary on noise nobody could act on. A multiple of the median is
     * anchored to what the relics are worth rather than to how many of them
     * there are, so a 0.39p wobble moves a relic by 0.39p and it stays where it
     * was.
     *
     * <p>The consequence is that the bands are not even, and band C — 0.8x to
     * 1.2x the median — holds roughly 45% of the catalogue. That is the honest
     * answer rather than a bug to be tuned away: nearly half the relics really
     * are worth about what the median relic is worth, and a scheme that spread
     * them across four letters would be inventing differences to fill the
     * letters with.
     *
     * <p>Descending, and read in order by {@link #bandFor}, so the first band a
     * value clears is its band. Adding one means putting it in the right place
     * here and nowhere else.
     */
    static final List<Band> BANDS = List.of(
            new Band(TierBand.S, 2),
            new Band(TierBand.A, 1.5),
            new Band(TierBand.B, 1.2),
            new Band(TierBand.C, 0.8),
            new Band(TierBand.D, 0.6));

    /** Below the last of {@link #BANDS}. It has no multiple: it is what is left. */
    static final TierBand LOWEST_BAND = TierBand.F;

    record Band(TierBand letter, double minMultiple) {}

    /**
     * The squad a radshare is: four players, four relics, one reward kept.
     *
     * <p>Four rather than a number the caller picks, because this column is a
     * fixed comparison against the solo one and not a calculator — the Relics
     * view already answers "what about a squad of three". Two fixed columns is
     * the point: solo and squad-of-4 share only 11 of their top 20, with a
     * median rank shift of 53 places and a maximum of 376, so a single blended
     * number would be wrong for both ways of playing.
     *
     * <p>It is reported on the response rather than accepted on the request for
     * a reason of this endpoint's own: a median is only meaningful within its
     * own column, so letters computed at two different squad sizes cannot be
     * compared with each other, and a parameter would invite exactly that.
     */
    static final int RADSHARE_PLAYERS = 4;

    /**
     * How far the expected value must have moved over ninety days to be worth
     * reporting as a movement.
     *
     * <p>Ten percent for the same reason the bands are multiples: below it the
     * number would be reporting the noise of a thin market, and a movement on
     * every row points at nothing. Inclusive — a relic exactly ten percent up
     * has cleared the bar — matching the bands, which are inclusive at their
     * lower edge too.
     */
    static final double TREND_ARROW_THRESHOLD = 10;

    /** The two states this ranking reads, collected per relic. */
    private record RelicStates(String era, List<Rewards> intact, List<Rewards> radiant) {}

    /** A row before it has a letter: the median it needs does not exist yet. */
    private record Unranked(String relic, String era, double soloValue, double radshareValue,
                            Double relicPrice, TierTrend trend, Double trendPercent) {}

    private final RelicLoadService relics;
    private final RelicMarketService market;
    private final RelicVaultedService vaulted;

    public TierListService(RelicLoadService relics, RelicMarketService market,
                           RelicVaultedService vaulted) {
        this.relics = relics;
        this.market = market;
        this.vaulted = vaulted;
    }

    /**
     * The ranking, for one population, in one order.
     *
     * @throws IOException when the relic catalogue cannot be read — there is no
     *                     ranking without it, and an empty one would read as a
     *                     catalogue with no relics in it
     */
    public TierListResponse rank(TierListQuery query) throws IOException {
        Map<String, RelicStates> population = population(query.vault());

        List<String> itemNames = itemNames(population);
        List<String> relicNames = List.copyOf(population.keySet());

        Map<String, ItemPrice> listings = listings(itemNames);
        Map<String, Double> prices = pricesOf(listings);
        Map<String, Double> baseline = ninetyDayBaseline(listings);
        Map<String, Double> relicPrices = relicPrices(relicNames);

        List<Unranked> unranked = new ArrayList<>(population.size());
        for (Map.Entry<String, RelicStates> entry : population.entrySet()) {
            unranked.add(rowFor(entry.getKey(), entry.getValue(), prices, baseline, listings,
                    relicPrices));
        }

        // After the vault filter and before the letters: the median is a fact
        // about the population being ranked, and computing it earlier would rank
        // these relics against relics the caller excluded.
        Double soloMedian = medianOf(unranked.stream().map(Unranked::soloValue).toList());
        Double radshareMedian = medianOf(unranked.stream().map(Unranked::radshareValue).toList());

        List<TierListRow> rows = new ArrayList<>(unranked.size());
        for (Unranked row : unranked) {
            rows.add(new TierListRow(
                    row.relic(),
                    row.era(),
                    row.soloValue(),
                    row.radshareValue(),
                    bandFor(row.soloValue(), soloMedian),
                    bandFor(row.radshareValue(), radshareMedian),
                    row.relicPrice(),
                    row.trend(),
                    row.trendPercent()));
        }

        rows.sort(comparator(query.sort(), query.direction()));
        List<TierListRow> cut = query.limit() == null
                ? List.copyOf(rows)
                : List.copyOf(rows.subList(0, Math.min(query.limit(), rows.size())));

        RelicMarketService.Freshness freshness = market.freshnessOf(itemNames, relicNames);

        return new TierListResponse(
                TierListResponse.VERSION,
                TierListQuery.wire(query.vault()),
                TierListQuery.wire(query.sort()),
                TierListQuery.wire(query.direction()),
                RADSHARE_PLAYERS,
                rows.size(),
                soloMedian,
                radshareMedian,
                instantOrNull(freshness.newest()),
                instantOrNull(freshness.earliestDue()),
                new TierListResponse.Coverage(
                        itemNames.size(), freshness.itemsPriced(),
                        relicNames.size(), freshness.relicsPriced()),
                cut);
    }

    /**
     * The relics being ranked, each with the two states the columns read.
     *
     * <p>Keyed by full name, so a relic the catalogue carries in four
     * refinements is one row. The other two states are dropped here rather than
     * ignored later: nothing downstream has a use for a relic that exists only
     * as Exceptional or Flawless, and keeping it would give it a row with two
     * empty columns.
     */
    private Map<String, RelicStates> population(TierListQuery.Vault vault) throws IOException {
        Map<String, RelicStates> states = new LinkedHashMap<>();

        for (Relic relic : relics.loadRelicsWithCheckData()) {
            String refinement = relic.getState() == null
                    ? "" : relic.getState().toLowerCase(Locale.ROOT);
            if (!refinement.equals("intact") && !refinement.equals("radiant")) continue;

            String fullName = fullNameOf(relic);
            if (!inPopulation(fullName, vault)) continue;

            RelicStates entry = states.computeIfAbsent(fullName,
                    name -> new RelicStates(relic.getTier(), new ArrayList<>(), new ArrayList<>()));

            List<Rewards> into = refinement.equals("intact") ? entry.intact() : entry.radiant();
            into.clear();
            if (relic.getRewards() != null) into.addAll(relic.getRewards());
        }

        return states;
    }

    /**
     * Whether the relic is in the population the caller asked for.
     *
     * <p>{@code ALL} does not consult the drop tables at all, which is not only
     * a short cut: the drop tables are fetched and cached separately, and a
     * caller who did not ask about the vault must not be handed a 502's worth of
     * "nothing is droppable" as a ranking.
     */
    private boolean inPopulation(String fullName, TierListQuery.Vault vault) {
        if (vault == TierListQuery.Vault.ALL) return true;

        boolean droppable = !vaulted.isVaulted(fullName);
        return droppable == (vault == TierListQuery.Vault.FARMABLE);
    }

    /** {@code "Axi"} and {@code "A1"} are kept apart in the catalogue and joined here. */
    private static String fullNameOf(Relic relic) {
        String tier = relic.getTier();
        return tier == null || tier.isBlank()
                ? relic.getRelicName()
                : tier + " " + relic.getRelicName();
    }

    /**
     * Every distinct part the ranked relics drop.
     *
     * <p>Both states, not only Intact. The six items are the same in each
     * refinement and only the chances move, so this is the same list either way
     * — but reading both is what makes that a fact about the data rather than an
     * assumption about it, and a relic the catalogue carries only as Radiant
     * would otherwise contribute no parts to price.
     */
    private static List<String> itemNames(Map<String, RelicStates> population) {
        List<String> names = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (RelicStates states : population.values()) {
            for (List<Rewards> rewards : List.of(states.intact(), states.radiant())) {
                for (Rewards reward : rewards) {
                    if (reward.getItemName() != null && seen.add(reward.getItemName())) {
                        names.add(reward.getItemName());
                    }
                }
            }
        }

        return names;
    }

    /**
     * What the market holds for each part, by name.
     *
     * <p>Goes through the same batch the browser's own price table calls, which
     * queues whatever is missing and answers at once with nulls for it. So a
     * ranking asked for on a cold instance is built on the prices that have
     * arrived, reports how many that was, and is worth more the next time it is
     * asked for — rather than holding the response open for the minutes a cold
     * catalogue takes.
     */
    private Map<String, ItemPrice> listings(List<String> itemNames) {
        Map<String, ItemPrice> byName = new HashMap<>();
        for (ItemPrice price : market.getItemPrices(itemNames)) byName.put(price.getItemName(), price);
        return byName;
    }

    private static Map<String, Double> pricesOf(Map<String, ItemPrice> listings) {
        Map<String, Double> prices = new HashMap<>();
        listings.forEach((name, listing) -> {
            if (listing.getAveragePrice() != null) prices.put(name, listing.getAveragePrice());
        });
        return prices;
    }

    private Map<String, Double> relicPrices(List<String> relicNames) {
        Map<String, Double> prices = new HashMap<>();
        for (RelicPrice price : market.getRelicPrices(relicNames)) {
            if (price.getAveragePrice() != null) prices.put(price.getRelicName(), price.getAveragePrice());
        }
        return prices;
    }

    /**
     * The same prices as they stood ninety days ago.
     *
     * <p>{@code ItemPrice.trend} is the percent the price stands at against its
     * ninety-day average, so the average it is measured against is
     * {@code price / (1 + trend/100)}. Rebuilt once per request rather than per
     * relic: 596 parts are cheaper to re-price once than to re-derive six at a
     * time across 772 relics.
     *
     * <p>A part with no trend keeps its current price as its own baseline.
     * Dropping it instead would compare a five-drop relic against a six-drop one
     * and report the missing drop as a price movement, which is the one thing
     * this number must not do. A trend of exactly -100 — the price is nothing
     * against its average — would divide by zero, and gets the same treatment
     * for the same reason.
     */
    static Map<String, Double> ninetyDayBaseline(Map<String, ItemPrice> listings) {
        Map<String, Double> baseline = new HashMap<>();

        listings.forEach((name, listing) -> {
            if (listing.getAveragePrice() == null) return;

            double factor = 1 + (listing.getTrend() == null ? 0 : listing.getTrend()) / 100;
            baseline.put(name, factor == 0
                    ? listing.getAveragePrice()
                    : listing.getAveragePrice() / factor);
        });

        return baseline;
    }

    private Unranked rowFor(String fullName, RelicStates states, Map<String, Double> prices,
                            Map<String, Double> baseline, Map<String, ItemPrice> listings,
                            Map<String, Double> relicPrices) {

        double soloValue = RelicValue.expected(states.intact(), prices);

        // The hundred void traces a Radiant costs are deliberately NOT
        // subtracted here, and this is a known limit rather than an oversight.
        // Traces have no market price, so converting them to platinum would mean
        // inventing an exchange rate and letting an invented number decide a
        // letter — the same mistake that keeps the relic's own price out of the
        // ranking. The column reads as gross value, and the reader supplies the
        // trace cost.
        double radshareValue = RelicValue.squad(states.radiant(), prices, RADSHARE_PLAYERS);

        // The listing's ninety-day trade count is deliberately left unread here.
        // It fed a "worth selling instead of opening" verdict that shipped and
        // was taken back out: relics are acquired at roughly five platinum for
        // six of any tier, so nobody holding one is choosing between selling it
        // at market and opening it, and the gate was answering a question the
        // reader never asks. It stays on the wire of /api/market/relics for the
        // price curve that is still to come; it is not an input to a verdict
        // again.
        Double relicPrice = relicPrices.get(fullName);

        // One movement per row, on the solo expected value. Both columns move
        // with the same six prices, so a second one would say very nearly the
        // same thing twice.
        //
        // "Some drop was measured" has to be asked separately from the two
        // values, and that is the whole reason this argument exists: the
        // baseline gives a part with no trend its own current price, so a relic
        // whose six drops all lack one arrives with today and ninety days ago
        // identical and computes a movement of exactly zero — out of six prices
        // nothing was ever compared against.
        boolean measured = states.intact().stream().anyMatch(reward -> {
            ItemPrice listing = listings.get(reward.getItemName());
            return listing != null && listing.getTrend() != null;
        });

        double ninetyDaysAgo = RelicValue.expected(states.intact(), baseline);

        Trend trend = trendBetween(soloValue, ninetyDaysAgo, measured);

        return new Unranked(fullName, states.era(), soloValue, radshareValue, relicPrice,
                trend.state(), trend.percent());
    }

    /** A movement, or the reason there is no number. The percent is null unless moved. */
    record Trend(TierTrend state, Double percent) {}

    /**
     * The movement between two expected values, reported only once it is worth
     * reporting.
     *
     * <p>{@code measured} is what separates a relic holding still from a relic
     * nobody has measured, and it cannot be read off the two numbers — see
     * {@link #ninetyDayBaseline}, which gives a part with no trend its own
     * current price on purpose.
     *
     * <p>Multiplied before it is divided, which is not cosmetic: the other
     * association divides first and hands the gate a number a rounding step off
     * the threshold, so a relic sitting exactly on ten percent lands on
     * whichever side the last bit fell. This way it lands on ten.
     */
    static Trend trendBetween(double today, double ninetyDaysAgo, boolean measured) {
        if (!measured || ninetyDaysAgo <= 0) return new Trend(TierTrend.NO_BASELINE, null);

        double percent = (today - ninetyDaysAgo) * 100 / ninetyDaysAgo;

        return Math.abs(percent) >= TREND_ARROW_THRESHOLD
                ? new Trend(TierTrend.MOVED, percent)
                : new Trend(TierTrend.STEADY, null);
    }

    /**
     * The middle value of a population.
     *
     * <p>Written out rather than pulled in, because it is four lines and the two
     * decisions in it are ones a dependency would make silently.
     *
     * <p>Even-length populations take the mean of the two middle values, the
     * ordinary definition. Picking the lower of the pair would have been
     * defensible on a catalogue this crowded — half the relics sit within a
     * platinum of each other, so the two middles are usually the same number
     * anyway — but it biases every band boundary downwards by half a gap, and a
     * boundary that moves with the parity of the row count is a boundary nobody
     * can reason about.
     *
     * <p>An empty population has no median at all, and null says so. Zero would
     * be a claim about the relics, and the letters computed from it would rank
     * every relic S: a value of zero clears two times zero.
     */
    static Double medianOf(List<Double> values) {
        if (values.isEmpty()) return null;

        List<Double> sorted = values.stream().sorted().toList();
        int middle = sorted.size() / 2;

        return sorted.size() % 2 == 1
                ? sorted.get(middle)
                : (sorted.get(middle - 1) + sorted.get(middle)) / 2;
    }

    /**
     * The band a value falls in, given the median of the population it belongs
     * to.
     *
     * <p>Boundaries are inclusive at the bottom: exactly twice the median is S,
     * not A. The bands have to partition the range with no gap and no overlap,
     * so each one owns its own lower edge and the value is compared once,
     * against the first band it clears.
     *
     * <p>Null rather than F when there is no median, or when the median is zero.
     * That happens for real: before the price cache fills every expected value
     * is zero, and a population where the middle relic is worth nothing gives
     * every multiple the same boundary — zero — so every relic would be handed
     * an S. No median, no letter.
     */
    static TierBand bandFor(double value, Double median) {
        if (median == null || median <= 0) return null;

        for (Band band : BANDS) {
            if (value >= band.minMultiple() * median) return band.letter();
        }
        return LOWEST_BAND;
    }

    /**
     * The order the rows come back in.
     *
     * <p>Ties keep the name order, which is not a detail: 327 relics sit between
     * 4p and 6p, so on the value columns the tie is the normal case rather than
     * the edge one, and a ranking whose ties fell in hash order would come back
     * shuffled between two identical requests.
     */
    private static Comparator<TierListRow> comparator(TierListQuery.Sort sort,
                                                      TierListQuery.Direction direction) {
        Comparator<TierListRow> byName =
                Comparator.comparing(TierListRow::relic, TierListService::compareNaturally);

        if (sort == TierListQuery.Sort.RELIC) {
            return direction == TierListQuery.Direction.ASC ? byName : byName.reversed();
        }

        Comparator<Double> byNumber = direction == TierListQuery.Direction.ASC
                ? Comparator.<Double>naturalOrder()
                : Comparator.<Double>reverseOrder();

        // A relic nobody has listed sinks below every relic that has a number,
        // whichever way the column points — it is unknown, not worthless. Only
        // the relic price can be absent; the two expected values are computed
        // from whatever prices exist and are a number even when that is zero.
        Comparator<TierListRow> byValue =
                Comparator.comparing(valueOf(sort), Comparator.nullsLast(byNumber));

        return byValue.thenComparing(byName);
    }

    private static Function<TierListRow, Double> valueOf(TierListQuery.Sort sort) {
        return switch (sort) {
            case SOLO -> TierListRow::soloValue;
            case RADSHARE -> TierListRow::radshareValue;
            case PRICE -> TierListRow::relicPrice;
            case RELIC -> throw new IllegalStateException("the name column is not a value");
        };
    }

    /**
     * Relic names in the order a reader expects: Axi A2 before Axi A10.
     *
     * <p>Plain string order puts A10 between A1 and A2, because it compares the
     * digits one character at a time. The browser asks for the same thing with
     * {@code localeCompare(…, { numeric: true })} and has since the catalogue's
     * first table, so a ranking sorted any other way would come back in a
     * different order from the one the screen shows.
     */
    static int compareNaturally(String left, String right) {
        int i = 0;
        int j = 0;

        while (i < left.length() && j < right.length()) {
            char a = left.charAt(i);
            char b = right.charAt(j);

            if (Character.isDigit(a) && Character.isDigit(b)) {
                int endA = digitsEnd(left, i);
                int endB = digitsEnd(right, j);

                // Compared as numbers, and leading zeroes are why the length is
                // read off the trimmed run rather than the raw one.
                String numberA = left.substring(i, endA).replaceFirst("^0+(?=.)", "");
                String numberB = right.substring(j, endB).replaceFirst("^0+(?=.)", "");

                if (numberA.length() != numberB.length()) {
                    return Integer.compare(numberA.length(), numberB.length());
                }
                int digits = numberA.compareTo(numberB);
                if (digits != 0) return digits;

                i = endA;
                j = endB;
                continue;
            }

            int letters = Character.compare(Character.toLowerCase(a), Character.toLowerCase(b));
            if (letters != 0) return letters;

            i++;
            j++;
        }

        return Integer.compare(left.length() - i, right.length() - j);
    }

    private static int digitsEnd(String value, int from) {
        int end = from;
        while (end < value.length() && Character.isDigit(value.charAt(end))) end++;
        return end;
    }

    private static String instantOrNull(Instant instant) {
        return instant == null ? null : instant.toString();
    }
}
