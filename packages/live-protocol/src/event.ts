import { z } from "zod";

export const ProjectHashSchema = z
  .string()
  .regex(/^[a-f0-9]{12}$/i, "project_hash must be 12 hex chars");

export const LiveCapabilitiesSchema = z
  .object({
    can_stream: z.boolean(),
    can_control: z.boolean(),
    can_modify_context: z.boolean(),
    can_register_tools: z.boolean(),
  })
  .partial();

const SessionStartPayloadSchema = z.object({
  source: z.enum(["startup", "resume"]).optional(),
  tools_available: z.array(z.string()).optional(),
});

const SessionEndPayloadSchema = z.object({
  reason: z.enum(["user", "completed", "error"]).optional(),
  turn_count: z.number().int().nonnegative().optional(),
});

const PromptSubmitPayloadSchema = z.object({
  prompt: z.string(),
  truncated_at: z.number().int().nonnegative().optional(),
});

const ToolPayloadBaseSchema = z.object({
  tool_name: z.string().min(1),
  tool_use_id: z.string().min(1),
});

const ToolPrePayloadSchema = ToolPayloadBaseSchema.extend({
  tool_input: z.record(z.unknown()),
});

const ToolPostPayloadSchema = ToolPayloadBaseSchema.extend({
  success: z.boolean(),
  output_summary: z.string().optional(),
  duration_ms: z.number().int().nonnegative(),
});

const ToolFailurePayloadSchema = ToolPayloadBaseSchema.extend({
  error: z.string().min(1),
});

const NotificationPayloadSchema = z.object({
  kind: z.enum(["permission_prompt", "idle", "auth_success", "elicitation"]),
  message: z.string().min(1),
});

const StopBlockPayloadSchema = z.object({
  reason: z.string().min(1),
  failing_checks: z.array(z.string()),
});

const StopPassPayloadSchema = z.object({
  duration_ms: z.number().int().nonnegative(),
});

const CheckRunPayloadSchema = z.object({
  check_id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["pass", "fail", "skip"]),
  duration_ms: z.number().int().nonnegative(),
  output: z.string().optional(),
});

const ConflictPartySchema = z.object({
  engine: z.string().min(1),
  session_id: z.string().min(1),
});

const ConflictPayloadSchema = z.object({
  kind: z.enum(["file_write", "lock_held"]),
  file_path: z.string().min(1),
  holder: ConflictPartySchema,
  requester: ConflictPartySchema,
});

export const ControlCommandSchema = z.object({
  command: z.enum(["approve_pending", "deny_pending", "inject_context", "trigger_tool"]),
  args: z.record(z.unknown()).optional(),
  actor: z.literal("user"),
  actor_session: z.string().optional(),
});

const MetaPayloadSchema = z.object({ kind: z.string().min(1) }).passthrough();

export const EventTypeSchema = z.enum([
  "session_start",
  "session_end",
  "prompt_submit",
  "tool_pre",
  "tool_post",
  "tool_failure",
  "notification",
  "stop_block",
  "stop_pass",
  "check_run",
  "conflict",
  "control",
  "meta",
]);

const BaseEventSchema = z.object({
  v: z.literal(1),
  id: z.string().uuid(),
  ts: z.number().int().nonnegative(),
  engine: z.string().min(1),
  session_id: z.string().min(1),
  project_hash: ProjectHashSchema,
  cwd: z.string().min(1),
  caps: LiveCapabilitiesSchema.optional(),
});

export const EventV1Schema = z.discriminatedUnion("type", [
  BaseEventSchema.extend({ type: z.literal("session_start"), payload: SessionStartPayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("session_end"), payload: SessionEndPayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("prompt_submit"), payload: PromptSubmitPayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("tool_pre"), payload: ToolPrePayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("tool_post"), payload: ToolPostPayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("tool_failure"), payload: ToolFailurePayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("notification"), payload: NotificationPayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("stop_block"), payload: StopBlockPayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("stop_pass"), payload: StopPassPayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("check_run"), payload: CheckRunPayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("conflict"), payload: ConflictPayloadSchema }),
  BaseEventSchema.extend({ type: z.literal("control"), payload: ControlCommandSchema }),
  BaseEventSchema.extend({ type: z.literal("meta"), payload: MetaPayloadSchema }),
]);

export const EventsBatchSchema = z.array(EventV1Schema).min(1);

export type LiveCapabilities = z.infer<typeof LiveCapabilitiesSchema>;
export type ControlCommand = z.infer<typeof ControlCommandSchema>;
export type EventV1 = z.infer<typeof EventV1Schema>;

export function parseEventV1(input: unknown): EventV1 {
  return EventV1Schema.parse(input);
}

export function parseEventsBatch(input: unknown): EventV1[] {
  return EventsBatchSchema.parse(input);
}
