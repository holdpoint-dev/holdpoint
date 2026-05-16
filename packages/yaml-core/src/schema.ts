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
 * Migrate legacy `trigger: { type, pattern }` format to the new `on`/`when` fields,
 * and legacy `manual:` field to `prompt:`.
 * This runs transparently so old checks.yaml files load without errors.
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
 * Migrate legacy top-level `manual:` → `prompt:` and `deterministic:` → `task:`.
 */
function migrateLegacyConfig(raw: unknown): unknown {
  if (raw == null || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const result: Record<string, unknown> = { ...obj };

  if ("manual" in result && !("prompt" in result)) {
    result.prompt = result.manual;
    delete result.manual;
  }

  if ("deterministic" in result && !("task" in result)) {
    result.task = result.deterministic;
    delete result.deterministic;
  }

  return result;
}

export const CheckDefSchema = z.preprocess(
  migrateLegacyCheckDef,
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    on: HookEventSchema.optional(),
    when: z.string().optional(),
    cmd: z.string().optional(),
    prompt: z.string().optional(),
    conditionId: z.string().optional(),
  }),
);

export const SentinelContextSchema = z.object({
  guides: z.record(z.string()).default({}),
});

export const SentinelConfigSchema = z.preprocess(
  migrateLegacyConfig,
  z.object({
    version: z.number().int().positive().default(1),
    context: SentinelContextSchema.default({ guides: {} }),
    conditions: z.array(ConditionDefSchema).default([]),
    task: z.array(CheckDefSchema).default([]),
    prompt: z.array(CheckDefSchema).default([]),
  }),
);
