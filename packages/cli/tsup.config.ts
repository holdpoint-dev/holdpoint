import { defineConfig } from "tsup";
import { cpSync, mkdirSync } from "node:fs";
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
    "@sentinel/types",
    "@sentinel/yaml-core",
    "@sentinel/engine-copilot",
    "@sentinel/engine-claude",
    "@sentinel/engine-cursor",
  ],
  onSuccess: async () => {
    // Bundle templates into dist/templates/ so they're available in the published package
    const src = join(__dirname, "../../templates");
    const dest = join(__dirname, "dist/templates");
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  },
});
