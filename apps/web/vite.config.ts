import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * The Spring Boot backend has no CORS configuration, so in development Vite
 * proxies /api to it rather than the browser calling it cross-origin. That
 * keeps the backend untouched and makes dev and prod use the same relative
 * URLs.
 *
 * In production the build output is what Spring Boot serves from
 * src/main/resources/static. That directory lives in the backend repo, which is
 * not checked out here — set RELICS_STATIC_DIR to point at it when the two are
 * side by side, otherwise the build lands in ./dist and can be copied.
 */
/**
 * Preloads the two font files that render above the fold.
 *
 * The stylesheet is render-blocking, but the fonts it names are only discovered
 * once it has been parsed — so the first paint of the masthead and of the table
 * happens in the fallback face and reflows when the real one lands. A preload
 * moves the request to the start of the page rather than to the end of the CSS.
 *
 * The names are hashed by the build, so they are read out of the bundle rather
 * than written here: a hardcoded filename would preload a file that no longer
 * exists and cost a request instead of saving one.
 *
 * latin-ext is deliberately not preloaded. It is the larger of the two Inter
 * subsets and carries glyphs no relic name uses.
 */
function preloadFonts() {
  const wanted = [/cinzel-.*\.woff2$/, /inter-400-700-latin-[^e][^/]*\.woff2$/];

  return {
    name: "rf-preload-fonts",
    apply: "build" as const,
    transformIndexHtml(html: string, ctx: { bundle?: Record<string, unknown> }) {
      const files = Object.keys(ctx.bundle ?? {}).filter((file) =>
        wanted.some((pattern) => pattern.test(file)),
      );

      return files.map((file) => ({
        tag: "link",
        attrs: {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: `/${file}`,
          crossorigin: "",
        },
        injectTo: "head" as const,
      }));
    },
  };
}

const staticDir = process.env.RELICS_STATIC_DIR;
const backend = process.env.RELICS_API_URL ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react(), preloadFonts()],

  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: backend,
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: staticDir ? resolve(staticDir) : "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
