package relics.reliceApi.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import relics.reliceApi.service.TierListService;
import relics.reliceApi.model.TierListQuery;
import relics.reliceApi.model.TierListResponse;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * The relic ranking, as data.
 *
 * <p>The same numbers the Tier List tab shows, from the same service: a squad
 * spreadsheet, a bot or a script that checks the top twenty before a farming
 * session reads them here instead of scraping a screen.
 *
 * <p>Thin, like the controllers around it. Everything below is parsing, one
 * call, and the two HTTP facts a poller needs — what this may be cached for,
 * and whether it has changed.
 */
@RestController
@RequestMapping("/api/tiers")
// The caller is a script or another tool on the same machine, reaching this
// from its own origin or from none. Relic Finder is not a hosted service —
// every user runs their own instance, and there is nothing here to protect a
// session against: the whole application is unauthenticated by design, so a
// browser refusing to read a public ranking would cost the caller and buy
// nobody anything. Reads only: no other verb is mapped.
@CrossOrigin(origins = "*", methods = RequestMethod.GET)
public class TierListController {

    /**
     * The longest a caller is told to hold a ranking.
     *
     * <p>The response carries {@code nextUpdateAt}, which is the real answer;
     * this is the ceiling under it, because that instant is computed from price
     * intervals that reach a day and a ranking nobody re-reads for a day is a
     * ranking of yesterday's market. An hour matches the shortest interval at
     * which any price behind the head of the ranking is re-read, so it is the
     * longest wait that cannot skip a change.
     */
    private static final Duration MAX_AGE = Duration.ofHours(1);

    private final TierListService tierListService;

    public TierListController(TierListService tierListService) {
        this.tierListService = tierListService;
    }

    /**
     * Every relic ranked twice, solo and in a radshare.
     *
     * @param vault which relics to rank: {@code all}, {@code farmable} or
     *              {@code vaulted}. It moves both medians with it, because the
     *              letters are bands around the median of the population asked
     *              for
     * @param sort  {@code solo}, {@code radshare}, {@code price} or
     *              {@code relic}
     * @param order {@code asc} or {@code desc}. Defaults to the direction the
     *              column is asked for in — best first on the three value
     *              columns, alphabetical on the name
     * @param limit how many rows to return. It cuts the response and never the
     *              population: the top twenty are still ranked against every
     *              relic the vault filter left
     */
    @GetMapping
    public ResponseEntity<?> tierList(
            @RequestParam(required = false) String vault,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String order,
            @RequestParam(required = false) Integer limit) throws IOException {

        TierListQuery query;
        try {
            query = parse(vault, sort, order, limit);
        } catch (IllegalArgumentException e) {
            // The caller wrote something this application does not spell that
            // way, and the answer says which parameter and what it accepts. A
            // 200 carrying the default population would hide the typo behind a
            // ranking that looks plausible.
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }

        TierListResponse ranking = tierListService.rank(query);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(holdFor(ranking.nextUpdateAt())))
                .body(ranking);
    }

    private static TierListQuery parse(String vault, String sort, String order, Integer limit) {
        TierListQuery.Sort column =
                TierListQuery.parse(sort, TierListQuery.Sort.class, "sort",
                        TierListQuery.defaults().sort());

        if (limit != null && limit < 1) {
            throw new IllegalArgumentException("limit must be at least 1, not " + limit);
        }

        return new TierListQuery(
                TierListQuery.parse(vault, TierListQuery.Vault.class, "vault",
                        TierListQuery.defaults().vault()),
                column,
                TierListQuery.parse(order, TierListQuery.Direction.class, "order",
                        column.defaultDirection()),
                limit);
    }

    /**
     * How long this answer may be held, from the moment it can first differ.
     *
     * <p>Zero when that moment has passed or when nothing has been priced yet:
     * the ranking is then free to change at any moment, and a caller told to
     * hold it would be told to ignore the change. A poller that ignores all of
     * this and asks every minute costs one comparison, because the ETag over the
     * body answers 304 for as long as the bytes are the same.
     */
    static Duration holdFor(String nextUpdateAt) {
        if (nextUpdateAt == null) return Duration.ZERO;

        Duration until = Duration.between(Instant.now(), Instant.parse(nextUpdateAt));
        if (until.isNegative()) return Duration.ZERO;

        return until.compareTo(MAX_AGE) > 0 ? MAX_AGE : until;
    }
}
