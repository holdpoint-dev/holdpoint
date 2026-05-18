import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import chalk from "chalk";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".json": "application/json",
};

/**
 * Serve a static file with the appropriate MIME type.
 */
function serveFile(res: ServerResponse, filePath: string): void {
  const mime = MIME[extname(filePath)] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": mime });
  createReadStream(filePath).pipe(res);
}

/**
 * Handle an incoming HTTP request: serve `/__holdpoint/initial-yaml` from the
 * user's `checks.yaml`, `/__holdpoint/initial-reports` from the run history,
 * and all other paths as static files from `uiDir` with a SPA fallback to `index.html`.
 */
function handleRequest(req: IncomingMessage, res: ServerResponse, uiDir: string): void {
  const url = (req.url ?? "/").split("?")[0] ?? "/";

  // Serve the user's checks.yaml for the builder UI to load
  if (url === "/__holdpoint/initial-yaml") {
    const checksPath = join(process.cwd(), "checks.yaml");
    if (existsSync(checksPath)) {
      res.writeHead(200, { "Content-Type": "text/yaml; charset=utf-8" });
      createReadStream(checksPath).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("checks.yaml not found in current directory");
    }
    return;
  }

  // Serve the check run history for the History tab
  if (url === "/__holdpoint/initial-reports") {
    const reportsPath = join(process.cwd(), ".holdpoint", "check-reports.json");
    if (existsSync(reportsPath)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      createReadStream(reportsPath).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("No check reports found");
    }
    return;
  }

  // Static files
  const candidate = join(uiDir, url === "/" ? "index.html" : url);
  const filePath = existsSync(candidate) ? candidate : join(uiDir, "index.html"); // SPA fallback
  serveFile(res, filePath);
}

/**
 * Start the Holdpoint visual builder on localhost:4321.
 *
 * Serves the pre-built React SPA from `dist/builder-ui/` (bundled into the CLI
 * package at publish time) and exposes a `/__holdpoint/initial-yaml` endpoint
 * that returns the user's `checks.yaml` so the builder can load it on startup.
 */
export async function buildCommand(): Promise<void> {
  const port = 4321;
  const uiDir = join(__dirname, "builder-ui");

  if (!existsSync(uiDir)) {
    console.error(chalk.red("✗ Builder UI not found.\n"));
    console.log(chalk.dim("  This is unexpected for a published build of @holdpoint/cli."));
    console.log(chalk.dim("  If you installed from source, rebuild with: pnpm turbo build\n"));
    process.exit(1);
  }

  const server = createServer((req, res) => handleRequest(req, res, uiDir));

  await new Promise<void>((resolve, reject) => {
    server.listen(port, () => {
      console.log(
        `\n${chalk.green("✓")} Holdpoint builder running at ${chalk.cyan(`http://localhost:${port}`)}`,
      );
      console.log(chalk.dim("  Edit checks.yaml, then reload the page to see updates"));
      console.log(chalk.dim("  Press Ctrl+C to stop\n"));

      const openCmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      try {
        execSync(`${openCmd} http://localhost:${port}`, { stdio: "ignore" });
      } catch {
        /* non-fatal */
      }
    });

    server.on("error", reject);

    process.on("SIGINT", () => {
      console.log(chalk.dim("\n  Stopping builder…"));
      server.close(() => resolve());
    });
  });
}
