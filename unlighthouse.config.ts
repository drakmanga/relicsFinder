/**
 * Lighthouse over every view.
 *
 * The crawler finds one route on its own and stops: this is a single-page app
 * whose navigation is buttons, so there are no internal links to follow. The
 * six views are listed by hand — the same six the axe check walks — because a
 * measurement of the home page alone says nothing about the five screens made
 * of dense tables.
 */
export default {
  site: "http://localhost:4173",
  scanner: {
    // Nothing to crawl; the list below is the whole site as far as this is
    // concerned.
    sitemap: false,
    robotsTxt: false,
    samples: 1,
  },
  urls: ["/", "/?view=items", "/?view=sets", "/?view=wishlist", "/?view=ducats", "/?view=endo"],
};
