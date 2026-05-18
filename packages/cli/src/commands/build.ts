import { execSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import chalk from "chalk";
import ora from "ora";

export async function buildCommand(): Promise<void> {
  const port = 4321;

  // Check if builder app is available (only works inside the Holdpoint monorepo)
  const builderPaths = [
    "apps/builder",
    "../builder", // when running from packages/cli
  ];

  const builderPath = builderPaths.find((p) => existsSync(p));

  if (!builderPath) {
    console.error(
      chalk.red("✗ The visual builder requires the Holdpoint monorepo to be present.\n"),
    );
    console.log(chalk.dim("  The builder is not yet available as a standalone hosted service."));
    console.log(chalk.dim("  To use it, clone the repo and run from within it:\n"));
    console.log(chalk.cyan("    git clone https://github.com/your-org/holdpoint"));
    console.log(chalk.cyan("    cd holdpoint && pnpm install"));
    console.log(chalk.cyan("    pnpm --filter @holdpoint/builder dev\n"));
    process.exit(1);
  }

  const spinner = ora(`Starting Holdpoint visual builder on port ${port}…`).start();

  const child = spawn("pnpm", ["--filter", "@holdpoint/builder", "dev", "--port", String(port)], {
    stdio: "inherit",
    detached: false,
  });

  child.on("error", (err) => {
    spinner.fail(chalk.red(`Failed to start builder: ${err.message}`));
    process.exit(1);
  });

  spinner.stop();

  console.log(
    `\n${chalk.green("✓")} Holdpoint builder running at ${chalk.cyan(`http://localhost:${port}`)}`,
  );
  console.log(chalk.dim("  Edit checks.yaml to hot-reload the canvas state"));
  console.log(chalk.dim("  Press Ctrl+C to stop\n"));

  // Open browser
  const openCmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    execSync(`${openCmd} http://localhost:${port}`, { stdio: "ignore" });
  } catch {
    /* non-fatal */
  }

  await new Promise<void>((resolve) => {
    child.on("exit", resolve);
  });
}
