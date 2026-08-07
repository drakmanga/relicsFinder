/**
 * Bundles the render check with React included, then runs it in node.
 * Kept out of the published build — this only ever runs locally.
 */
import { build } from "esbuild";
import { rm, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// CJS output: react-dom/server is CommonJS and pulls in node builtins through
// require(), which an ESM bundle cannot satisfy.
const outfile = ".ds-verify/render-check.cjs";

await rm(".ds-verify", { recursive: true, force: true });
await mkdir(".ds-verify", { recursive: true });

await build({
  entryPoints: ["scripts/render-check.tsx"],
  outfile,
  bundle: true,
  format: "cjs",
  platform: "node",
  target: ["node18"],
  jsx: "automatic",
  logLevel: "warning",
});

const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
process.exit(result.status ?? 1);
