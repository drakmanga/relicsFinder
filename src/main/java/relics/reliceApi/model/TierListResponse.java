package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * The ranking, and everything needed to read it.
 *
 * <p>The medians are part of this rather than an internal, because the letters
 * are meaningless without them: "S is 2x the median" is a fact about a
 * population, and a consumer handed only letters cannot tell what an S is
 * worth. The screen states them under its own table for the same reason.
 *
 * <p>Every parameter the request could carry is echoed back — the population,
 * the column, its direction, the squad size the radshare column means. A
 * response that has travelled through a spreadsheet or a bot still says what it
 * is a ranking of.
 *
 * @param version         the contract, {@link #VERSION}. Fields may be added
 *                        without it changing; a field that is removed, renamed
 *                        or made to mean something else is what moves it. A
 *                        script that wants to be told rather than to discover
 *                        asserts this one integer
 * @param vault           which relics were ranked, and therefore what the
 *                        medians are of
 * @param sort            the column the rows are in
 * @param direction       which way that column runs
 * @param players         the squad size {@code radshareValue} is computed for.
 *                        Fixed, and reported rather than accepted: a median is
 *                        only meaningful within its own column, so two
 *                        responses computed at different squad sizes could not
 *                        have their letters compared. The Relics view is where
 *                        "what about a squad of three" is answered
 * @param population      how many relics the vault filter left. This is what
 *                        the medians and the bands were computed over, whatever
 *                        {@code limit} cut the rows down to
 * @param soloMedian      the middle solo value of that population, or null when
 *                        there is nothing to take a median of. Null, never zero:
 *                        zero would be a claim about the relics, and every band
 *                        computed from it would hand out an S
 * @param radshareMedian  the same for the radshare column
 * @param asOf            ISO instant of the most recent price reading behind
 *                        this ranking, or null before the first one lands
 * @param nextUpdateAt    ISO instant of the first moment any of those prices
 *                        becomes eligible to be read again. Before it the rows
 *                        cannot move, so a poller that asks earlier is asking
 *                        for bytes it already has. It is in the past when the
 *                        rolling refresh is behind — the honest way to say "at
 *                        any moment now" — and it says nothing about prices
 *                        that have not arrived at all, which is what
 *                        {@code prices} is for. Null before the first reading
 * @param prices          how much of what this ranking is built on has a price
 * @param rows            the ranking itself
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record TierListResponse(
        int version,
        String vault,
        String sort,
        String direction,
        int players,
        int population,
        Double soloMedian,
        Double radshareMedian,
        String asOf,
        String nextUpdateAt,
        Coverage prices,
        List<TierListRow> rows) {

    /** Bumped only by a change that takes something away or re-means it. */
    public static final int VERSION = 1;

    /**
     * How much of the market this ranking actually rests on.
     *
     * <p>A cold instance answers the same shape as a warm one, and a caller has
     * no way to tell the two apart from the rows: an unpriced drop counts as
     * zero, which understates a relic rather than inventing a value for it, so a
     * ranking built on a tenth of the catalogue looks exactly like a ranking of
     * relics nobody wants. These four numbers are the difference. While
     * {@code partsPriced} is below {@code parts} the prices are still arriving,
     * and the ranking can change sooner than {@code nextUpdateAt} says.
     *
     * @param parts        distinct Prime parts the ranked relics drop
     * @param partsPriced  how many of them the market has answered a price for
     * @param relics       relics in the population, each of which is also a
     *                     listing in its own right
     * @param relicsPriced how many of those listings have a price
     */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Coverage(int parts, int partsPriced, int relics, int relicsPriced) {}
}
