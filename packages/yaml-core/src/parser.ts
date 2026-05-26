import * as yaml from "js-yaml";
import type { HoldpointConfig, ValidationResult } from "@holdpoint/types";
import { HoldpointConfigSchema } from "./schema.js";

/**
 * Parse a checks.yaml text into a HoldpointConfig.
 * Throws on invalid YAML or schema violations.
 */
export function parseHoldpointYaml(text: string): HoldpointConfig {
  const raw = yaml.load(text);
  const result = HoldpointConfigSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`Invalid checks.yaml:\n${messages}`);
  }
  return result.data as HoldpointConfig;
}

/**
 * Validate a parsed HoldpointConfig, returning structured errors.
 */
export function validateConfig(config: HoldpointConfig): ValidationResult {
  const result = HoldpointConfigSchema.safeParse(config);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })),
  };
}

/**
 * Serialize a HoldpointConfig back to YAML text.
 */
export function generateYaml(config: HoldpointConfig): string {
  return yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    quotingType: '"',
    forceQuotes: false,
    noRefs: true,
  });
}
