package relics.reliceApi.model;

/**
 * A band letter. Six of them, and E is skipped.
 *
 * <p>E is missing because nobody reads it as a rank: the tier-list convention
 * the letters borrow from runs S A B C D F, and a reader who meets an E spends
 * the moment working out whether it sits above or below D. Five ranks plus a
 * floor is also as many distinctions as the underlying numbers can carry — see
 * {@code TierListService.BANDS} for why the boundaries have to be as wide as
 * they are, and for what each letter is a multiple of.
 *
 * <p>Serialised as the letter itself, which is what the enum constant already
 * is, so this one needs no {@code @JsonValue} the way {@link TrendGap} does.
 */
public enum TierBand {
    S, A, B, C, D, F
}
