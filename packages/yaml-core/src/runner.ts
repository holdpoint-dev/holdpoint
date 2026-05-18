import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import type { CheckDef, CheckResult, ConditionDef, HoldpointConfig } from "@holdpoint/types";
import { matchesWhen } from "./trigger.js";

function evaluateCondition(condition: ConditionDef): boolean {
  switch (condition.operator) {
    case "file_exists":
      return condition.path != null && existsSync(condition.path);

    case "file_contains": {
      if (!condition.path || !condition.contains) return false;
      if (!existsSync(condition.path)) return false;
      const content = readFileSync(condition.path, "utf8");
      return content.includes(condition.contains);
    }

    case "env_var_set":
      return condition.envVar != null && process.env[condition.envVar] !== undefined;

    case "shell_returns_0": {
      if (!condition.cmd) return false;
      try {
        execSync(condition.cmd, { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    }
  }
}

function runCheck(check: CheckDef): CheckResult {
  if (!check.cmd) {
    return { check, status: "pending" };
  }
  try {
    const output = execSync(check.cmd, {
      stdio: "pipe",
      encoding: "utf8",
      timeout: 60_000,
    });
    return { check, status: "pass", output, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    const output = [e.stdout, e.stderr].filter(Boolean).join("\n");
    return { check, status: "fail", output, exitCode: e.status ?? 1 };
  }
}

/**
 * Run all task checks (those with cmd) against the given changed files.
 * Checks whose trigger doesn't match are skipped.
 * Checks with a failing condition (false branch) are skipped.
 */
export function runDeterministicChecks(
  config: HoldpointConfig,
  changedFiles: string[],
): CheckResult[] {
  const conditionMap = new Map(config.conditions.map((c) => [c.id, c]));
  const taskChecks = config.checks.filter((c) => c.cmd !== undefined);

  return taskChecks.map((check) => {
    if (!matchesWhen(check.when, changedFiles)) {
      return {
        check,
        status: "skip",
        skipReason: `'when: ${check.when}' did not match changed files`,
      };
    }

    if (check.conditionId) {
      const condition = conditionMap.get(check.conditionId);
      if (!condition) {
        return {
          check,
          status: "skip",
          skipReason: `Condition '${check.conditionId}' not found`,
        };
      }
      if (!evaluateCondition(condition)) {
        return {
          check,
          status: "skip",
          skipReason: `Condition '${check.conditionId}' evaluated to false`,
        };
      }
    }

    return runCheck(check);
  });
}
