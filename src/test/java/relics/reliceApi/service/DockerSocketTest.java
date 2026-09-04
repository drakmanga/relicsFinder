package relics.reliceApi.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The hand-written HTTP, against a real unix socket with a fake daemon on the
 * other end.
 *
 * <p>A fake rather than the real Docker daemon, because this has to run on a
 * machine that does not have one — and because the cases worth testing are the
 * ones a working daemon never produces: a chunked body, a truncated chunk, an
 * answer that is not HTTP at all, and a daemon that accepts a connection and
 * then says nothing.
 *
 * <p>The socket is created under a short temporary directory rather than
 * JUnit's: a unix socket path is limited to about 108 characters by the kernel,
 * and {@code @TempDir} paths have been long enough to cross it.
 */
class DockerSocketTest {

    private Path directory;
    private Path socketPath;
    private ServerSocketChannel server;
    private Thread daemon;

    /** What the fake answers with, as raw bytes, so a test can malform it. */
    private final AtomicReference<byte[]> answer = new AtomicReference<>();

    /** The request the fake read, for the tests that check what was sent. */
    private final AtomicReference<String> received = new AtomicReference<>("");

    private final CountDownLatch answered = new CountDownLatch(1);

    /** Set to make the fake accept the connection and then never reply. */
    private volatile boolean mute;

