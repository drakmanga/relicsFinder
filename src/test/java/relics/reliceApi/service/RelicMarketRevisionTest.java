package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import relics.reliceApi.service.RelicMarketService.Cached;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * What counts as news for a tab that is already open.
 *
 * <p>The revision on {@code /api/market/status} is the whole of the last hop:
 * the browser stops polling for prices once the batch is complete, so something
 * has to tell it there is a reason to come back. Every read that moves this
 * number costs an open tab a batch of six hundred prices, which is why it is
 * counted on the price rather than on the read.
 */
class RelicMarketRevisionTest {

    private static final Instant NOW = Instant.parse("2026-08-30T18:00:00Z");

    private static Cached priced(Double avg) {
        return new Cached(avg, avg, 20, null, List.of(), NOW, false);
    }

    private static Cached failed() {
        return new Cached(null, null, null, null, List.of(), NOW, true);
    }

    @Test
    void theFirstPriceForAnItemIsTheBiggestChangeThereIs() {
        // A skeleton becoming a figure. Nothing else on a screen changes more.
        assertThat(RelicMarketService.changedPrice(null, priced(12.0))).isTrue();
    }

    @Test
    void aReadingIdenticalToTheOneItReplacesIsNotNews() {
        // The reason this is counted on the price: the sweep re-reads on its
        // own schedule and most of what it brings back is the number that was
        // already there. Waking every open tab for it would spend a batch of
        // six hundred prices to redraw the same table.
        assertThat(RelicMarketService.changedPrice(priced(12.0), priced(12.0))).isFalse();
        assertThat(RelicMarketService.changedPrice(priced(12.0), priced(12.5))).isTrue();
    }

    @Test
    void aMarketThatDidNotAnswerChangesNothing() {
        // In either direction. A failure says nothing about the item, and the
        // recovery from one is not a price move either — it is the same price
        // arriving again.
        assertThat(RelicMarketService.changedPrice(priced(12.0), failed())).isFalse();
        assertThat(RelicMarketService.changedPrice(failed(), priced(12.0))).isTrue();
        assertThat(RelicMarketService.changedPrice(failed(), failed())).isFalse();
    }

    @Test
    void anItemNobodySellsNeverWakesAnything() {
        // Forma has no price and will not grow one. Re-read every day for as
        // long as the app runs, and never once worth a redraw.
        assertThat(RelicMarketService.changedPrice(priced(null), priced(null))).isFalse();
        assertThat(RelicMarketService.changedPrice(null, priced(null))).isFalse();
    }
}
