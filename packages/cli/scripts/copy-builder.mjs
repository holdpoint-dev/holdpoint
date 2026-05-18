/**
 * Copies the pre-built builder UI into the CLI's dist directory so it can be
 * served by `holdpoint build` without requiring the full monorepo.
 *
 * Called automatically after `tsup` via the `build` npm script.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "..", "..", "apps", "builder", "dist");
const dest = join(__dirname, "..", "dist", "builder-ui");

if (!existsSync(src)) {
  console.warn(
    "⚠  Builder dist not found at",
    src,
    "\n   Run `pnpm turbo build --filter @holdpoint/builder` first, or use `pnpm turbo build` from the monorepo root.",
  );
  process.exit(0); // non-fatal — CLI itself compiled fine
}

if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}

cpSync(src, dest, { recursive: true });
console.log("✓ Builder UI copied to dist/builder-ui");
