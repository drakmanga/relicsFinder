package relics.reliceApi.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

/**
 * What the application is doing about updating itself, right now.
 *
 * <p>Polled rather than pushed: the whole of it is four numbers and two words,
 * a download is the only slow part, and a socket held open for the thirty
 * seconds a sixty-megabyte file takes buys nothing a request every half second
 * does not already give.
 *
 * <p>{@code problem} carries a code and not a sentence. What the user reads is
 * the screen's business — the same refusal is a paragraph in a dialog and a
 * line in a log — and a backend that ships English is a backend that has to be
 * redeployed to fix a wording.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record UpdateInstall(

        /** Where in the sequence this is. */
        Stage stage,

        /** Why it stopped, when {@link Stage#FAILED}. Null otherwise. */
        Problem problem,

        /** Bytes written so far. Zero outside {@link Stage#DOWNLOADING}. */
        long downloaded,

        /** Bytes the release says the setup is. Zero when nothing is being fetched. */
        long total) {

    /**
     * The four things this can be doing, and the one thing it can have stopped
     * at.
     *
     * <p>Verifying is its own stage rather than a moment inside the download
     * because it is a real second pass over the file — long enough to be seen
     * on a slow disk, and worth naming: a user watching an update install is
     * entitled to know that the check happened.
     */
    public enum Stage {

        /** Nothing has been asked for, or a previous run's setup already started. */
        IDLE,

        /** The setup is coming down. {@code downloaded} and {@code total} move. */
        DOWNLOADING,

        /** The file is on disk and its checksum is being computed. */
        VERIFYING,

        /** The setup has been started, and this process is about to end. */
        STARTING,

        /** It stopped, and {@link #problem} says what on. */
        FAILED;

        /** Whether an install is under way, and so whether a second start is a no-op. */
        public boolean running() {
            return this == DOWNLOADING || this == VERIFYING || this == STARTING;
        }

        @JsonValue
        public String wireName() {
            return name().toLowerCase(Locale.ROOT);
        }
    }

    /**
     * Everything that stops an update, as a closed vocabulary.
     *
     * <p>The first four are refusals decided before anything is fetched: they
     * are answers to "should this even be offered", and a client that shows the
     * button on a platform that cannot use it gets one of them rather than a
     * download.
     */
    public enum Problem {

        /** This install updates some other way, or not at all. See InstallPlatform. */
        NOT_WINDOWS,

        /** There is no newer release, or the check could not reach GitHub. */
        NO_UPDATE,

        /** The release carries no setup — a build that failed after publishing. */
        NO_SETUP,

        /** The release publishes no sha256, so nothing here can be verified. */
        NO_DIGEST,

        /** The network, the CDN or the disk gave out partway. */
        DOWNLOAD_FAILED,

        /** What arrived is not what the release published. Nothing was run. */
        DIGEST_MISMATCH,

        /** The file verified, and Windows would not start it. */
        LAUNCH_FAILED;

        @JsonValue
        public String wireName() {
            return name().toLowerCase(Locale.ROOT).replace('_', '-');
        }
    }

    /** Nothing asked for and nothing wrong. */
    public static UpdateInstall idle() {
        return new UpdateInstall(Stage.IDLE, null, 0, 0);
    }

    public static UpdateInstall downloading(long downloaded, long total) {
        return new UpdateInstall(Stage.DOWNLOADING, null, downloaded, total);
    }

    /** Keeps the byte counts, so a progress bar does not empty itself at the end. */
    public static UpdateInstall verifying(long total) {
        return new UpdateInstall(Stage.VERIFYING, null, total, total);
    }

    public static UpdateInstall starting(long total) {
        return new UpdateInstall(Stage.STARTING, null, total, total);
    }

    public static UpdateInstall failed(Problem problem) {
        return new UpdateInstall(Stage.FAILED, problem, 0, 0);
    }
}
