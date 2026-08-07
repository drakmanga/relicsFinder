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
const staticDir = process.env.RELICS_STATIC_DIR;
const backend = process.env.RELICS_API_URL ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],

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
