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
 * Migrate legacy `trigger: { type, pattern }` format to the new `on`/`when` fields.
 * This runs transparently so old checks.yaml files load without errors.
 */
function migrateLegacyTrigger(raw: unknown): unknown {
  if (raw == null || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  if ("trigger" in obj && !("on" in obj) && !("when" in obj)) {
    const { trigger, ...rest } = obj;
    const t = trigger as Record<string, unknown>;
    const migrated: Record<string, unknown> = { ...rest };
    if (t.type !== "always") {
      migrated.when = t.type === "custom" ? t.pattern : t.type;
    }
    return migrated;
  }
  return raw;
}

export const CheckDefSchema = z.preprocess(
  migrateLegacyTrigger,
  z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    on: HookEventSchema.optional(),
    when: z.string().optional(),
    cmd: z.string().optional(),
    manual: z.string().optional(),
    conditionId: z.string().optional(),
  }),
);

export const SentinelContextSchema = z.object({
  guides: z.record(z.string()).default({}),
});

export const SentinelConfigSchema = z.object({
  version: z.number().int().positive().default(1),
  context: SentinelContextSchema.default({ guides: {} }),
  conditions: z.array(ConditionDefSchema).default([]),
  deterministic: z.array(CheckDefSchema).default([]),
  manual: z.array(CheckDefSchema).default([]),
});
