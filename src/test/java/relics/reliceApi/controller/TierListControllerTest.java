package relics.reliceApi.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.context.request.ServletWebRequest;
import relics.reliceApi.model.TierBand;
import relics.reliceApi.model.TierListQuery;
import relics.reliceApi.model.TierListResponse;
import relics.reliceApi.model.TierListRow;
import relics.reliceApi.model.TierTrend;
import relics.reliceApi.service.TierListService;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * What the endpoint accepts, what it refuses, and how long it says an answer is
 * good for.
 *
 * <p>No Spring context: the controller parses, calls one service and sets two
 * headers, so standing up the application to watch it do that would be testing
 * the framework.
 */
class TierListControllerTest {

    private final TierListService service = mock(TierListService.class);
    private final TierListController controller = new TierListController(service);

    private TierListResponse ranking(String nextUpdateAt) {
        return ranking(nextUpdateAt, null, List.of());
    }

    private TierListResponse ranking(String nextUpdateAt, String asOf, List<TierListRow> rows) {
        return new TierListResponse(TierListResponse.VERSION, "all", "solo", "desc", 4, rows.size(),
                null, null, asOf, nextUpdateAt,
                new TierListResponse.Coverage(0, 0, 0, 0), rows);
    }

    private static TierListRow row(double soloValue) {
        return new TierListRow("Lith V9", "Lith", soloValue, soloValue * 3,
                TierBand.C, TierBand.C, null, TierTrend.STEADY, null);
    }

    /** A request carrying no conditions, and its own response to write a 304 into. */
    private static ServletWebRequest bare() {
        return new ServletWebRequest(get(), new MockHttpServletResponse());
    }

    private static ServletWebRequest holding(String etag) {
        MockHttpServletRequest request = get();
        request.addHeader("If-None-Match", etag);
        return new ServletWebRequest(request, new MockHttpServletResponse());
    }

    /**
     * The method is set explicitly: a mock request carries none, and an
     * If-None-Match on anything but a GET or a HEAD is a precondition rather
     * than a cache question — which Spring answers 412 to, as it should.
     */
    private static MockHttpServletRequest get() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("GET");
        return request;
    }

    private ResponseEntity<?> call(String vault, String sort, String order, Integer limit)
            throws IOException {
        when(service.rank(any())).thenReturn(ranking(null));
        return controller.tierList(vault, sort, order, limit, bare());
    }

    @Test
    void refusesASpellingThisApplicationDoesNotUse() throws IOException {
        ResponseEntity<?> response = call("unvaulted", null, null, null);

        // A 200 carrying the whole catalogue would hide the caller's typo behind
        // a ranking that looks plausible, so the answer says which parameter was
        // wrong and what it accepts.
        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().toString())
                .contains("vault", "all, farmable, vaulted", "unvaulted");
    }

    @Test
    void refusesASortColumnThatIsNotOnTheTable() throws IOException {
        assertThat(call(null, "ducats", null, null).getStatusCode().value()).isEqualTo(400);
        assertThat(call(null, null, "sideways", null).getStatusCode().value()).isEqualTo(400);
    }

    @Test
    void refusesALimitThatCouldNotCutAnything() throws IOException {
        assertThat(call(null, null, null, 0).getStatusCode().value()).isEqualTo(400);
        assertThat(call(null, null, null, -5).getStatusCode().value()).isEqualTo(400);
    }

    @Test
    void answersABareRequestWithTheWholeCatalogueBestRelicFirst() throws IOException {
        assertThat(call(null, null, null, null).getStatusCode().value()).isEqualTo(200);

        TierListQuery defaults = TierListQuery.defaults();
        assertThat(defaults.vault()).isEqualTo(TierListQuery.Vault.ALL);
        assertThat(defaults.sort()).isEqualTo(TierListQuery.Sort.SOLO);
        assertThat(defaults.direction()).isEqualTo(TierListQuery.Direction.DESC);
        assertThat(defaults.limit()).isNull();
    }

    @Test
    void pointsTheNameColumnAtAnAlphabetAndTheValueColumnsAtTheBest() {
        assertThat(TierListQuery.Sort.RELIC.defaultDirection())
                .isEqualTo(TierListQuery.Direction.ASC);
        assertThat(TierListQuery.Sort.PRICE.defaultDirection())
                .isEqualTo(TierListQuery.Direction.DESC);
    }

    @Test
    void tellsACallerToHoldTheAnswerUntilItCanFirstDiffer() {
        Duration held = TierListController.holdFor(
                Instant.now().plus(Duration.ofMinutes(20)).toString());

        assertThat(held).isBetween(Duration.ofMinutes(19), Duration.ofMinutes(20));
    }

    @Test
    void tellsNobodyToHoldARankingThatIsAlreadyFreeToChange() {
        // Overdue, and never read at all. Both are "at any moment now", and a
        // caller told to hold it would be told to ignore the change.
        assertThat(TierListController.holdFor(
                Instant.now().minus(Duration.ofMinutes(5)).toString())).isZero();
        assertThat(TierListController.holdFor(null)).isZero();
    }

    @Test
    void answersACallerThatAlreadyHasThisRankingWithNothing() throws IOException {
        List<TierListRow> rows = List.of(row(10));
        when(service.rank(any())).thenReturn(ranking(null, "2026-09-12T10:00:00Z", rows));

        String tag = TierListController.rankingTag(ranking(null, "2026-09-12T10:00:00Z", rows));
        ServletWebRequest second = holding(tag);

        assertThat(controller.tierList(null, null, null, null, second)).isNull();
        assertThat(second.getResponse().getStatus()).isEqualTo(304);
    }

    @Test
    void keepsTheSameTagForARankingWhosePricesWereOnlyReReRead() {
        // The measured defect: the rolling refresh re-reads one price every five
        // seconds and most re-reads come back with the number they had, so a tag
        // that followed asOf handed a poller a fresh 200 every minute for rows
        // that had not moved.
        List<TierListRow> rows = List.of(row(10));

        assertThat(TierListController.rankingTag(ranking(null, "2026-09-12T10:00:00Z", rows)))
                .isEqualTo(TierListController.rankingTag(
                        ranking("2026-09-12T14:00:00Z", "2026-09-12T10:05:00Z", rows)));
    }

    @Test
    void changesTheTagWhenAnyNumberInTheRankingMoves() {
        assertThat(TierListController.rankingTag(ranking(null, null, List.of(row(10)))))
                .isNotEqualTo(TierListController.rankingTag(ranking(null, null, List.of(row(10.5)))));
    }

    @Test
    void capsTheHoldAtTheIntervalTheHeadOfTheRankingIsReRead() {
        // Some prices earn an interval of a day, and a ranking nobody re-reads
        // for a day is a ranking of yesterday's market.
        Duration held = TierListController.holdFor(
                Instant.now().plus(Duration.ofDays(1)).toString());

        assertThat(held).isEqualTo(Duration.ofHours(1));
    }
}
