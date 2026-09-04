package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Whether a newer Relic Finder has been released, and everything the thing that
 * asked would need next.
 *
 * <p>The Windows payload travels on every answer, filled or not, rather than
 * being fetched later: a Windows install downloads and runs the setup named
 * here, and a second round trip to GitHub for it would spend one of the sixty
 * requests an hour a shared address gets, to learn something this answer
 * already had in hand.
 *
 * <p>There is no Docker payload, and there was one until this shape was tried
 * against a real container update. A container is replaced by compose, which
 * resolves image names out of the files the operator started with — so an image
 * reference composed here would be a second, quieter answer to a question
 * something else already answers, and the first one to go stale.
 *
 * <p>{@code known} is the field to read first. False means the check could not
 * reach GitHub, which offline is the ordinary case rather than a fault: the
 * answer is then "I do not know", with {@code latest} null and
 * {@code updateAvailable} false, and a screen should say nothing rather than
 * say everything is current.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record UpdateStatus(

        /** The version running, from the jar manifest. {@code "dev"} from classes. */
        String current,

        /** The newest published release, without its leading {@code v}. Null when unknown. */
        String latest,

        /**
         * True only when both versions parsed and the published one is newer.
         *
         * <p>A build whose version does not parse is never behind. Saying "there
         * is an update" on the strength of a string nothing could read is how a
         * notice teaches people to dismiss it.
         */
        boolean updateAvailable,

        /** False when GitHub could not be reached. Everything below is then empty. */
        boolean known,

        /** What GitHub calls the release, usually the tag. Null when unknown. */
        String releaseName,

        /** The release notes, as the markdown GitHub holds. Null when unknown. */
        String releaseNotes,

        /** The release page, for a reader who wants the whole thing. Null when unknown. */
        String releaseUrl,

        /** ISO instant the release was published. Null when unknown. */
        String publishedAt,

        /** {@code windows}, {@code docker} or {@code unknown} — see InstallPlatform. */
        String platform,

        /** The setup to download, or null when the release carries no .exe. */
        WindowsSetup windows,

        /** When this answer was read from GitHub, so a caller can see it is cached. */
        Instant checkedAt) {

    /**
     * The Windows installer attached to the release.
     *
     * <p>The digest rides along because a downloader that cannot verify what it
     * downloaded has to trust the network it distrusted enough to check for
     * updates over. GitHub has only served it on the assets API since 2025, so
     * it is null for a release cut before that rather than absent.
     */
    public record WindowsSetup(String url, String name, long size, String digest) {}
}
