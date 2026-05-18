import { defineConfig } from "tsup";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  external: [
    "@holdpoint/types",
    "@holdpoint/yaml-core",
    "@holdpoint/engine-copilot",
    "@holdpoint/engine-claude",
    "@holdpoint/engine-cursor",
  ],
  onSuccess: async () => {
    // Copy templates into dist/templates/
    const templatesSrc = join(__dirname, "../../templates");
    const templatesDest = join(__dirname, "dist/templates");
    mkdirSync(templatesDest, { recursive: true });
    cpSync(templatesSrc, templatesDest, { recursive: true });

    // Copy the pre-built builder UI into dist/builder-ui/ so `holdpoint builder`
    // works for any installed user (not just inside the monorepo).
    const builderSrc = join(__dirname, "../../apps/builder/dist");
    const builderDest = join(__dirname, "dist/builder-ui");
    if (existsSync(builderSrc)) {
      mkdirSync(builderDest, { recursive: true });
      cpSync(builderSrc, builderDest, { recursive: true });
    } else {
      console.warn(
        "[tsup] apps/builder/dist not found — builder UI will not be included. " +
          "Run `pnpm --filter @holdpoint/builder build` first.",
      );
    }
  },
});
