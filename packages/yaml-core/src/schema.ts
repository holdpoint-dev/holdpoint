import { z } from "zod";

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const HookEventSchema = z.enum(["before_done"]);

export const ConditionOperatorSchema = z.enum([
  "file_exists",
  "file_contains",
  "env_var_set",
  "shell_returns_0",
]);

export const ConditionDefSchema = z.object({
  id: z.string().min(1),
  operator: ConditionOperatorSchema,
  path: z.string().optional(),
  contains: z.string().optional(),
  envVar: z.string().optional(),
  cmd: z.string().optional(),
});

/**
 * Per-item migration: handles legacy `trigger: { type, pattern }` → on/when
 * and legacy `manual:` field → `prompt:`.
 */
function migrateLegacyCheckDef(raw: unknown): unknown {
  if (raw == null || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const result: Record<string, unknown> = { ...obj };

  // migrate trigger: { type, pattern } → on/when
  if ("trigger" in result && !("on" in result) && !("when" in result)) {
    const { trigger } = result;
    delete result.trigger;
    const t = trigger as Record<string, unknown>;
    if (t.type !== "always") {
      result.when = t.type === "custom" ? t.pattern : t.type;
    }
  }

  // migrate manual: → prompt:
  if ("manual" in result && !("prompt" in result)) {
    result.prompt = result.manual;
    delete result.manual;
  }

  return result;
}

/**
 * Top-level migration: collapses ALL legacy array names into `checks:`.
 * Handles: deterministic, manual, task, prompt (any combination).
 * Existing `checks:` entries are preserved and come first.
 */
function migrateLegacyConfig(raw: unknown): unknown {
  if (raw == null || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const result: Record<string, unknown> = { ...obj };

  const toArray = (key: string) => (Array.isArray(result[key]) ? (result[key] as unknown[]) : []);

  const merged = [
    ...toArray("checks"),
    ...toArray("task"),
    ...toArray("prompt"),
    ...toArray("deterministic"),
    ...toArray("manual"),
  ].map(migrateLegacyCheckDef);

  if (
    "checks" in result ||
    "task" in result ||
    "prompt" in result ||
    "deterministic" in result ||
    "manual" in result
  ) {
    result.checks = merged;
    delete result.task;
    delete result.prompt;
    delete result.deterministic;
    delete result.manual;
  }

  return result;
}

export const CheckDefSchema = z.preprocess(
  migrateLegacyCheckDef,
  z
    .object({
      id: z.string().min(1),
      label: z.string().min(1),
      on: HookEventSchema.optional(),
      when: z.string().optional(),
      cmd: z.string().optional(),
      prompt: z.string().optional(),
      conditionId: z.string().optional(),
    })
    .refine((c) => c.cmd !== undefined || c.prompt !== undefined, {
      message: "A check must have either cmd (task) or prompt (agent instruction)",
    }),
);

export const HoldpointContextSchema = z.object({
  guides: z.record(z.string(), z.string()).default({}),
});

/** Built-in scope names that cannot be overridden by user-defined patterns. */
const BUILTIN_SCOPES = new Set([
  "frontend",
  "backend",
  "socket",
  "visual",
  "python",
  "go",
  "rust",
  "java",
  "ruby",
  "database",
  "prisma",
  "testing",
  "infra",
  "ci",
  "docs",
  "structural",
]);

const EnginesConfigSchema = z
  .object({
    claude: z
      .object({
        stop_command: z.string().optional(),
        live_command: z.string().optional(),
      })
      .optional(),
    codex: z.object({ stop_command: z.string().optional() }).optional(),
    copilot: z.object({ check_command: z.string().optional() }).optional(),
  })
  .optional();

export const HoldpointConfigSchema = z.preprocess(
  migrateLegacyConfig,
  z
    .object({
      version: z.number().int().positive().default(1),
      context: HoldpointContextSchema.default({ guides: {} }),
      conditions: z.array(ConditionDefSchema).default([]),
      checks: z.array(CheckDefSchema).default([]),
      patterns: z.record(z.string(), z.string()).optional(),
      session_context_files: z.array(z.string()).optional(),
      engines: EnginesConfigSchema,
    })
    .superRefine((data, ctx) => {
      if (!data.patterns) return;
      for (const [key, value] of Object.entries(data.patterns)) {
        if (BUILTIN_SCOPES.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `'${key}' is a built-in scope name and cannot be redefined in patterns`,
            path: ["patterns", key],
          });
        }
        try {
          new RegExp(value);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid regex in patterns.${key}: '${value}'`,
            path: ["patterns", key],
          });
        }
      }
    }),
);
