import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const roots = [
  {
    label: "Live UI",
    src: join(__dirname, "..", "..", "..", "apps", "live", "dist"),
    dest: join(__dirname, "..", "dist", "live-ui"),
  },
  {
    label: "Builder UI",
    src: join(__dirname, "..", "..", "..", "apps", "builder", "dist"),
    dest: join(__dirname, "..", "dist", "builder-ui"),
  },
];

for (const { label, src, dest } of roots) {
  if (!existsSync(src)) {
    console.warn(
      `⚠  ${label} dist not found at`,
      src,
      "\n   Run `pnpm turbo build` from the monorepo root so UI assets are bundled into the daemon.",
    );
    continue;
  }

  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }

  cpSync(src, dest, { recursive: true });
  console.log(`✓ ${label} copied to ${dest}`);
}
