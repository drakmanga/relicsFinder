package relics.reliceApi.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.StandardProtocolFamily;
import java.net.UnixDomainSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.SocketChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * The little of HTTP that talking to the Docker daemon needs, over its socket.
 *
 * <p>The daemon speaks ordinary HTTP/1.1 down a unix domain socket, and
 * {@link java.net.http.HttpClient} cannot open one — it takes a URI with a host
 * and a port, and there is neither here. So the requests are written by hand.
 * That sounds worse than it is: four endpoints, all local, all answering JSON,
 * and the alternative is a client library carrying a transitive dependency tree
 * for the sake of about eighty lines.
 *
 * <p>Every request opens its own connection and asks for it to be closed at the
 * end. Keeping one alive would mean owning its lifetime, noticing when the
 * daemon restarts under it, and framing responses on a stream that no longer
 * ends — for a caller that makes a handful of calls a month.
 *
 * <p>Nothing here knows what Docker is for. It sends a method, a path and maybe
 * a JSON body, and returns a status and a string; what those mean is
 * {@link DockerUpdateInstaller}'s business.
 */
public final class DockerSocket {

    /** Where the daemon listens on every ordinary Linux install. */
    public static final Path DEFAULT_PATH = Path.of("/var/run/docker.sock");

    /**
     * The API version the paths are written against.
     *
     * <p>Pinned rather than left off. An unversioned path is served by whatever
     * the daemon's newest version happens to be, so the day a field is renamed
     * this breaks on somebody's machine and not on any of ours. 1.41 shipped
     * with Docker 20.10, in 2020, and the daemon still serves it.
     */
    static final String API_VERSION = "v1.41";

    private static final byte[] HEADER_END = {'\r', '\n', '\r', '\n'};

    private static final int READ_BUFFER_BYTES = 16 * 1024;

    private final Path socketPath;
    private final Duration timeout;

    public DockerSocket(Path socketPath, Duration timeout) {
        this.socketPath = socketPath;
        this.timeout = timeout;
    }

    /** What the daemon answered: the status line's code, and the body as text. */
    public record Response(int status, String body) {

        public boolean ok() {
            return status >= 200 && status < 300;
        }
    }

    /**
     * Whether there is a socket here at all.
     *
     * <p>Which is the whole of the "was this switched on" question: the socket
     * is in the container only because somebody put it there, so its absence is
     * the ordinary case and not a fault.
     */
    public boolean present() {
        return Files.exists(socketPath);
    }

    public Response get(String path) throws IOException {
        return send("GET", path, null);
    }

    /** {@code body} may be null, for the endpoints that take none. */
    public Response post(String path, String body) throws IOException {
        return send("POST", path, body);
    }

    private Response send(String method, String path, String body) throws IOException {
        UnixDomainSocketAddress address = UnixDomainSocketAddress.of(socketPath);

        try (SocketChannel channel = SocketChannel.open(StandardProtocolFamily.UNIX)) {
            // A SocketChannel has no read timeout, and a blocking read from a
            // daemon that stopped answering would hang an update rather than
            // fail it. Closing the channel is what unblocks a blocked read, so
            // that is what the deadline does. Firing after a normal close is
            // harmless: closing a closed channel does nothing.
            CompletableFuture.delayedExecutor(timeout.toMillis(), TimeUnit.MILLISECONDS)
                    .execute(() -> closeQuietly(channel));

            channel.connect(address);
            channel.write(ByteBuffer.wrap(request(method, path, body)));

            return parse(readToEnd(channel));
        }
    }

    private byte[] request(String method, String path, String body) {
        byte[] payload = body == null
                ? new byte[0]
                : body.getBytes(StandardCharsets.UTF_8);

        StringBuilder head = new StringBuilder()
                .append(method).append(' ').append('/').append(API_VERSION).append(path)
                .append(" HTTP/1.1\r\n")
                // Required by HTTP/1.1 and ignored by the daemon, which is
                // reached by path rather than by name.
                .append("Host: docker\r\n")
                .append("User-Agent: ").append(ApiIdentity.USER_AGENT).append("\r\n")
                .append("Accept: application/json\r\n")
                .append("Connection: close\r\n");

        if (body != null) {
            head.append("Content-Type: application/json\r\n")
                    .append("Content-Length: ").append(payload.length).append("\r\n");
        }
        head.append("\r\n");

        byte[] headBytes = head.toString().getBytes(StandardCharsets.UTF_8);
        byte[] whole = new byte[headBytes.length + payload.length];
        System.arraycopy(headBytes, 0, whole, 0, headBytes.length);
        System.arraycopy(payload, 0, whole, headBytes.length, payload.length);
        return whole;
    }

