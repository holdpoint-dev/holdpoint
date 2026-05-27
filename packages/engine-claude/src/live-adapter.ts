import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

interface TranslateHookInputOptions {
  cwd?: string;
}

interface ClaudeHookInput {
  session_id?: string;
  cwd?: string;
  hook_event_name?: string;
  source?: string;
  reason?: string;
  prompt?: string;
  notification_type?: string;
  message?: string;
  permission_request_id?: string;
  request_id?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_use_id?: string;
  toolUseId?: string;
  duration_ms?: number;
  success?: boolean;
  error?: string;
}

function asObject(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sha12(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function resolveRepoRoot(cwd: string): string {
  try {
    return realpathSync(
      execFileSync("git", ["rev-parse", "--show-toplevel"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
    );
  } catch {
    try {
      return realpathSync(cwd);
    } catch {
      return resolve(cwd);
    }
  }
}

function identifyProject(cwd: string): { hash: string } {
  return { hash: sha12(resolveRepoRoot(cwd)) };
}

function normalizeWriteTarget(cwd: string, target: string): string {
  const resolved = resolve(cwd, target);
  return existsSync(resolved) ? realpathSync.native(resolved) : resolved;
}

function extractStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function extractClaudeWriteTargets(
  toolName: string | undefined,
  toolInput: Record<string, unknown>,
  cwd: string,
): string[] | undefined {
  const normalizedToolName = toolName?.trim().toLowerCase();
  if (
    !normalizedToolName ||
    !["edit", "multiedit", "write", "notebookedit"].includes(normalizedToolName)
  ) {
    return undefined;
  }

  const candidates = new Set<string>();
  for (const key of ["file_path", "filePath", "path"]) {
    const value = toolInput[key];
    if (typeof value === "string" && value.trim()) {
      candidates.add(normalizeWriteTarget(cwd, value));
    }
  }

  for (const key of ["paths", "file_paths"]) {
    for (const value of extractStringArray(toolInput[key])) {
      if (value.trim()) {
        candidates.add(normalizeWriteTarget(cwd, value));
      }
    }
  }

  return candidates.size > 0 ? [...candidates] : undefined;
}

function getToolUseId(input: ClaudeHookInput): string {
  return input.tool_use_id ?? input.toolUseId ?? randomUUID();
}

function truncate(value: string, max: number): { value: string; truncatedAt?: number } {
  if (value.length <= max) return { value };
  return { value: value.slice(0, max), truncatedAt: max };
}

function mapSessionStartSource(source: string | undefined): "startup" | "resume" | undefined {
  return source === "startup" || source === "resume" ? source : undefined;
}

function mapSessionEndReason(
  reason: string | undefined,
): "user" | "completed" | "error" | undefined {
  if (reason === "user" || reason === "completed" || reason === "error") return reason;
  if (reason === "logout" || reason === "prompt_input_exit" || reason === "clear") return "user";
  return reason ? "completed" : undefined;
}

function mapNotificationKind(
  raw: string | undefined,
): "permission_prompt" | "idle" | "auth_success" | "elicitation" {
  switch (raw) {
    case "permission_prompt":
      return "permission_prompt";
    case "idle_prompt":
      return "idle";
    case "auth_success":
      return "auth_success";
    case "elicitation_dialog":
    case "elicitation_complete":
    case "elicitation_response":
      return "elicitation";
    default:
      return "idle";
  }
}

function permissionKindForTool(
  toolName: string | undefined,
): "shell" | "write" | "mcp" | "read" | "url" | "custom-tool" {
  const normalized = toolName?.trim().toLowerCase() ?? "";
  if (normalized === "bash") return "shell";
  if (["edit", "multiedit", "write", "notebookedit"].includes(normalized)) return "write";
  if (["read", "glob", "grep"].includes(normalized)) return "read";
  if (["webfetch", "websearch"].includes(normalized)) return "url";
  if (normalized.startsWith("mcp__")) return "mcp";
  return "custom-tool";
}

function permissionRequestId(input: ClaudeHookInput): string {
  return (
    input.permission_request_id ??
    input.request_id ??
    input.tool_use_id ??
    input.toolUseId ??
    randomUUID()
  );
}

function buildClaudeHookEvent(raw: unknown, options?: TranslateHookInputOptions) {
  const input = asObject(raw) as ClaudeHookInput;
  const cwd = asString(input.cwd) ?? options?.cwd ?? process.cwd();
  const sessionId = asString(input.session_id);
  const hookEventName = asString(input.hook_event_name);
  if (!sessionId || !hookEventName) {
    return null;
  }

  const project = identifyProject(cwd);
  const toolName = asString(input.tool_name);
  const toolInput = asObject(input.tool_input);
  const writeTargets = extractClaudeWriteTargets(toolName, toolInput, cwd);
  const base = {
    v: 1 as const,
    id: randomUUID(),
    ts: Date.now(),
    engine: "claude",
    session_id: sessionId,
    project_hash: project.hash,
    cwd: resolveRepoRoot(cwd),
  };

  switch (hookEventName) {
    case "SessionStart":
      return {
        ...base,
        type: "session_start",
        payload: {
          ...(mapSessionStartSource(asString(input.source))
            ? { source: mapSessionStartSource(asString(input.source)) }
            : {}),
        },
      };
    case "UserPromptSubmit": {
      const prompt = asString(input.prompt) ?? "";
      const { value, truncatedAt } = truncate(prompt, 10_000);
      return {
        ...base,
        type: "prompt_submit",
        payload: {
          prompt: value,
          ...(truncatedAt ? { truncated_at: truncatedAt } : {}),
        },
      };
    }
    case "PreToolUse":
      return {
        ...base,
        type: "tool_pre",
        payload: {
          tool_name: toolName ?? "unknown",
          tool_use_id: getToolUseId(input),
          tool_input: toolInput,
          ...(writeTargets ? { write_targets: writeTargets } : {}),
        },
      };
    case "PostToolUse":
      return {
        ...base,
        type: "tool_post",
        payload: {
          tool_name: toolName ?? "unknown",
          tool_use_id: getToolUseId(input),
          success: input.success ?? true,
          duration_ms: asNumber(input.duration_ms) ?? 0,
          ...(writeTargets ? { write_targets: writeTargets } : {}),
        },
      };
    case "PostToolUseFailure":
      return {
        ...base,
        type: "tool_failure",
        payload: {
          tool_name: toolName ?? "unknown",
          tool_use_id: getToolUseId(input),
          error: asString(input.error) ?? "Claude tool call failed",
        },
      };
    case "PermissionRequest":
      return {
        ...base,
        type: "permission_pending",
        payload: {
          request_id: permissionRequestId(input),
          permission_kind: permissionKindForTool(toolName),
          tool_call_id: input.tool_use_id ?? input.toolUseId,
          tool_name: toolName,
          title: toolName ? `${toolName} permission requested` : "Claude permission requested",
        },
      };
    case "PermissionDenied":
      return {
        ...base,
        type: "permission_resolved",
        payload: {
          request_id: permissionRequestId(input),
          outcome: "denied",
          reason: asString(input.error) ?? "Claude denied the permission request",
        },
      };
    case "Notification":
      return {
        ...base,
        type: "notification",
        payload: {
          kind: mapNotificationKind(asString(input.notification_type) ?? asString(input.reason)),
          message: asString(input.message) ?? "Claude Code notification",
        },
      };
    case "Stop":
      return {
        ...base,
        type: "stop_pass",
        payload: {
          duration_ms: asNumber(input.duration_ms) ?? 0,
        },
      };
    case "SessionEnd":
      return {
        ...base,
        type: "session_end",
        payload: {
          ...(mapSessionEndReason(asString(input.reason))
            ? { reason: mapSessionEndReason(asString(input.reason)) }
            : {}),
        },
      };
    case "TaskCreated":
    case "TaskCompleted":
    case "PostToolBatch":
    case "SubagentStart":
    case "SubagentStop":
    case "PreCompact":
      return {
        ...base,
        type: "meta",
        payload: {
          kind: "claude_lifecycle",
          hook_event_name: hookEventName,
          tool_name: toolName,
        },
      };
    default:
      return {
        ...base,
        type: "meta",
        payload: {
          kind: "claude_hook",
          hook_event_name: hookEventName,
          tool_name: toolName,
        },
      };
  }
}

export const adapter = {
  id: "claude",
  displayName: "Claude Code",
  capabilities: {
    can_stream: true,
  },
  generateBridgeCommand(): string {
    return "node_modules/.bin/holdpoint event --engine claude --from-hook";
  },
  translateHookInput(raw: unknown, options?: TranslateHookInputOptions) {
    return buildClaudeHookEvent(raw, options);
  },
};
