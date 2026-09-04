package relics.reliceApi.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import relics.reliceApi.model.UpdateInstall;
import relics.reliceApi.model.UpdateInstall.Problem;
import relics.reliceApi.model.UpdateInstall.Stage;
import relics.reliceApi.model.UpdateStatus;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.StandardProtocolFamily;
import java.net.UnixDomainSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The container updater, against a fake daemon on a real unix socket.
 *
 * <p>What is worth checking is what it asks the daemon for, because that is the
 * whole of what it does: the helper container's definition is the update. So the
 * fake records every request and the tests read them back — the compose command,
 * the two mounts, the name it can be found under afterwards.
 *
 * <p>Nothing here starts a real container. The one test that proves the whole
 * mechanism cannot be a unit test at all; it is in the run's own record, taken
 * against two real releases on a local registry.
 */
class DockerUpdateInstallerTest {

    private Path directory;
    private Path socketPath;
    private ServerSocketChannel server;
    private Thread daemon;

    /** Every request the fake was sent, in order, head and body together. */
    private final List<String> requests = new CopyOnWriteArrayList<>();

    @BeforeEach
    void startFakeDaemon() throws IOException {
        directory = Files.createTempDirectory("du");
        socketPath = directory.resolve("docker.sock");

        server = ServerSocketChannel.open(StandardProtocolFamily.UNIX);
        server.bind(UnixDomainSocketAddress.of(socketPath));

        daemon = new Thread(this::serve, "fake-docker");
        daemon.setDaemon(true);
        daemon.start();
    }

    @AfterEach
    void stopFakeDaemon() throws IOException {
        server.close();
        daemon.interrupt();
        Files.deleteIfExists(socketPath);
        Files.deleteIfExists(directory);
    }

    // ----------------------------------------------------------- refusals --

    /**
     * The refusal the brief turns on, and the reason it is answered before
     * anybody clicks: the screen has to show two commands in place of a button,
     * not a button that fails when pressed.
     */
    @Test
    void anInstallThatNeverTookTheSocketSaysSoWithoutBeingAskedToTry() {
        DockerUpdateInstaller installer = installer(false, "/srv/relics", "docker-compose.yaml");

        assertEquals(Stage.FAILED, installer.state().stage());
        assertEquals(Problem.SELF_UPDATE_OFF, installer.state().problem());
        assertTrue(requests.isEmpty(), "it talked to the daemon for an install that declined");
    }

    @Test
    void theSwitchOnItsOwnIsNotEnoughWithoutASocket() {
        DockerUpdateInstaller installer = new DockerUpdateInstaller(
                () -> status("docker", true),
                new DockerSocket(directory.resolve("absent.sock"), Duration.ofSeconds(2)),
                true, "/srv/relics", "docker-compose.yaml");

        assertEquals(Problem.SELF_UPDATE_OFF, installer.start().problem());
    }

    /** Half-configured by hand is off, because the answer a reader needs is the same. */
    @Test
    void aSwitchWithNoProjectDirectoryIsOff() {
        assertEquals(Problem.SELF_UPDATE_OFF,
                installer(true, "", "docker-compose.yaml").start().problem());
    }

    @Test
    void aSwitchWithNoUsableComposeFileIsOff() {
        assertEquals(Problem.SELF_UPDATE_OFF,
                installer(true, "/srv/relics", "").start().problem());
    }

    @Test
    void aWindowsInstallIsToldAboutItsPlatform() {
        DockerUpdateInstaller installer = new DockerUpdateInstaller(
                () -> status("windows", true), socket(), true, "/srv/relics", "docker-compose.yaml");

        assertEquals(Problem.NOT_DOCKER, installer.start().problem());
        assertTrue(requests.isEmpty());
    }

    @Test
    void anInstallThatIsAlreadyTheNewestPullsNothing() {
        DockerUpdateInstaller installer = new DockerUpdateInstaller(
                () -> status("docker", false), socket(), true, "/srv/relics", "docker-compose.yaml");

        assertEquals(Problem.NO_UPDATE, installer.start().problem());
        assertTrue(requests.isEmpty());
    }

    @Test
    void itSaysWhichPlatformItIsFor() {
        assertEquals(InstallPlatform.DOCKER,
                installer(true, "/srv/relics", "docker-compose.yaml").platform());
    }