    /** Reads until the daemon closes, which {@code Connection: close} makes the end. */
    private static byte[] readToEnd(SocketChannel channel) throws IOException {
        ByteArrayOutputStream collected = new ByteArrayOutputStream();
        ByteBuffer buffer = ByteBuffer.allocate(READ_BUFFER_BYTES);

        while (channel.read(buffer) >= 0) {
            buffer.flip();
            collected.write(buffer.array(), buffer.arrayOffset(), buffer.limit());
            buffer.clear();
        }
        return collected.toByteArray();
    }

    private static Response parse(byte[] raw) throws IOException {
        int headerEnd = indexOf(raw, HEADER_END);
        if (headerEnd < 0) {
            throw new IOException("The Docker socket answered something that is not HTTP");
        }

        String head = new String(raw, 0, headerEnd, StandardCharsets.UTF_8);
        String[] lines = head.split("\r\n");

        // HTTP/1.1 201 Created
        String[] statusLine = lines[0].split(" ");
        if (statusLine.length < 2) {
            throw new IOException("The Docker socket answered without a status: " + lines[0]);
        }

        int status;
        try {
            status = Integer.parseInt(statusLine[1]);
        } catch (NumberFormatException e) {
            throw new IOException("The Docker socket answered with a status of " + statusLine[1], e);
        }

        byte[] body = new byte[raw.length - headerEnd - HEADER_END.length];
        System.arraycopy(raw, headerEnd + HEADER_END.length, body, 0, body.length);

        return new Response(status, isChunked(lines) ? dechunk(body) : text(body));
    }

    private static boolean isChunked(String[] headerLines) {
        for (int i = 1; i < headerLines.length; i++) {
            String line = headerLines[i].toLowerCase(Locale.ROOT);
            if (line.startsWith("transfer-encoding:") && line.contains("chunked")) return true;
        }
        return false;
    }

    /**
     * Undoes chunked framing.
     *
     * <p>Needed because {@code /images/create} reports a pull as it happens and
     * so cannot know its own length. Without this its body arrives with hex
     * lengths interleaved through the JSON, and the JSON no longer parses —
     * which is a confusing way to be told a pull worked.
     */
    private static String dechunk(byte[] body) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        int at = 0;

        while (at < body.length) {
            int lineEnd = indexOf(body, at, new byte[] {'\r', '\n'});
            if (lineEnd < 0) break;

            // A chunk header may carry extensions after a semicolon. Nothing
            // here uses them, and the length is what comes before.
            String header = new String(body, at, lineEnd - at, StandardCharsets.UTF_8).trim();
            int semicolon = header.indexOf(';');
            if (semicolon >= 0) header = header.substring(0, semicolon);

            int length;
            try {
                length = Integer.parseInt(header.trim(), 16);
            } catch (NumberFormatException e) {
                throw new IOException("A chunk from the Docker socket had no length: " + header, e);
            }
            if (length == 0) break;

            int from = lineEnd + 2;
            if (from + length > body.length) {
                throw new IOException("A chunk from the Docker socket was cut short");
            }
            out.write(body, from, length);

            // Past the chunk and the CRLF that closes it.
            at = from + length + 2;
        }
        return text(out.toByteArray());
    }

    private static String text(byte[] bytes) {
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private static int indexOf(byte[] haystack, byte[] needle) {
        return indexOf(haystack, 0, needle);
    }

    private static int indexOf(byte[] haystack, int from, byte[] needle) {
        outer:
        for (int i = from; i <= haystack.length - needle.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) continue outer;
            }
            return i;
        }
        return -1;
    }

    private static void closeQuietly(SocketChannel channel) {
        try {
            channel.close();
        } catch (IOException e) {
            // The read this was meant to unblock reports the failure. There is
            // nothing a second complaint from a timer thread would add.
        }
    }
}