    @BeforeEach
    void startFakeDaemon() throws IOException {
        directory = Files.createTempDirectory("ds");
        socketPath = directory.resolve("docker.sock");

        server = ServerSocketChannel.open(StandardProtocolFamily.UNIX);
        server.bind(UnixDomainSocketAddress.of(socketPath));

        answer.set(http(200, "{\"Id\":\"abc123\"}"));

        daemon = new Thread(this::serveOne, "fake-docker");
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

    @Test
    void readsTheStatusAndTheBody() throws IOException {
        DockerSocket.Response response = socket().get("/containers/abc/json");

        assertEquals(200, response.status());
        assertTrue(response.ok());
        assertEquals("{\"Id\":\"abc123\"}", response.body());
    }

    @Test
    void everyPathCarriesThePinnedApiVersion() throws IOException {
        socket().get("/containers/abc/json");

        assertTrue(request().startsWith("GET /" + DockerSocket.API_VERSION + "/containers/abc/json "),
                "the request line was: " + request().lines().findFirst().orElse(""));
    }

    /**
     * The daemon frames the response by closing, so a request that forgot to ask
     * for that would read until the deadline and then look like a timeout.
     */
    @Test
    void asksForTheConnectionToBeClosed() throws IOException {
        socket().get("/_ping");

        assertTrue(request().contains("Connection: close\r\n"));
    }

    @Test
    void sendsAJsonBodyWithItsLength() throws IOException {
        String body = "{\"Image\":\"docker:cli\"}";
        socket().post("/containers/create", body);

        assertTrue(request().contains("Content-Type: application/json\r\n"));
        assertTrue(request().contains("Content-Length: " + body.length() + "\r\n"));
        assertTrue(request().endsWith(body), "the body was not sent after the headers");
    }

    /** A start takes none, and a Content-Length of 0 is not the same as no body. */
    @Test
    void sendsNoBodyHeadersWhenThereIsNoBody() throws IOException {
        socket().post("/containers/abc/start", null);

        assertFalse(request().contains("Content-Type:"));
        assertFalse(request().contains("Content-Length:"));
    }

    @Test
    void readsAnEmptyAnswerWithNoBody() throws IOException {
        answer.set(http(204, ""));

        DockerSocket.Response response = socket().post("/containers/abc/start", null);

        assertEquals(204, response.status());
        assertTrue(response.ok());
        assertEquals("", response.body());
    }

    @Test
    void reportsAFailureRatherThanThrowingOnIt() throws IOException {
        answer.set(http(404, "{\"message\":\"No such container\"}"));

        DockerSocket.Response response = socket().post("/containers/nope/start", null);

        assertEquals(404, response.status());
        assertFalse(response.ok());
        assertTrue(response.body().contains("No such container"));
    }

    /**
     * The one the pull endpoint needs. Without de-chunking, the hex lengths sit
     * interleaved through the JSON and it stops parsing — a confusing way to be
     * told a pull worked.
     */
    @Test
    void undoesChunkedFraming() throws IOException {
        answer.set(chunked(200, "{\"status\":\"Pulling\"}\n", "{\"status\":\"Done\"}\n"));

        DockerSocket.Response response = socket().post("/images/create?fromImage=docker", null);

        assertEquals(200, response.status());
        assertEquals("{\"status\":\"Pulling\"}\n{\"status\":\"Done\"}\n", response.body());
    }

    /** A chunk header may carry extensions, and the length is what precedes them. */
    @Test
    void readsAChunkLengthThatCarriesAnExtension() throws IOException {
        String body = "5;name=value\r\nhello\r\n0\r\n\r\n";
        answer.set(raw("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n" + body));

        assertEquals("hello", socket().get("/anything").body());
    }

    @Test
    void refusesAChunkedBodyThatWasCutShort() {
        answer.set(raw("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\nff\r\nshort"));

        IOException thrown = assertThrows(IOException.class, () -> socket().get("/anything"));
        assertTrue(thrown.getMessage().contains("cut short"), thrown.getMessage());
    }

    @Test
    void refusesAnAnswerThatIsNotHttp() {
        answer.set(raw("this is not a response"));

        IOException thrown = assertThrows(IOException.class, () -> socket().get("/anything"));
        assertTrue(thrown.getMessage().contains("not HTTP"), thrown.getMessage());
    }

    @Test
    void refusesAStatusThatIsNotANumber() {
        answer.set(raw("HTTP/1.1 banana Created\r\n\r\n"));

        IOException thrown = assertThrows(IOException.class, () -> socket().get("/anything"));
        assertTrue(thrown.getMessage().contains("banana"), thrown.getMessage());
    }

    /**
     * A daemon that accepts and then goes quiet. Without the deadline this blocks
     * for as long as the process lives, and an update that hangs is worse than
     * one that fails: nothing on screen ever changes and there is nothing to
     * retry.
     */
    @Test
    void givesUpOnADaemonThatAcceptsAndThenSaysNothing() {
        mute = true;

        DockerSocket socket = new DockerSocket(socketPath, Duration.ofMillis(300));

        long before = System.currentTimeMillis();
        assertThrows(IOException.class, () -> socket.get("/anything"));
        long took = System.currentTimeMillis() - before;

        assertTrue(took < 5_000, "it waited " + took + "ms rather than giving up");
    }

    @Test
    void saysWhetherThereIsASocketAtAll() {
        assertTrue(socket().present());
        assertFalse(new DockerSocket(directory.resolve("absent.sock"), Duration.ofSeconds(1)).present());
    }

    // ------------------------------------------------------------ fixtures --

    private DockerSocket socket() {
        return new DockerSocket(socketPath, Duration.ofSeconds(5));
    }

    private String request() {
        try {
            answered.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return received.get();
    }

    /** Serves exactly one request, which is all any test here makes. */
    private void serveOne() {
        try (SocketChannel channel = server.accept()) {
            ByteArrayOutputStream request = new ByteArrayOutputStream();
            ByteBuffer buffer = ByteBuffer.allocate(4096);

            // Reads until the head is complete, and then whatever body came with
            // it in the same read. Enough for requests this small, and it must
            // not read to EOF: the client does not close before it expects an
            // answer.
            while (channel.read(buffer) > 0) {
                buffer.flip();
                request.write(buffer.array(), buffer.arrayOffset(), buffer.limit());
                buffer.clear();
                if (request.toString(StandardCharsets.UTF_8).contains("\r\n\r\n")) break;
            }
            received.set(request.toString(StandardCharsets.UTF_8));
            answered.countDown();

            if (mute) {
                Thread.sleep(30_000);
                return;
            }
            channel.write(ByteBuffer.wrap(answer.get()));
        } catch (IOException | InterruptedException e) {
            // The test closed the server, or the deadline closed the client.
            answered.countDown();
        }
    }

    private static byte[] http(int status, String body) {
        return raw("HTTP/1.1 " + status + " Whatever\r\n"
                + "Content-Type: application/json\r\n"
                + "Content-Length: " + body.getBytes(StandardCharsets.UTF_8).length + "\r\n"
                + "\r\n" + body);
    }

    private static byte[] chunked(int status, String... parts) {
        StringBuilder out = new StringBuilder("HTTP/1.1 " + status + " OK\r\n"
                + "Transfer-Encoding: chunked\r\n\r\n");

        for (String part : parts) {
            out.append(Integer.toHexString(part.getBytes(StandardCharsets.UTF_8).length))
                    .append("\r\n").append(part).append("\r\n");
        }
        return raw(out.append("0\r\n\r\n").toString());
    }

    private static byte[] raw(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }
}
