package relics.reliceApi.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import relics.reliceApi.desktop.DesktopRuntime;
import relics.reliceApi.model.UpdateInstall;
import relics.reliceApi.model.UpdateInstall.Problem;
import relics.reliceApi.model.UpdateStatus;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import java.util.stream.Stream;

/**
 * The Windows update, from one click to a newer application running.
 *
 * <p>Four things happen and they happen in this order, which is the whole
 * design: the setup is downloaded, the file on disk is proved to be the one the
 * release published, only then is it started, and only then does this process
 * end so the jar it is holding open can be replaced. Nothing runs before the
 * proof — see {@link ReleaseDigest} for why that ordering is not negotiable.
 *
 * <p>Everything about the setup being runnable without a consent prompt lives
 * in the .iss rather than here: the install is per-user, so the newer setup
 * replaces it without elevating, and {@code /RELAUNCH=yes} is the switch that
 * brings the application back afterwards.
 *
 * <p>One install at a time, and a second start while one is running returns the
 * running one rather than beginning again. The button is in a dialog somebody
 * can double click.
 */
@Service
public class WindowsUpdateInstaller implements UpdateInstaller {

    /** Under the application's own folder, beside its data, and never {@code {app}}. */
    static final String DOWNLOAD_DIRECTORY = "updates";

    /**
     * The name the download is written under, fixed rather than taken from the
     * release. GitHub's asset name is a string from the network, and a string
     * from the network resolved against a directory is a path traversal waiting
     * for somebody to notice. Nothing reads this name, so it costs nothing.
     */
    static final String SETUP_FILE = "update-setup.exe";

    /**
     * What the setup is run with.
     *
     * <p>/SILENT rather than /VERYSILENT: this process is about to close, so
     * Inno's own progress window is the only thing on screen between the click
     * and the application coming back. A user watching nothing happen for a
     * minute concludes it broke.
     *
     * <p>/RELAUNCH=yes is read by the .iss and by nothing else. It is what
     * starts the newer copy once the files are in place.
     */
    private static final String[] SETUP_ARGUMENTS =
            {"/SILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/RELAUNCH=yes"};

    /**
     * How long the setup is given to get going before this process ends.
     *
     * <p>Long enough for one more poll to land, so the screen shows the last
     * stage rather than going blank on a connection that dropped for no reason
     * anybody can see. Short enough that the wait reads as the handover it is.
     */
    private static final Duration HANDOVER = Duration.ofSeconds(2);

    /** Generous: this is a sixty-megabyte file, not an API call. */
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(20);

    private static final int BUFFER_BYTES = 64 * 1024;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(CONNECT_TIMEOUT)
            // The asset URL is a redirect to GitHub's CDN, every time.
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    /** One thread, so two starts cannot download over each other's file. */
    private final ExecutorService worker =
            Executors.newSingleThreadExecutor(runnable -> {
                Thread thread = new Thread(runnable, "windows-update-installer");
                // Daemon: an update that is still downloading must not be the
                // reason Quit from the tray icon hangs.
                thread.setDaemon(true);
                return thread;
            });

    private final AtomicReference<UpdateInstall> state =
            new AtomicReference<>(UpdateInstall.idle());

    /**
     * The answer this decides from, and not the service that produces it: all
     * this needs is one cached record, and a test that had to stand up an
     * {@link UpdateCheckService} would be standing up a call to GitHub.
     */
    private final Supplier<UpdateStatus> status;

    private final SetupLauncher launcher;
    private final Path downloadDirectory;

    // Two constructors, so the one Spring is to use has to say so.
    @Autowired
    public WindowsUpdateInstaller(
            UpdateCheckService updates,
            @Value("${relics.update.download-path:}") String downloadPath) {
        this(updates::status, WindowsUpdateInstaller::runSetupAndStandAside,
                downloadPath.isBlank()
                        ? DesktopRuntime.home().resolve(DOWNLOAD_DIRECTORY)
                        : Path.of(downloadPath));
    }

    /** For tests, which supply a launcher that records rather than one that ends the JVM. */
    WindowsUpdateInstaller(Supplier<UpdateStatus> status, SetupLauncher launcher, Path downloadDirectory) {
        this.status = status;
        this.launcher = launcher;
        this.downloadDirectory = downloadDirectory;
    }

    @Override
    public InstallPlatform platform() {
        return InstallPlatform.WINDOWS;
    }

    /** What the poll answers. Never throws and never blocks. */
    @Override
    public UpdateInstall state() {
        return state.get();
    }

    /**
     * Begins the update, or reports why it will not.
     *
     * <p>Returns immediately with the first stage; the work is on the worker
     * thread and the caller watches it through {@link #state()}. A start while
     * one is already running is the same install, not a second one.
     */
    @Override
    public synchronized UpdateInstall start() {
        UpdateInstall current = state.get();
        if (current.stage().running()) return current;

        UpdateStatus latest = status.get();
        Problem refusal = refuse(latest);
        if (refusal != null) return publish(UpdateInstall.failed(refusal));

        UpdateStatus.WindowsSetup setup = latest.windows();
        String declared = ReleaseDigest.declared(setup.digest());

        UpdateInstall started = publish(UpdateInstall.downloading(0, setup.size()));
        worker.execute(() -> install(setup, declared));
        return started;
    }

