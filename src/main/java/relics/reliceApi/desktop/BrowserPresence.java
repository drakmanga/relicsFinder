package relics.reliceApi.desktop;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Whether anybody is looking at this copy of Relic Finder.
 *
 * <p>It answers one question, asked once, a few seconds after an update has put
 * the new version in place: is the browser tab that started the update still
 * open? If it is, it reloads itself onto the new version and the update ends
 * with the one tab the reader already had. If it is not — the browser was
 * closed while the installer ran — nothing would appear at all, and somebody
 * who applied an update and saw nothing would reasonably conclude it failed.
 *
 * <p>Any request at all counts, rather than a greeting the page sends on
 * purpose. Nothing but a browser talks to this server, so a request is a
 * browser; and a greeting would only be sent by a version that knows to send
 * it, which the tab waiting through the update never is — it is running the
 * version being replaced. Counting every request is what makes this work on the
 * first update as well as the ones after it.
 *
 * <p>On the desktop only. A container serves whoever asks and has no browser of
 * its own to reason about.
 */
@Component
@ConditionalOnProperty(name = DesktopRuntime.FLAG, havingValue = "true")
public class BrowserPresence implements Filter {

    /** When the last request arrived, or zero when none has. */
    private volatile long lastSeen;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        lastSeen = System.nanoTime();
        chain.doFilter(request, response);
    }

    /**
     * Whether anything has been served since this process started listening.
     *
     * <p>Measured against a nanosecond reading taken by the caller rather than
     * against a wall clock, because the window is a few seconds long and a
     * clock that steps — a daylight saving change, an NTP correction — would
     * decide this wrongly.
     */
    public boolean seenSince(long startedAtNanos) {
        long seen = lastSeen;
        return seen != 0 && seen - startedAtNanos > 0;
    }
}
