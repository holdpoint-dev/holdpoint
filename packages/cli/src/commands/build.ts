import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";

export async function buildCommand(): Promise<void> {
  const port = 4321;

  // Check if builder app is available
  const builderPaths = [
    "apps/builder",
    "../builder", // when running from packages/cli
  ];

  const builderPath = builderPaths.find((p) => existsSync(p));

  if (!builderPath) {
    console.error(chalk.red("Builder app not found. Make sure you are in the Sentinel repo root."));
    process.exit(1);
  }

  const spinner = ora(`Starting Sentinel visual builder on port ${port}…`).start();

  const child = spawn("pnpm", ["--filter", "@sentinel/builder", "dev", "--port", String(port)], {
    stdio: "inherit",
    detached: false,
  });

  child.on("error", (err) => {
    spinner.fail(chalk.red(`Failed to start builder: ${err.message}`));
    process.exit(1);
  });

  spinner.stop();

  console.log(`\n${chalk.green("✓")} Sentinel builder running at ${chalk.cyan(`http://localhost:${port}`)}`);
  console.log(chalk.dim("  Edit checks.yaml to hot-reload the canvas state"));
  console.log(chalk.dim("  Press Ctrl+C to stop\n"));

  // Open browser
  const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    execSync(`${openCmd} http://localhost:${port}`, { stdio: "ignore" });
  } catch { /* non-fatal */ }

  await new Promise<void>((resolve) => {
    child.on("exit", resolve);
  });
}