    /**
     * Whether this install can be updated at all, decided before a byte moves.
     *
     * <p>Order matters only in what the user is told: a Docker install with no
     * release to pull should hear about the platform rather than about the
     * release, because the platform is the part that will still be true
     * tomorrow.
     */
    private static Problem refuse(UpdateStatus status) {
        if (!InstallPlatform.WINDOWS.wireName().equals(status.platform())) return Problem.NOT_WINDOWS;
        if (!status.updateAvailable()) return Problem.NO_UPDATE;

        UpdateStatus.WindowsSetup setup = status.windows();
        if (setup == null || setup.url() == null) return Problem.NO_SETUP;
        if (ReleaseDigest.declared(setup.digest()) == null) return Problem.NO_DIGEST;

        return null;
    }

    /** The worker's whole job: fetch, prove, run. */
    private void install(UpdateStatus.WindowsSetup setup, String declaredDigest) {
        Path target = downloadDirectory.resolve(SETUP_FILE);

        try {
            Files.createDirectories(downloadDirectory);
            download(setup, target);
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            discard(target);
            fail(Problem.DOWNLOAD_FAILED, e);
            return;
        }

        String actual;
        try {
            publish(UpdateInstall.verifying(setup.size()));
            actual = ReleaseDigest.of(target);
        } catch (IOException e) {
            discard(target);
            fail(Problem.DOWNLOAD_FAILED, e);
            return;
        }

        if (!ReleaseDigest.matches(declaredDigest, actual)) {
            // Deleted rather than left for a human to look at: what is on disk
            // is an unidentified executable this application put there, and the
            // one thing worse than not knowing what it is would be keeping it.
            discard(target);
            fail(Problem.DIGEST_MISMATCH, null);
            return;
        }

        try {
            publish(UpdateInstall.starting(setup.size()));
            launcher.launch(target);
        } catch (IOException e) {
            fail(Problem.LAUNCH_FAILED, e);
        }
    }

    private void download(UpdateStatus.WindowsSetup setup, Path target)
            throws IOException, InterruptedException {

        // Anything a previous attempt left, including a half-written file from
        // a download that was cut off. Each of these is sixty megabytes and
        // nothing reads them once the install is done.
        clearDownloadDirectory();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(setup.url()))
                .header("Accept", "application/octet-stream")
                .header("User-Agent", ApiIdentity.USER_AGENT)
                .GET()
                .build();

        HttpResponse<InputStream> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

        if (response.statusCode() != 200) {
            throw new IOException("HTTP " + response.statusCode() + " for " + setup.name());
        }

        try (InputStream in = response.body();
             OutputStream out = Files.newOutputStream(target,
                     StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {

            byte[] buffer = new byte[BUFFER_BYTES];
            long done = 0;
            int read;
            while ((read = in.read(buffer)) >= 0) {
                out.write(buffer, 0, read);
                done += read;
                publish(UpdateInstall.downloading(done, setup.size()));
            }
        }
    }

    /**
     * Starts the setup, waits for the handover, and ends this process.
     *
     * <p>The exit is not tidiness. The JVM holds the jar open, the setup is
     * about to overwrite it, and Windows will not replace a file that is open.
     * Inno's own CloseApplications would eventually force the issue, but being
     * force-terminated and choosing to stop are different things, and only one
     * of them runs the shutdown hooks that flush what is in memory.
     *
     * <p>The setup outlives its parent: it is a detached process, and nothing
     * here waits for it.
     *
     * <p><b>SmartScreen, and what is and is not known about it.</b> The setup
     * is unsigned, and "Windows protected your PC" is what an unsigned setup
     * gets when a person double clicks it in Explorer. That warning is driven
     * by the Mark of the Web — the {@code Zone.Identifier} stream a browser
     * attaches to a file it downloaded — and a file this process writes with an
     * ordinary stream carries no such stream, so the reasoning says the warning
     * does not fire here.
     *
     * <p>Reasoning is not a measurement, and this one has not been taken: it
     * needs a real Windows machine, which nothing in this repository's toolchain
     * is. Until it has, the claim above is a hypothesis and the task
     * {@code smartscreen-on-a-launched-setup} is what closes it. If the warning
     * does fire, an updater whose first screen is an unexplained warning is not
     * the feature this was meant to be, and signing — 200-400 EUR a year — is
     * the conversation that follows.
     */
    private static void runSetupAndStandAside(Path setup) throws IOException {
        new ProcessBuilder(concat(setup.toString(), SETUP_ARGUMENTS))
                .directory(setup.getParent().toFile())
                .start();

        try {
            Thread.sleep(HANDOVER);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        System.exit(0);
    }

    private static String[] concat(String first, String[] rest) {
        return Stream.concat(Stream.of(first), Stream.of(rest)).toArray(String[]::new);
    }

    private void clearDownloadDirectory() throws IOException {
        if (!Files.isDirectory(downloadDirectory)) return;

        try (Stream<Path> entries = Files.list(downloadDirectory)) {
            for (Path entry : entries.toList()) {
                Files.deleteIfExists(entry);
            }
        }
    }

    private void discard(Path target) {
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            // Nothing left to do about it, and the next attempt truncates it
            // anyway. Saying so is worth more than failing over it.
            System.out.println("WindowsUpdateInstaller: could not remove " + target
                    + " — " + e.getMessage());
        }
    }

    private void fail(Problem problem, Exception cause) {
        System.out.println("WindowsUpdateInstaller: " + problem.wireName()
                + (cause == null ? "" : " — " + cause.getMessage()));
        publish(UpdateInstall.failed(problem));
    }

    private UpdateInstall publish(UpdateInstall next) {
        state.set(next);
        return next;
    }

    /**
     * Running the verified setup, which is the one step a test must never take.
     *
     * <p>It starts a program and ends this process, so it is the seam: the
     * production implementation is the private method above, and a test passes
     * something that writes the path down instead.
     */
    @FunctionalInterface
    interface SetupLauncher {
        void launch(Path setup) throws IOException;
    }
}
