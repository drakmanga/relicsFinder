package relics.reliceApi.desktop;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
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
 * <p>What counts is a request for the page, not a request for the API, and the
 * difference is the whole reliability of the answer. A tab left over from the
 * version being replaced goes on polling {@code /api/app/update/install} while
 * the server is away, and its poll lands the instant the new one answers — so
 * counting any request at all would mean a stale tab, which cannot reload
 * itself and shows the old version forever, silently prevents the browser from
 * being opened. Asking for the page is something only a load or a reload does,
 * and a load or a reload is exactly the event worth waiting for.
 *
 * <p>It is not a greeting the page sends on purpose, either. A greeting would
 * only be sent by a version that knows to send it, and the tab that sits
 * through an update never is — it is running the version being replaced.
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
        if (isForThePage(request)) {
            lastSeen = System.nanoTime();
        }
        chain.doFilter(request, response);
    }

    /**
     * Whether this is a browser loading Relic Finder, rather than a page that
     * is already loaded talking to it.
     *
     * <p>Everything the application answers is either under {@code /api} or is
     * the page and what the page is built from, so the one prefix separates the
     * two without a list to keep up to date.
     */
    private static boolean isForThePage(ServletRequest request) {
        return request instanceof HttpServletRequest http
                && !http.getRequestURI().startsWith(API_PREFIX);
    }

    /** Everything the page asks for once it is already on screen. */
    private static final String API_PREFIX = "/api";

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
