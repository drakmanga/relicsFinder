import { build } from "esbuild";
import { rm, mkdir } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

// JS: ESM bundle, React stays external so the host app owns the runtime.
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2020"],
  jsx: "automatic",
  external: ["react", "react-dom", "react/jsx-runtime"],
  sourcemap: true,
  logLevel: "info",
});

// CSS: one flat stylesheet. Every @import is inlined, so the rules travel in a
// single file. The fonts stay as separate .woff2 under dist/fonts/ — inlining
// 206KB of base64 into a render-blocking stylesheet would delay first paint on
// every page that uses the design system.
await build({
  entryPoints: ["src/styles/styles.css"],
  outfile: "dist/styles.css",
  bundle: true,
  loader: { ".woff2": "file" },
  assetNames: "fonts/[name]",
  logLevel: "info",
});

console.log("build ok");
