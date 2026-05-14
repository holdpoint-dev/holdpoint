import { defineConfig } from "tsup";

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
});
