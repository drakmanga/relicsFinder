package relics.reliceApi.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/**
 * The checksum GitHub publishes beside a release asset, and whether a file on
 * disk is that asset.
 *
 * <p>This is the whole of what stands between the update button and running
 * whatever answered the download. "It is our own release" is not the claim
 * being checked: the file arrives over the network from a CDN, and the check is
 * there for the case where that network, or that CDN, is not what it should be.
 * A setup run on trust is a remote code execution path handed to whoever can
 * answer for it.
 *
 * <p>Only sha256 is accepted, and an asset carrying anything else — or nothing
 * at all, which is every release cut before GitHub started publishing digests
 * in 2025 — is refused rather than waved through. A verification that can be
 * skipped by the thing it verifies is not one.
 */
public final class ReleaseDigest {

    /** The one algorithm accepted, as GitHub spells it in the {@code digest} field. */
    private static final String ALGORITHM = "sha256";

    /** GitHub's format is {@code sha256:} followed by lowercase hex. */
    private static final String PREFIX = ALGORITHM + ":";

    /** What {@link MessageDigest} calls the same algorithm. */
    private static final String JCA_NAME = "SHA-256";

    /** 64 hex characters, and a string of any other length is not one of these. */
    private static final int HEX_LENGTH = 64;

    /** Big enough that a sixty-megabyte file is a few hundred reads, not a million. */
    private static final int BUFFER_BYTES = 64 * 1024;

    private ReleaseDigest() {}

    /**
     * The hex checksum out of GitHub's {@code digest} field, or null.
     *
     * <p>Null for every shape this cannot vouch for: absent, some other
     * algorithm, or the right prefix on something that is not 64 hex
     * characters. The caller's only correct response to null is to refuse the
     * update, which is why there is no lenient reading here.
     */
    public static String declared(String digest) {
        if (digest == null) return null;

        String trimmed = digest.trim().toLowerCase(Locale.ROOT);
        if (!trimmed.startsWith(PREFIX)) return null;

        String hex = trimmed.substring(PREFIX.length());
        if (hex.length() != HEX_LENGTH) return null;

        for (int i = 0; i < hex.length(); i++) {
            char c = hex.charAt(i);
            boolean hexDigit = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f');
            if (!hexDigit) return null;
        }
        return hex;
    }

    /**
     * The sha256 of a file, as lowercase hex.
     *
     * <p>Read from disk rather than computed from the download stream as it
     * went past, and the difference is the point: what gets executed is the
     * file, so the file is what has to be hashed. A stream digest vouches for
     * bytes that were in memory and says nothing about what actually landed.
     */
    public static String of(Path file) throws IOException {
        MessageDigest digest = sha256();

        try (InputStream in = Files.newInputStream(file)) {
            byte[] buffer = new byte[BUFFER_BYTES];
            int read;
            while ((read = in.read(buffer)) >= 0) {
                digest.update(buffer, 0, read);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    /**
     * Whether a computed checksum is the declared one.
     *
     * <p>Both sides are hex this process produced or already validated, so a
     * plain comparison is honest here: there is no secret to leak through the
     * time it takes, and nothing on the other end to iterate against it.
     */
    public static boolean matches(String declaredHex, String actualHex) {
        return declaredHex != null && declaredHex.equalsIgnoreCase(actualHex);
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance(JCA_NAME);
        } catch (NoSuchAlgorithmException e) {
            // Required of every Java implementation since 1.4. Unreachable, and
            // wrapped rather than declared so callers are not made to handle it.
            throw new IllegalStateException(JCA_NAME + " is missing from this JVM", e);
        }
    }
}
