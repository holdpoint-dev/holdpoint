import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function findChecksYaml(startDir: string): string | null {
  let dir = startDir;
  for (;;) {
    const candidate = join(dir, "checks.yaml");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function holdpointChecksPlugin(): Plugin {
  let checksPath: string | null = null;
  return {
    name: "holdpoint-checks",
    configResolved(config: ResolvedConfig) {
      checksPath = findChecksYaml(config.root);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/__holdpoint/initial-yaml") {
          if (!checksPath || !existsSync(checksPath)) {
            res.writeHead(404);
            res.end("");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(readFileSync(checksPath, "utf-8"));
          return;
        }

        if (req.url === "/__holdpoint/initial-reports") {
          const reportsPath = checksPath
            ? join(dirname(checksPath), ".holdpoint", "check-reports.json")
            : null;
          if (!reportsPath || !existsSync(reportsPath)) {
            res.writeHead(404);
            res.end("");
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(readFileSync(reportsPath, "utf-8"));
          return;
        }

        next();
      });
      if (checksPath) server.watcher.add(checksPath);
    },
    handleHotUpdate({ file, server }) {
      if (!checksPath || file !== checksPath) return;
      const yaml = readFileSync(file, "utf-8");
      server.ws.send({ type: "custom", event: "holdpoint:checks-yaml-changed", data: { yaml } });
      return [];
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/builder/" : "/",
  plugins: [holdpointChecksPlugin(), react(), tailwindcss()],
  server: {
    port: 4321,
    open: false,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
}));
