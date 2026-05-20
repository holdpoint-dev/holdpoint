import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "..", "..", "apps", "live", "dist");
const dest = join(__dirname, "..", "dist", "live-ui");

if (!existsSync(src)) {
  console.warn(
    "⚠  Live UI dist not found at",
    src,
    "\n   Run `pnpm turbo build --filter @holdpoint/live` first, or use `pnpm turbo build` from the monorepo root.",
  );
  process.exit(0);
}

if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}

cpSync(src, dest, { recursive: true });
console.log("✓ Live UI copied to dist/live-ui");
