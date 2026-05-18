import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/runner-entry.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ["@holdpoint/types"],
});
