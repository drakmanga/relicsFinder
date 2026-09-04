package relics.reliceApi.service;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import relics.reliceApi.model.UpdateInstall;
import relics.reliceApi.model.UpdateInstall.Problem;
import relics.reliceApi.model.UpdateInstall.Stage;
import relics.reliceApi.model.UpdateStatus;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The updater, with the one step it must never really take replaced by a
 * recorder: launching the setup ends the process, so a test that let it happen
 * would take the suite with it.
 *
 * <p>A real HTTP server on loopback serves the download, because the thing
 * being checked is what lands on disk and whether it is allowed to run — which
 * a stubbed byte array would not exercise.
 */
class WindowsUpdateInstallerTest {

    /** Stands in for a sixty-megabyte setup. Larger than one read of the buffer. */
    private static final byte[] SETUP_BYTES = setupBytes();

    private static final String RELEASE_URL = "https://github.com/drakmanga/relicsFinder/releases/tag/v9.9.9";

    private HttpServer server;
    private String downloadUrl;

    /** What the server answers with, so a test can make the download fail. */
    private final AtomicReference<byte[]> served = new AtomicReference<>(SETUP_BYTES);
    private final AtomicReference<Integer> statusCode = new AtomicReference<>(200);

    /** Set by the fake launcher, and null for every path that must not launch. */
    private final AtomicReference<Path> launched = new AtomicReference<>();
    private final CountDownLatch launchedOnce = new CountDownLatch(1);

