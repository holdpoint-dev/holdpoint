import { z } from "zod";

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const TriggerTypeSchema = z.enum([
  "always",
  "frontend",
  "backend",
  "prisma",
  "socket",
  "visual",
  "custom",
]);

export const TriggerSchema = z.object({
  type: TriggerTypeSchema,
  pattern: z.string().optional(),
});

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

export const CheckDefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  trigger: TriggerSchema,
  cmd: z.string().optional(),
  manual: z.string().optional(),
  conditionId: z.string().optional(),
});

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
