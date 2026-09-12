package relics.reliceApi.service;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;

/**
 * The one place that decides whether a source may be read again on demand.
 *
 * <p>Server-side, and that is the whole point of it. warframe.market counts
 * requests per address and a Docker host behind NAT shares one address with
 * every user behind it, so a guard held in a browser tab would be as many
 * guards as there are tabs — each of them correct on its own while their sum
 * was not. One counter here answers for all of them.
 *
 * <p>Not {@link MarketRateLimiter}, which is the other half of the same
 * subject and cannot stand in for this one: that paces requests already
 * accepted, so a held-down F5 would queue one full re-read per reload and the
 * page would wait through every one of them. This decides whether to accept
 * the work at all.
 *
 * <p>A booking rather than a measurement: the slot is spent the moment it is
 * claimed, before the work starts and whatever the work turns out to do. That
 * is deliberate for the case where the source is down — a failing host is
 * exactly the one nobody should be allowed to ask again immediately.
 */
@Component
public class RefreshCooldown {

    private final Clock clock;

    /**
     * When each source may next be claimed. A source missing from here has
     * never been claimed, and is therefore free.
     */
    private final Map<RefreshSource, Instant> nextAllowedAt = new EnumMap<>(RefreshSource.class);

    public RefreshCooldown() {
        this(Clock.systemUTC());
    }

    /** For the tests, which need to step time rather than sleep through it. */
    RefreshCooldown(Clock clock) {
        this.clock = clock;
    }

    /**
     * Books the right to re-read one source.
     *
     * @return empty when the caller may go ahead, and otherwise when to come
     *         back. Empty is the permission itself, not a report of one: the
     *         slot is already spent when this returns.
     */
    public synchronized Optional<Instant> claim(RefreshSource source, Duration cooldown) {
        Instant now = clock.instant();
        Instant next = nextAllowedAt.get(source);

        if (next != null && next.isAfter(now)) return Optional.of(next);

        nextAllowedAt.put(source, now.plus(cooldown));
        return Optional.empty();
    }

    /**
     * When this source may next be claimed.
     *
     * <p>Read after a successful claim, to tell the caller how long the answer
     * it just got will be the answer. Never null: a source nobody has ever
     * claimed can be claimed now, and {@code now} is the honest way to say so.
     */
    public synchronized Instant nextAllowedAt(RefreshSource source) {
        Instant next = nextAllowedAt.get(source);
        Instant now = clock.instant();
        return next == null || next.isBefore(now) ? now : next;
    }
}
