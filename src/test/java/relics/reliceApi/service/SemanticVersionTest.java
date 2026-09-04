package relics.reliceApi.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The ordering the update notice is decided by.
 *
 * <p>The rule being defended: nobody is told to update unless a real release is
 * really newer than the build they are really running. Every way that can go
 * wrong is a way to nag somebody who is current, and a notice that cries wolf
 * once is a notice ignored afterwards.
 */
class SemanticVersionTest {

    @Test
    void readsThreeNumbersWithOrWithoutTheTagPrefix() {
        assertThat(SemanticVersion.parse("1.2.3")).isEqualTo(new SemanticVersion(1, 2, 3, null));
        assertThat(SemanticVersion.parse("v1.2.3")).isEqualTo(new SemanticVersion(1, 2, 3, null));
        assertThat(SemanticVersion.parse(" v0.1.0 ")).isEqualTo(new SemanticVersion(0, 1, 0, null));
    }

    @Test
    void keepsThePreReleaseSuffixAndDropsBuildMetadata() {
        assertThat(SemanticVersion.parse("0.1.0-SNAPSHOT"))
                .isEqualTo(new SemanticVersion(0, 1, 0, "SNAPSHOT"));
        assertThat(SemanticVersion.parse("0.1.0+build.7"))
                .isEqualTo(new SemanticVersion(0, 1, 0, null));
    }

    @Test
    void refusesWhatIsNotAVersion() {
        assertThat(SemanticVersion.parse(null)).isNull();
        assertThat(SemanticVersion.parse("dev")).isNull();
        assertThat(SemanticVersion.parse("1.2")).isNull();
        assertThat(SemanticVersion.parse("1.2.3.4")).isNull();
    }

    /** The one comparison a string comparison gets backwards. */
    @Test
    void ordersByNumberRatherThanByText() {
        assertThat(SemanticVersion.isNewer("0.10.0", "0.9.0")).isTrue();
        assertThat(SemanticVersion.isNewer("0.9.0", "0.10.0")).isFalse();
    }

    @Test
    void aReleaseIsNewerThanItsOwnPreRelease() {
        assertThat(SemanticVersion.isNewer("0.1.0", "0.1.0-SNAPSHOT")).isTrue();
        assertThat(SemanticVersion.isNewer("0.1.0-SNAPSHOT", "0.1.0")).isFalse();
    }

    @Test
    void theSameVersionIsNotAnUpdate() {
        assertThat(SemanticVersion.isNewer("1.4.2", "1.4.2")).isFalse();
        assertThat(SemanticVersion.isNewer("v1.4.2", "1.4.2")).isFalse();
    }

    /** A build that cannot say which version it is is never behind. */
    @Test
    void anUnreadableVersionOnEitherSideIsNotAnUpdate() {
        assertThat(SemanticVersion.isNewer("1.0.0", AppVersion.UNKNOWN)).isFalse();
        assertThat(SemanticVersion.isNewer("", "1.0.0")).isFalse();
        assertThat(SemanticVersion.isNewer(null, "1.0.0")).isFalse();
    }

    @Test
    void ordersMinorAndPatchIndependently() {
        assertThat(SemanticVersion.isNewer("1.1.0", "1.0.9")).isTrue();
        assertThat(SemanticVersion.isNewer("2.0.0", "1.99.99")).isTrue();
        assertThat(SemanticVersion.isNewer("1.0.1", "1.0.0")).isTrue();
    }
}
