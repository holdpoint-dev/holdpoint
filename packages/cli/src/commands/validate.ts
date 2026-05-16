import { existsSync, readFileSync } from "node:fs";
import chalk from "chalk";
import { parseSentinelYaml, validateConfig } from "@sentinel/yaml-core";

export async function validateCommand(): Promise<void> {
  if (!existsSync("checks.yaml")) {
    console.error(chalk.red("No checks.yaml found. Run `sentinel init` first."));
    process.exit(1);
  }

  const text = readFileSync("checks.yaml", "utf8");

  let config;
  try {
    config = parseSentinelYaml(text);
  } catch (err: unknown) {
    console.error(chalk.red("Parse error:"), (err as Error).message);
    process.exit(1);
  }

  const result = validateConfig(config);

  if (result.valid) {
    console.log(chalk.green("✓ checks.yaml is valid"));
    console.log(
      chalk.dim(
        `  ${config.task.length} tasks, ${config.prompt.length} prompts, ${config.conditions.length} conditions`,
      ),
    );
  } else {
    console.error(chalk.red("✗ checks.yaml has errors:"));
    for (const err of result.errors) {
      console.error(`  ${chalk.yellow(err.path)}: ${err.message}`);
    }
    process.exit(1);
  }
}
