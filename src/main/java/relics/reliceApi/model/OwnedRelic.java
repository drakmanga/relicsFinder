package relics.reliceApi.model;

/**
 * Some copies of one relic, in one refinement, that the player is holding.
 *
 * <p>Relic and refinement together are the identity: Neo N16 Intact and Neo
 * N16 Radiant are two entries with two quantities, because a relic is refined
 * one copy at a time and the two pay differently.
 *
 * <p>A record with nothing about where the entry came from, on purpose: an
 * importer (a CSV, AlecaFrame) would produce the same three fields and replace
 * the list through the same endpoint, so adding one later needs no change here.
 *
 * @param relicName  full name, tier included: "Neo N16"
 * @param refinement intact, exceptional, flawless or radiant
 */
public record OwnedRelic(String relicName, String refinement, int quantity) {}