    // --------------------------------------------------- the compose command --

    /**
     * Both files, on both halves of the command. Leaving the override out would
     * recreate the backend from a description that does not mount the socket —
     * an update that switches the button off as a side effect of using it.
     */
    @Test
    void runsBothComposeFilesThroughBothCommands() {
        String command = installer(true, "/srv/relics",
                "docker-compose.yaml:docker-compose.self-update.yaml").composeCommand();

        assertEquals("docker compose -f docker-compose.yaml -f docker-compose.self-update.yaml pull"
                        + " && docker compose -f docker-compose.yaml -f docker-compose.self-update.yaml up -d",
                command);
    }

    /** The pull has to come first, or `up -d` recreates on the images already here. */
    @Test
    void pullsBeforeItRecreates() {
        String command = installer(true, "/srv/relics", "docker-compose.yaml").composeCommand();

        assertTrue(command.indexOf("pull") < command.indexOf("up -d"));
        assertTrue(command.contains("&&"), "a failed pull must not be followed by a recreate");
    }

    /**
     * The file names come from an environment variable and are pasted into a
     * shell command. The operator who sets it already holds the socket and is
     * not the threat — but a name that turns into a second command is the kind
     * of thing nobody notices until it matters.
     */
    @Test
    void refusesAFileNameThatCouldCarryASecondCommand() {
        DockerUpdateInstaller installer =
                installer(true, "/srv/relics", "docker-compose.yaml:x.yaml; rm -rf /");

        String command = installer.composeCommand();
        assertFalse(command.contains("rm -rf"), "a shell command was smuggled in as a file name");
        assertEquals("docker compose -f docker-compose.yaml pull"
                + " && docker compose -f docker-compose.yaml up -d", command);
    }

    @Test
    void ignoresEmptyEntriesInTheFileList() {
        assertEquals("docker compose -f a.yaml -f b.yaml pull"
                        + " && docker compose -f a.yaml -f b.yaml up -d",
                installer(true, "/srv/relics", "a.yaml::b.yaml:").composeCommand());
    }

    // ------------------------------------------------------------- the run --

    @Test
    void asksTheDaemonForEverythingTheUpdateNeeds() throws Exception {
        DockerUpdateInstaller installer = installer(true, "/srv/relics",
                "docker-compose.yaml:docker-compose.self-update.yaml");

        assertEquals(Stage.PULLING, installer.start().stage());
        awaitRequests(4);

        String all = String.join("\n---\n", requests);

        assertTrue(all.contains("POST /" + DockerSocket.API_VERSION
                + "/images/create?fromImage=docker&tag=cli"), "it never fetched the helper image");
        assertTrue(all.contains("DELETE /" + DockerSocket.API_VERSION
                + "/containers/" + DockerUpdateInstaller.HELPER_CONTAINER + "?force=true"),
                "it never cleared the previous updater");
        assertTrue(all.contains("POST /" + DockerSocket.API_VERSION
                + "/containers/create?name=" + DockerUpdateInstaller.HELPER_CONTAINER),
                "it never created the updater");
        assertTrue(all.contains("/containers/helper-id/start"), "it never started the updater");
    }