    @TempDir
    Path downloads;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/setup.exe", exchange -> {
            byte[] body = served.get();
            exchange.sendResponseHeaders(statusCode.get(), body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
        downloadUrl = "http://" + server.getAddress().getHostString()
                + ":" + server.getAddress().getPort() + "/setup.exe";
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    // ----------------------------------------------------------- refusals --

    @Test
    void aDockerInstallIsToldAboutItsPlatformRatherThanOfferedAnExe() {
        UpdateInstall result = installerFor(status("docker", true, setup(sha256(SETUP_BYTES)))).start();

        assertEquals(Stage.FAILED, result.stage());
        assertEquals(Problem.NOT_WINDOWS, result.problem());
        assertNull(launched.get());
    }

    @Test
    void anInstallThatIsAlreadyTheNewestDownloadsNothing() {
        UpdateInstall result = installerFor(status("windows", false, setup(sha256(SETUP_BYTES)))).start();

        assertEquals(Problem.NO_UPDATE, result.problem());
        assertNull(launched.get());
    }

    /** A release whose installer build failed after it was published. */
    @Test
    void aReleaseWithNoSetupAttachedIsRefused() {
        UpdateInstall result = installerFor(status("windows", true, null)).start();

        assertEquals(Problem.NO_SETUP, result.problem());
        assertNull(launched.get());
    }

    /**
     * The refusal the whole brief turns on. An unverifiable download is not
     * downloaded at all: there would be no answer to give at the end of it.
     */
    @Test
    void aReleaseThatPublishesNoChecksumIsRefusedBeforeAnythingIsFetched() {
        UpdateInstall result = installerFor(status("windows", true, setup(null))).start();

        assertEquals(Problem.NO_DIGEST, result.problem());
        assertNull(launched.get());
        assertTrue(isEmpty(downloads), "a file was written for a release that could not be verified");
    }

    @Test
    void aChecksumInSomeOtherAlgorithmIsTheSameRefusal() {
        UpdateInstall result = installerFor(status("windows", true, setup("md5:" + "0".repeat(32)))).start();

        assertEquals(Problem.NO_DIGEST, result.problem());
        assertNull(launched.get());
    }

    // ------------------------------------------------------------- the run --

    @Test
    void downloadsTheSetupAndRunsTheFileTheReleasePublished() throws Exception {
        WindowsUpdateInstaller installer =
                installerFor(status("windows", true, setup(sha256(SETUP_BYTES))));

        installer.start();
        assertTrue(launchedOnce.await(10, TimeUnit.SECONDS), "the setup was never started");

        assertEquals(Stage.STARTING, installer.state().stage());
        assertNull(installer.state().problem());
        assertArrayEquals(SETUP_BYTES, Files.readAllBytes(launched.get()),
                "the file handed to the launcher is not the one the server served");
    }

    @Test
    void reportsTheWholeDownloadAsProgress() throws Exception {
        WindowsUpdateInstaller installer =
                installerFor(status("windows", true, setup(sha256(SETUP_BYTES))));

        assertEquals(SETUP_BYTES.length, installer.start().total());
        assertTrue(launchedOnce.await(10, TimeUnit.SECONDS), "the setup was never started");

        UpdateInstall finished = installer.state();
        assertEquals(SETUP_BYTES.length, finished.downloaded());
        assertEquals(SETUP_BYTES.length, finished.total());
    }

    /**
     * The button sits in a dialog, and a dialog button is something people
     * double click. Two starts are one install.
     */
    @Test
    void aSecondStartJoinsTheRunningInstallInsteadOfBeginningAnother() throws Exception {
        WindowsUpdateInstaller installer =
                installerFor(status("windows", true, setup(sha256(SETUP_BYTES))));

        installer.start();
        assertTrue(launchedOnce.await(10, TimeUnit.SECONDS), "the setup was never started");

        Path first = launched.get();
        UpdateInstall again = installer.start();

        assertEquals(Stage.STARTING, again.stage());
        assertSame(first, launched.get(), "the setup was started a second time");
    }

    @Test
    void clearsWhatAnEarlierAttemptLeftBehind() throws Exception {
        Path leftover = downloads.resolve("RelicFinder-0.0.1-setup.exe");
        Files.createDirectories(downloads);
        Files.write(leftover, new byte[] {1, 2, 3});

        installerFor(status("windows", true, setup(sha256(SETUP_BYTES)))).start();
        assertTrue(launchedOnce.await(10, TimeUnit.SECONDS), "the setup was never started");

        assertFalse(Files.exists(leftover), "a previous download was left on disk");
    }

    // --------------------------------------------------------- what fails --

    /**
     * The one this exists for: something served bytes that are not the release,
     * and nothing ran.
     */
    @Test
    void aFileThatIsNotTheReleaseIsDeletedAndNeverRun() throws Exception {
        // The declared digest is of the real setup; the server sends something else.
        served.set("not the setup at all".getBytes());

        WindowsUpdateInstaller installer =
                installerFor(status("windows", true, setup(sha256(SETUP_BYTES))));
        installer.start();

        UpdateInstall result = awaitFailure(installer);

        assertEquals(Problem.DIGEST_MISMATCH, result.problem());
        assertNull(launched.get(), "an unverified file was executed");
        assertTrue(isEmpty(downloads), "the unverified file was left on disk");
    }

    @Test
    void aDownloadThatTheServerRefusesFailsAndRunsNothing() throws Exception {
        statusCode.set(404);

        WindowsUpdateInstaller installer =
                installerFor(status("windows", true, setup(sha256(SETUP_BYTES))));
        installer.start();

        assertEquals(Problem.DOWNLOAD_FAILED, awaitFailure(installer).problem());
        assertNull(launched.get());
    }

    /** A failed attempt is not a dead end: the next click tries again. */
    @Test
    void anInstallCanBeRetriedAfterItFailed() throws Exception {
        statusCode.set(500);

        WindowsUpdateInstaller installer =
                installerFor(status("windows", true, setup(sha256(SETUP_BYTES))));
        installer.start();
        awaitFailure(installer);

        statusCode.set(200);
        installer.start();

        assertTrue(launchedOnce.await(10, TimeUnit.SECONDS), "the retry never started the setup");
    }

    // ------------------------------------------------------------ fixtures --

    private WindowsUpdateInstaller installerFor(UpdateStatus status) {
        return new WindowsUpdateInstaller(() -> status, setup -> {
            launched.set(setup);
            launchedOnce.countDown();
        }, downloads);
    }

    private UpdateStatus status(String platform, boolean available, UpdateStatus.WindowsSetup windows) {
        return new UpdateStatus("9.9.8", "9.9.9", available, true,
                "v9.9.9", "notes", RELEASE_URL, "2026-09-04T00:00:00Z",
                platform, windows, Instant.now());
    }

    private UpdateStatus.WindowsSetup setup(String digest) {
        return new UpdateStatus.WindowsSetup(
                downloadUrl, "RelicFinder-9.9.9-setup.exe", SETUP_BYTES.length, digest);
    }

    private UpdateInstall awaitFailure(WindowsUpdateInstaller installer) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline) {
            UpdateInstall state = installer.state();
            if (state.stage() == Stage.FAILED) return state;
            Thread.sleep(20);
        }
        throw new AssertionError("the install never finished; it is at " + installer.state().stage());
    }

    private static boolean isEmpty(Path directory) {
        try (var entries = Files.list(directory)) {
            return entries.findAny().isEmpty();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] setupBytes() {
        byte[] bytes = new byte[200_000];
        for (int i = 0; i < bytes.length; i++) {
            bytes[i] = (byte) (i * 31);
        }
        return bytes;
    }

    private static String sha256(byte[] bytes) {
        try {
            return "sha256:" + HexFormat.of()
                    .formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
