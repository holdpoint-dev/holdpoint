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
  },
});