    /**
     * The definition IS the update, so this is the test that says what it does:
     * the socket so the helper can give orders, the project directory so compose
     * finds the files, and a name so a failed run can still be read.
     */
    @Test
    void describesAHelperThatCanActuallyDoTheWork() throws Exception {
        installer(true, "/srv/relic finder", "docker-compose.yaml").start();
        awaitRequests(4);

        String create = requests.stream()
                .filter(request -> request.contains("/containers/create"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("nothing created a container"));

        assertTrue(create.contains("\"Image\":\"" + DockerUpdateInstaller.HELPER_IMAGE + "\""));
        assertTrue(create.contains("\"/var/run/docker.sock:/var/run/docker.sock\""),
                "the helper was given no way to reach the daemon");
        // The same path inside as outside, which is what makes `./data` in the
        // compose file resolve to the directory that actually holds the
        // wishlist: the daemon reads a bind source on the host, so a helper
        // running from /project would ask it for /project/data there.
        assertTrue(create.contains("\"/srv/relic finder:/srv/relic finder\""),
                "the helper was given no compose files to work from");
        assertTrue(create.contains("\"WorkingDir\":\"/srv/relic finder\""));
        assertTrue(create.contains("docker compose -f docker-compose.yaml pull"));

        // Kept rather than auto-removed: the command it runs kills the process
        // that would clean it up, and `docker logs` on it is what a failed
        // update tells people to read.
        assertTrue(create.contains("\"AutoRemove\":false"));
    }

    @Test
    void reportsRecreatingOnceTheHelperIsRunning() throws Exception {
        DockerUpdateInstaller installer = installer(true, "/srv/relics", "docker-compose.yaml");
        installer.start();
        awaitRequests(4);

        assertEquals(Stage.RECREATING, installer.state().stage());
    }

    /** Two clicks are one update: a second helper would fight the first. */
    @Test
    void aSecondStartJoinsTheRunningUpdate() throws Exception {
        DockerUpdateInstaller installer = installer(true, "/srv/relics", "docker-compose.yaml");
        installer.start();
        awaitRequests(4);

        int sent = requests.size();
        assertEquals(Stage.RECREATING, installer.start().stage());
        assertEquals(sent, requests.size(), "a second helper was created");
    }

    // ------------------------------------------------------------ fixtures --

    private DockerUpdateInstaller installer(boolean on, String projectDir, String composeFiles) {
        return new DockerUpdateInstaller(() -> status("docker", true), socket(), on, projectDir, composeFiles);
    }

    private DockerSocket socket() {
        return new DockerSocket(socketPath, Duration.ofSeconds(5));
    }

    private static UpdateStatus status(String platform, boolean available) {
        return new UpdateStatus("0.1.0", "0.2.0", available, true,
                "v0.2.0", "notes", "https://example.invalid/r", "2026-09-04T00:00:00Z",
                platform, null, Instant.now());
    }

    private void awaitRequests(int howMany) throws InterruptedException {
        long deadline = System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(10);
        while (System.currentTimeMillis() < deadline) {
            if (requests.size() >= howMany) return;
            Thread.sleep(20);
        }
        throw new AssertionError("only " + requests.size() + " request(s) reached the daemon: "
                + requests);
    }

    /**
     * Answers every request the updater makes, plausibly enough to get past it.
     *
     * <p>The inspect always says the helper is still running, which is what a
     * real one looks like right up to the moment it replaces this container —
     * so the watch loop keeps polling and the state stays at recreating, which
     * is what the tests read.
     */
    private void serve() {
        while (server.isOpen()) {
            try (SocketChannel channel = server.accept()) {
                String request = read(channel);
                requests.add(request);
                channel.write(ByteBuffer.wrap(answerTo(request)));
            } catch (IOException e) {
                return;
            }
        }
    }

    private static byte[] answerTo(String request) {
        String body = request.contains("/containers/create")
                ? "{\"Id\":\"helper-id\"}"
                : request.contains("/json")
                        ? "{\"State\":{\"Running\":true,\"ExitCode\":0}}"
                        : "{}";

        return ("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: "
                + body.getBytes(StandardCharsets.UTF_8).length + "\r\n\r\n" + body)
                .getBytes(StandardCharsets.UTF_8);
    }

    private static String read(SocketChannel channel) throws IOException {
        ByteArrayOutputStream collected = new ByteArrayOutputStream();
        ByteBuffer buffer = ByteBuffer.allocate(4096);

        while (channel.read(buffer) > 0) {
            buffer.flip();
            collected.write(buffer.array(), buffer.arrayOffset(), buffer.limit());
            buffer.clear();

            String far = collected.toString(StandardCharsets.UTF_8);
            if (!far.contains("\r\n\r\n")) continue;

            // Past the head, and the body arrived with it or there is none: a
            // Content-Length says how much more to wait for.
            int declared = contentLength(far);
            int body = far.length() - far.indexOf("\r\n\r\n") - 4;
            if (body >= declared) break;
        }
        return collected.toString(StandardCharsets.UTF_8);
    }

    private static int contentLength(String request) {
        for (String line : request.split("\r\n")) {
            if (line.toLowerCase().startsWith("content-length:")) {
                return Integer.parseInt(line.substring(line.indexOf(':') + 1).trim());
            }
        }
        return 0;
    }
}
