package relics.reliceApi.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;
import relics.reliceApi.service.TierListService;
import relics.reliceApi.model.TierListQuery;
import relics.reliceApi.model.TierListResponse;
import relics.reliceApi.model.TierListRow;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
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
            @RequestParam(required = false) Integer limit,
            WebRequest request) throws IOException {

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
        String tag = rankingTag(ranking);

        // 304 and no body when the caller already has this ranking. Answered
        // here rather than by a filter over the rendered bytes, because two of
        // those bytes move on a beat of their own — see rankingTag.
        if (request.checkNotModified(tag)) return null;

        return ResponseEntity.ok()
                .eTag(tag)
                .cacheControl(CacheControl.maxAge(holdFor(ranking.nextUpdateAt())))
                .body(ranking);
    }

    /**
     * What identifies this ranking — deliberately not when it was read.
     *
     * <p>{@code asOf} and {@code nextUpdateAt} are excluded, and that exclusion
     * is the whole reason this exists rather than a filter hashing the response
     * body. The rolling refresh re-reads one price every five seconds, and most
     * re-reads come back with the number they came back with last time; {@code
     * asOf} follows every one of them regardless. Hashing it would hand a
     * different tag to a poller each minute for a ranking whose rows had not
     * moved — measured on a live instance, which is where this was found — and
     * the 304 that makes a tight polling loop free would never be reachable.
     *
     * <p>Everything a caller reads as the answer is in here: the parameters it
     * was ranked under, both medians, every row, and the coverage counts that
     * say how much of the market it rests on.
     */
    static String rankingTag(TierListResponse ranking) {
        StringBuilder canonical = new StringBuilder()
                .append(ranking.version()).append('|')
                .append(ranking.vault()).append('|')
                .append(ranking.sort()).append('|')
                .append(ranking.direction()).append('|')
                .append(ranking.players()).append('|')
                .append(ranking.population()).append('|')
                .append(ranking.soloMedian()).append('|')
                .append(ranking.radshareMedian()).append('|')
                .append(ranking.prices().parts()).append('|')
                .append(ranking.prices().partsPriced()).append('|')
                .append(ranking.prices().relics()).append('|')
                .append(ranking.prices().relicsPriced());

        for (TierListRow row : ranking.rows()) {
            canonical.append('\n')
                    .append(row.relic()).append(';')
                    .append(row.era()).append(';')
                    .append(row.soloValue()).append(';')
                    .append(row.radshareValue()).append(';')
                    .append(row.soloBand()).append(';')
                    .append(row.radshareBand()).append(';')
                    .append(row.relicPrice()).append(';')
                    .append(row.trend()).append(';')
                    .append(row.trendPercent());
        }

        return '"' + digestOf(canonical.toString()) + '"';
    }

    /**
     * A short digest of that text. SHA-256 because it is the one every JDK has;
     * nothing here is a security claim, only a name for a version of the rows.
     */
    private static String digestOf(String canonical) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash, 0, 16);
        } catch (NoSuchAlgorithmException e) {
            // Unreachable: every JDK carries SHA-256. Rethrown rather than
            // swallowed, because an ETag computed from something else would be
            // a cache key that lies.
            throw new IllegalStateException("SHA-256 is missing from this JVM", e);
        }
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
