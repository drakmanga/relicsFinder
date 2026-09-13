package relics.reliceApi.desktop;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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

        serve("/");

        assertThat(presence.seenSince(ready)).isTrue();
    }

    /**
     * The case that decides whether this works on the first update that ships
     * it. The tab sitting through an update is running the version being
     * replaced: it cannot reload itself, and it goes on polling the install
     * endpoint the whole time the server is away. Counted, that poll would say
     * "somebody is here" the instant the new copy answered — and the reader
     * would be left with one stale tab, no new one, and nothing on screen
     * saying the update had finished.
     */
    @Test
    void doesNotCountAPageThatIsMerelyStillTalking() throws Exception {
        long ready = System.nanoTime();

        serve("/api/app/update/install");

        assertThat(presence.seenSince(ready)).isFalse();
    }

    /** What a page is built from arrives with it and means the same thing. */
    @Test
    void countsWhatALoadPullsInBehindIt() throws Exception {
        long ready = System.nanoTime();

        serve("/assets/index-BnCOh6FY.js");

        assertThat(presence.seenSince(ready)).isTrue();
    }

    /**
     * A request served before the window opened is this process's own startup,
     * or the previous one's traffic, and must not be mistaken for the tab this
     * start is waiting on.
     */
    @Test
    void doesNotCountWhatWasServedBeforeTheWaitBegan() throws Exception {
        serve("/");

        assertThat(presence.seenSince(System.nanoTime())).isFalse();
    }

    /** It watches, and must never be the reason a request goes unanswered. */
    @Test
    void passesTheRequestStraightOn() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/wishlist");
        ServletResponse response = mock(ServletResponse.class);
        FilterChain chain = mock(FilterChain.class);

        presence.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
    }

    /**
     * Nothing but HTTP reaches this, but the cast is guarded and the guard is
     * worth a test: a request it cannot read the path of must not be counted as
     * a page load, which would open no browser on an update that needed one.
     */
    @Test
    void doesNotCountSomethingItCannotReadThePathOf() throws Exception {
        long ready = System.nanoTime();

        presence.doFilter(
                mock(ServletRequest.class), mock(ServletResponse.class), mock(FilterChain.class));

        assertThat(presence.seenSince(ready)).isFalse();
    }

    private void serve(String path) throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn(path);
        presence.doFilter(request, mock(ServletResponse.class), mock(FilterChain.class));
    }
}
