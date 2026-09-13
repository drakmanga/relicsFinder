package relics.reliceApi.desktop;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * The one question this answers decides whether an update ends with one tab or
 * two, so both of its answers have to be right.
 *
 * <p>Saying "somebody is there" when nobody is leaves an update with nothing on
 * screen, which reads as an update that failed. Saying "nobody is there" when a
 * tab has just reloaded itself puts a second tab beside it, which is the whole
 * thing this was written to stop.
 */
class BrowserPresenceTest {

    private final BrowserPresence presence = new BrowserPresence();

    @Test
    void seesNobodyBeforeAnythingIsServed() {
        assertThat(presence.seenSince(System.nanoTime())).isFalse();
    }

    @Test
    void seesTheTabThatCameBack() throws Exception {
        long ready = System.nanoTime();

        serveOneRequest();

        assertThat(presence.seenSince(ready)).isTrue();
    }

    /**
     * A request served before the window opened is the wrong process's traffic
     * — or this one's own startup — and it must not be mistaken for the tab
     * this start is waiting on.
     */
    @Test
    void doesNotCountWhatWasServedBeforeTheWaitBegan() throws Exception {
        serveOneRequest();

        assertThat(presence.seenSince(System.nanoTime())).isFalse();
    }

    /** It watches, and must never be the reason a request does not get answered. */
    @Test
    void passesTheRequestStraightOn() throws Exception {
        ServletRequest request = mock(ServletRequest.class);
        ServletResponse response = mock(ServletResponse.class);
        FilterChain chain = mock(FilterChain.class);

        presence.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    private void serveOneRequest() throws Exception {
        presence.doFilter(
                mock(ServletRequest.class), mock(ServletResponse.class), mock(FilterChain.class));
    }
}
