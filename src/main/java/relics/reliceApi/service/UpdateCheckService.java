package relics.reliceApi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.model.UpdateStatus;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Whether a newer Relic Finder has been published, asked of GitHub and cached.
 *
 * <p>Three things shape this and none of them is the happy path.
 *
 * <p><b>The rate limit.</b> GitHub allows sixty unauthenticated requests an hour
 * per address, which is generous for one desktop and is shared by every install
 * behind one NAT on a Docker host. So the answer is held for {@link #ttl} and a
 * burst of callers takes the lock rather than the network — two calls in quick
 * succession are one request outward, which is what makes the limit a
 * non-question rather than something to hope about.
 *
 * <p><b>Offline is ordinary.</b> A desktop with no network is not a fault, so a
 * failed check answers {@link UpdateStatus#known()} false, quickly, and is held
 * for {@link #FAILURE_TTL} rather than the full hour — long enough that a
 * disconnected machine is not retrying on every page load, short enough that
 * coming back online is not an hour away from being noticed.
 *
 * <p><b>A draft release is invisible here.</b> {@code /releases/latest} skips
 * drafts and pre-releases by definition, so this endpoint reports nothing at all
 * until the release is published. That is why release.yml publishes rather than
 * drafting; see the note at the top of it.
 */
@Service
public class UpdateCheckService {

    private static final String LATEST_RELEASE = "https://api.github.com/repos/%s/releases/latest";

    /**
     * Short, because the caller is a page load and the machine may have no
     * network at all. A DNS failure returns well inside this; a black-holed
     * connection is what it is actually for.
     */
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    /** How long a failed check is believed. See the class note. */
    private static final Duration FAILURE_TTL = Duration.ofMinutes(5);

    /** The only asset shape a Windows install can do anything with. */
    private static final String WINDOWS_SETUP_SUFFIX = ".exe";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    /** Guards the refresh so a burst of callers makes one request, not many. */
    private final ReentrantLock refreshLock = new ReentrantLock();

    private final String repository;
    private final String image;
    private final Duration ttl;

    private volatile UpdateStatus cached;

    public UpdateCheckService(
            @Value("${relics.update.repository:drakmanga/relicsFinder}") String repository,
            @Value("${relics.update.image:ghcr.io/drakmanga/relicsfinder}") String image,
            @Value("${relics.update.ttl:PT1H}") Duration ttl) {
        this.repository = repository;
        this.image = image;
        this.ttl = ttl;
    }

    /** The cached answer, refreshed when it has aged out. Never throws. */
    public UpdateStatus status() {
        UpdateStatus held = cached;
        if (isFresh(held)) return held;

        refreshLock.lock();
        try {
            // Another caller may have refreshed while this one waited on the lock.
            held = cached;
            if (isFresh(held)) return held;

            UpdateStatus fetched = check();
            cached = fetched;
            return fetched;
        } finally {
            refreshLock.unlock();
        }
    }

    private boolean isFresh(UpdateStatus held) {
        if (held == null) return false;

        Duration age = Duration.between(held.checkedAt(), Instant.now());
        return age.compareTo(held.known() ? ttl : FAILURE_TTL) < 0;
    }

    private UpdateStatus check() {
        try {
            return describe(fetchLatestRelease());
        } catch (Exception e) {
            // Not logged at error: a laptop that is offline would fill the log
            // with something nobody is meant to act on.
            System.out.println("UpdateCheckService: no answer from GitHub — " + e.getMessage());
            return unknown();
        }
    }

    private JsonNode fetchLatestRelease() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(LATEST_RELEASE.formatted(repository)))
                .timeout(TIMEOUT)
                .header("Accept", "application/vnd.github+json")
                .header("User-Agent", ApiIdentity.USER_AGENT)
                .GET()
                .build();

        HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IllegalStateException("HTTP " + response.statusCode() + " from " + repository);
        }

        return mapper.readTree(response.body());
    }

    private UpdateStatus describe(JsonNode release) {
        String tag = release.path("tag_name").asText("");
        String latest = tag.startsWith("v") ? tag.substring(1) : tag;

        return new UpdateStatus(
                AppVersion.RUNNING,
                latest.isEmpty() ? null : latest,
                SemanticVersion.isNewer(latest, AppVersion.RUNNING),
                true,
                text(release, "name"),
                text(release, "body"),
                text(release, "html_url"),
                text(release, "published_at"),
                InstallPlatform.detect().wireName(),
                windowsSetup(release),
                latest.isEmpty() ? null : new UpdateStatus.DockerImage(image + ":" + latest, latest),
                Instant.now());
    }

    /**
     * The first .exe attached to the release.
     *
     * <p>Null rather than an empty record when there is none: a release cut
     * before the installer existed, or one whose build failed after publishing,
     * has nothing a Windows install could run, and the caller needs to tell that
     * from a download it simply has not read yet.
     */
    private UpdateStatus.WindowsSetup windowsSetup(JsonNode release) {
        for (JsonNode asset : release.path("assets")) {
            String name = asset.path("name").asText("");
            if (!name.toLowerCase(Locale.ROOT).endsWith(WINDOWS_SETUP_SUFFIX)) continue;

            return new UpdateStatus.WindowsSetup(
                    asset.path("browser_download_url").asText(null),
                    name,
                    asset.path("size").asLong(0),
                    asset.path("digest").asText(null));
        }
        return null;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isTextual() && !value.asText().isBlank() ? value.asText() : null;
    }

    /** What the endpoint answers when GitHub could not be reached. */
    private UpdateStatus unknown() {
        return new UpdateStatus(
                AppVersion.RUNNING, null, false, false,
                null, null, null, null,
                InstallPlatform.detect().wireName(),
                null, null, Instant.now());
    }
}
