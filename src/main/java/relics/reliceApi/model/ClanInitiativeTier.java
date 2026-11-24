package relics.reliceApi.model;

/**
 * One threshold of a Clan Weekly Initiative: the clan's points that unlock it
 * and what it hands every member.
 *
 * @param points the clan's score that unlocks it (500, 1000, 1500, 2000)
 * @param reward the reward's internal name, last path segment only
 *               ("Kuva", "Forma", "DistillPoints"): the page names Kuva itself
 *               and has no table for the rest, which it does not show
 * @param count  how many of it
 * @param kuva   the Kuva it pays: {@code count} when the reward is Kuva, else 0
 */
public record ClanInitiativeTier(int points, String reward, int count, int kuva) {}
