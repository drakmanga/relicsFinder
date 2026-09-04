package relics.reliceApi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The check that decides whether a downloaded setup is allowed to run.
 *
 * <p>Every case below is a way of getting an unverified file executed, so each
 * one is written as the attack it would be rather than as a branch it covers.
 */
class ReleaseDigestTest {

    /** sha256 of the empty input, which is the one value that needs no fixture. */
    private static final String EMPTY_SHA256 =
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    private static final String SIXTY_FOUR_HEX =
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    @Test
    void readsTheHexOutOfGithubsField() {
        assertEquals(SIXTY_FOUR_HEX, ReleaseDigest.declared("sha256:" + SIXTY_FOUR_HEX));
    }

    @Test
    void acceptsUppercaseHexAndSurroundingSpace() {
        assertEquals(SIXTY_FOUR_HEX,
                ReleaseDigest.declared("  SHA256:" + SIXTY_FOUR_HEX.toUpperCase() + "  "));
    }

    /** Every release cut before GitHub published digests, which is most of them. */
    @Test
    void aReleaseWithNoDigestIsRefused() {
        assertNull(ReleaseDigest.declared(null));
        assertNull(ReleaseDigest.declared(""));
    }

    /**
     * The one that matters most: an attacker who can shape the API answer picks
     * an algorithm they can collide, and a lenient parser hands them the check.
     */
    @Test
    void anAlgorithmThisCannotVouchForIsRefused() {
        assertNull(ReleaseDigest.declared("md5:d41d8cd98f00b204e9800998ecf8427e"));
        assertNull(ReleaseDigest.declared("sha1:da39a3ee5e6b4b0d3255bfef95601890afd80709"));
        assertNull(ReleaseDigest.declared("sha512:" + SIXTY_FOUR_HEX));
    }

    /** A bare hex string with no algorithm is not a digest this understands. */
    @Test
    void hexWithNoPrefixIsRefused() {
        assertNull(ReleaseDigest.declared(SIXTY_FOUR_HEX));
    }

    @Test
    void aTruncatedOrPaddedDigestIsRefused() {
        assertNull(ReleaseDigest.declared("sha256:" + SIXTY_FOUR_HEX.substring(1)));
        assertNull(ReleaseDigest.declared("sha256:" + SIXTY_FOUR_HEX + "0"));
    }

    /** Anything but 0-9a-f, so a digest cannot smuggle a path or a wildcard. */
    @Test
    void aDigestThatIsNotHexIsRefused() {
        assertNull(ReleaseDigest.declared("sha256:" + "g".repeat(64)));
        assertNull(ReleaseDigest.declared("sha256:" + "../".repeat(21) + "a"));
    }

    @Test
    void hashesAFileTheWayGithubDoes(@TempDir Path dir) throws IOException {
        Path file = dir.resolve("setup.exe");
        Files.write(file, new byte[0]);

        assertEquals(EMPTY_SHA256, ReleaseDigest.of(file));
    }

    /**
     * Larger than the read buffer, because a digest computed from only the
     * first chunk would still match on anything shorter than one.
     */
    @Test
    void hashesEveryByteOfAFileBiggerThanOneRead(@TempDir Path dir) throws IOException {
        byte[] content = new byte[300_000];
        for (int i = 0; i < content.length; i++) {
            content[i] = (byte) i;
        }

        Path first = dir.resolve("first.exe");
        Files.write(first, content);

        // One byte different, in the last chunk rather than the first.
        content[content.length - 1] ^= 0xFF;
        Path second = dir.resolve("second.exe");
        Files.write(second, content);

        String firstHash = ReleaseDigest.of(first);
        assertNotNull(firstHash);
        assertFalse(firstHash.equals(ReleaseDigest.of(second)),
                "two files differing only in their last byte hashed the same");
    }

    @Test
    void aFileThatIsTheDeclaredAssetMatches() {
        assertTrue(ReleaseDigest.matches(SIXTY_FOUR_HEX, SIXTY_FOUR_HEX));
        assertTrue(ReleaseDigest.matches(SIXTY_FOUR_HEX, SIXTY_FOUR_HEX.toUpperCase()));
    }

    @Test
    void aFileThatIsNotTheDeclaredAssetDoesNotMatch() {
        assertFalse(ReleaseDigest.matches(SIXTY_FOUR_HEX, EMPTY_SHA256));
    }

    /**
     * Null is what {@link ReleaseDigest#declared} returns for every refused
     * shape above, so a caller that forgot to check it must not get a pass here.
     */
    @Test
    void nothingMatchesAnAbsentDeclaration() {
        assertFalse(ReleaseDigest.matches(null, EMPTY_SHA256));
        assertFalse(ReleaseDigest.matches(null, null));
    }
}
