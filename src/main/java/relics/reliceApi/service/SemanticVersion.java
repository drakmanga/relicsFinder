package relics.reliceApi.service;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Three numbers and an optional suffix, ordered.
 *
 * <p>Everything the update check compares goes through here: the version in the
 * jar manifest, which may carry {@code -SNAPSHOT}, and the tag on a GitHub
 * release, which carries a leading {@code v}. Comparing those two as strings
 * says {@code "0.10.0" < "0.9.0"}, which is exactly the release nobody would be
 * told about.
 *
 * <p>A subset of semver rather than the whole grammar. Build metadata after
 * {@code +} is dropped because it is defined not to affect ordering, and two
 * pre-release suffixes are compared as plain text — enough to put
 * {@code 0.1.0-SNAPSHOT} before {@code 0.1.0}, which is the one pre-release
 * this project actually produces, and honest about being no more than that.
 */
public record SemanticVersion(int major, int minor, int patch, String preRelease)
        implements Comparable<SemanticVersion> {

    /** {@code v1.2.3}, {@code 1.2.3}, {@code 1.2.3-SNAPSHOT}, {@code 1.2.3+build}. */
    private static final Pattern SHAPE =
            Pattern.compile("^v?(\\d+)\\.(\\d+)\\.(\\d+)(?:-([0-9A-Za-z.-]+))?(?:\\+[0-9A-Za-z.-]+)?$");

    /** The version, or null when the text is not one — {@code "dev"} is the usual case. */
    public static SemanticVersion parse(String text) {
        if (text == null) return null;

        Matcher matcher = SHAPE.matcher(text.trim());
        if (!matcher.matches()) return null;

        return new SemanticVersion(
                Integer.parseInt(matcher.group(1)),
                Integer.parseInt(matcher.group(2)),
                Integer.parseInt(matcher.group(3)),
                matcher.group(4));
    }

    /**
     * Whether {@code candidate} is a version, {@code current} is a version, and
     * the first is newer than the second.
     *
     * <p>False when either side does not parse. An unknown version is not
     * evidence of being behind, and telling somebody to update on the strength
     * of a string nothing could read is worse than saying nothing.
     */
    public static boolean isNewer(String candidate, String current) {
        SemanticVersion newer = parse(candidate);
        SemanticVersion running = parse(current);
        if (newer == null || running == null) return false;

        return newer.compareTo(running) > 0;
    }

    @Override
    public int compareTo(SemanticVersion other) {
        int byNumbers = Integer.compare(major, other.major);
        if (byNumbers != 0) return byNumbers;

        byNumbers = Integer.compare(minor, other.minor);
        if (byNumbers != 0) return byNumbers;

        byNumbers = Integer.compare(patch, other.patch);
        if (byNumbers != 0) return byNumbers;

        // A release outranks any pre-release of the same three numbers, which is
        // what makes a working copy's 0.1.0-SNAPSHOT older than the 0.1.0 it is
        // working towards.
        if (preRelease == null && other.preRelease == null) return 0;
        if (preRelease == null) return 1;
        if (other.preRelease == null) return -1;

        return preRelease.toLowerCase(Locale.ROOT).compareTo(other.preRelease.toLowerCase(Locale.ROOT));
    }
}
