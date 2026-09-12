package relics.reliceApi.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

/**
 * An ETag on the ranking, and on nothing else.
 *
 * <p>The declared use of {@code /api/tiers} is a poller: a second service that
 * renders only the Tier List and re-reads it every so often. The response tells
 * it when the numbers can first differ, but a poller that ignores that entirely
 * and asks every minute has to cost the instance almost nothing — and that is
 * what this buys. The filter hashes the body it was about to send and answers
 * 304 with no body when the caller already has that hash.
 *
 * <p>Registered for one path rather than for {@code /api/**}. The filter buffers
 * every response it covers in memory to hash it, which is worth doing for a
 * ranking somebody re-reads on a timer and not for the price batch, whose
 * caller is a browser that asks once and holds the answer in its own cache.
 *
 * <p>It is also why the response carries no field that moves on its own: a
 * timestamp of "now" in the body would make every hash different and this would
 * never answer 304. See {@code TierListResponse.nextUpdateAt}, which is a
 * property of the prices rather than of the moment the request arrived.
 */
@Configuration
public class TierListEtagConfig {

    /** Both spellings: the mapping is exact, and the trailing slash reaches it too. */
    private static final String[] PATHS = {"/api/tiers", "/api/tiers/*"};

    @Bean
    public FilterRegistrationBean<ShallowEtagHeaderFilter> tierListEtagFilter() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> registration =
                new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
        registration.addUrlPatterns(PATHS);
        registration.setName("tierListEtagFilter");
        return registration;
    }
}
