import * as yaml from "js-yaml";
import type { SentinelConfig, ValidationResult } from "@sentinel/types";
import { SentinelConfigSchema } from "./schema.js";

/**
 * Parse a checks.yaml text into a SentinelConfig.
 * Throws on invalid YAML or schema violations.
 */
export function parseSentinelYaml(text: string): SentinelConfig {
  const raw = yaml.load(text);
  const result = SentinelConfigSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n");
    throw new Error(`Invalid checks.yaml:\n${messages}`);
  }
  return result.data as SentinelConfig;
}

/**
 * Validate a parsed SentinelConfig, returning structured errors.
 */
export function validateConfig(config: SentinelConfig): ValidationResult {
  const result = SentinelConfigSchema.safeParse(config);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })),
  };
}

/**
 * Serialize a SentinelConfig back to YAML text.
 */
export function generateYaml(config: SentinelConfig): string {
  return yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    quotingType: '"',
    forceQuotes: false,
    noRefs: true,
  });
}
