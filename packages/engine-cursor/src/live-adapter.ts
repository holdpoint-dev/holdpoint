import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import type { EventV1 } from "@holdpoint/live-protocol";
import type { TranslateHookInputOptions } from "@holdpoint/sdk";

interface CursorHookInput {
  conversation_id?: string;
  generation_id?: string;
  session_id?: string;
  hook_event_name?: string;
  cwd?: string;
  workspace_roots?: string[];
  model?: string;
  prompt?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_output?: string;
  tool_use_id?: string;
  duration?: number;
  duration_ms?: number;
  error_message?: string;
  failure_type?: string;
  status?: string;
  reason?: string;
  command?: string;
  output?: string;
  file_path?: string;
  modified_files?: string[];
  subagent_id?: string;
  subagent_type?: string;
  task?: string;
  holdpoint_check?: {
    ok?: boolean;
    durationMs?: number;
    output?: string;
  };
  holdpoint_context?: {
    truncated?: boolean;
    originalLength?: number;
    emittedLength?: number;
  };
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

function extractStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function normalizeWriteTarget(cwd: string, target: string): string {
  const resolved = resolve(cwd, target);
  return existsSync(resolved) ? realpathSync.native(resolved) : resolved;
}

function extractWriteTargets(input: CursorHookInput, cwd: string): string[] | undefined {
  const candidates = new Set<string>();
  const toolInput = asObject(input.tool_input);

  for (const key of ["file_path", "filePath", "path"]) {
    const value = toolInput[key] ?? (input as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      candidates.add(normalizeWriteTarget(cwd, value));
    }
  }

  for (const key of ["paths", "file_paths", "modified_files"]) {
    for (const value of extractStringArray(
      toolInput[key] ?? (input as Record<string, unknown>)[key],
    )) {
      if (value.trim()) {
        candidates.add(normalizeWriteTarget(cwd, value));
      }
    }
  }

  return candidates.size > 0 ? [...candidates] : undefined;
}

function truncate(value: string, max: number): { value: string; truncatedAt?: number } {
  if (value.length <= max) return { value };
  return { value: value.slice(0, max), truncatedAt: max };
}

function sessionId(input: CursorHookInput): string | undefined {
  return input.conversation_id ?? input.session_id ?? input.generation_id;
}

function mapSessionEndReason(
  reason: string | undefined,
): "user" | "completed" | "error" | undefined {
  if (reason === "completed" || reason === "error") return reason;
  if (reason === "aborted" || reason === "window_close" || reason === "user_close") return "user";
  return reason ? "completed" : undefined;
}

function buildCursorHookEvent(raw: unknown, options?: TranslateHookInputOptions): EventV1 | null {
  const input = asObject(raw) as CursorHookInput;
  const id = sessionId(input);
  const hookEventName = asString(input.hook_event_name);
  if (!id || !hookEventName) {
    return null;
  }

  const cwd = asString(input.cwd) ?? input.workspace_roots?.[0] ?? options?.cwd ?? process.cwd();
  const repoRoot = resolveRepoRoot(cwd);
  const base = {
    v: 1 as const,
    id: randomUUID(),
    ts: Date.now(),
    engine: "cursor",
    session_id: id,
    project_hash: sha12(repoRoot),
    cwd: repoRoot,
  };
  const toolName = asString(input.tool_name) ?? (input.command ? "Shell" : undefined);
  const toolUseId = input.tool_use_id ?? input.generation_id ?? randomUUID();
  const writeTargets = extractWriteTargets(input, cwd);

  switch (hookEventName) {
    case "sessionStart":
      return {
        ...base,
        type: "session_start",
        payload: {
          ...(input.holdpoint_context?.truncated ? { tools_available: ["context_truncated"] } : {}),
        },
      };
    case "sessionEnd":
      return {
        ...base,
        type: "session_end",
        payload: {
          ...(mapSessionEndReason(asString(input.reason) ?? asString(input.status))
            ? { reason: mapSessionEndReason(asString(input.reason) ?? asString(input.status)) }
            : {}),
        },
      };
    case "beforeSubmitPrompt": {
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
    case "preToolUse":
      return {
        ...base,
        type: "tool_pre",
        payload: {
          tool_name: toolName ?? "unknown",
          tool_use_id: toolUseId,
          tool_input: asObject(input.tool_input),
          ...(writeTargets ? { write_targets: writeTargets } : {}),
        },
      };
    case "postToolUse":
    case "afterShellExecution":
    case "afterMCPExecution":
      return {
        ...base,
        type: "tool_post",
        payload: {
          tool_name: toolName ?? (hookEventName === "afterShellExecution" ? "Shell" : "unknown"),
          tool_use_id: toolUseId,
          success: true,
          duration_ms: asNumber(input.duration) ?? asNumber(input.duration_ms) ?? 0,
          ...((input.output ?? input.tool_output)
            ? { output_summary: truncate(String(input.output ?? input.tool_output), 2_000).value }
            : {}),
          ...(writeTargets ? { write_targets: writeTargets } : {}),
        },
      };
    case "postToolUseFailure":
      return {
        ...base,
        type: "tool_failure",
        payload: {
          tool_name: toolName ?? "unknown",
          tool_use_id: toolUseId,
          error:
            asString(input.error_message) ?? asString(input.failure_type) ?? "Cursor tool failed",
        },
      };
    case "beforeShellExecution":
    case "beforeMCPExecution":
    case "beforeReadFile":
      return {
        ...base,
        type: "tool_pre",
        payload: {
          tool_name:
            hookEventName === "beforeShellExecution"
              ? "Shell"
              : hookEventName === "beforeMCPExecution"
                ? "MCP"
                : hookEventName === "beforeReadFile"
                  ? "Read"
                  : "unknown",
          tool_use_id: toolUseId,
          tool_input:
            hookEventName === "beforeShellExecution" && input.command
              ? { command: input.command }
              : hookEventName === "beforeReadFile" && input.file_path
                ? { file_path: input.file_path }
                : asObject(input.tool_input),
          ...(writeTargets ? { write_targets: writeTargets } : {}),
        },
      };
    case "afterFileEdit":
      return {
        ...base,
        type: "tool_post",
        payload: {
          tool_name: "Write",
          tool_use_id: toolUseId,
          success: true,
          duration_ms: asNumber(input.duration) ?? asNumber(input.duration_ms) ?? 0,
          ...(writeTargets ? { write_targets: writeTargets } : {}),
        },
      };
    case "stop": {
      const check = input.holdpoint_check;
      if (check?.ok === false) {
        return {
          ...base,
          type: "stop_block",
          payload: {
            reason: check.output ?? "Holdpoint checks failed",
            failing_checks: [],
          },
        };
      }
      return {
        ...base,
        type: "stop_pass",
        payload: {
          duration_ms: check?.durationMs ?? asNumber(input.duration_ms) ?? 0,
        },
      };
    }
    case "subagentStart":
    case "subagentStop":
    case "preCompact":
    case "afterAgentResponse":
      return {
        ...base,
        type: "meta",
        payload: {
          kind: "cursor_lifecycle",
          hook_event_name: hookEventName,
          status: input.status,
          subagent_type: input.subagent_type,
        },
      };
    default:
      return {
        ...base,
        type: "meta",
        payload: {
          kind: "cursor_hook",
          hook_event_name: hookEventName,
        },
      };
  }
}

export const adapter = {
  id: "cursor",
  displayName: "Cursor",
  capabilities: {
    can_stream: true,
  },
  generateBridgeCommand(): string {
    return "node_modules/.bin/holdpoint event --engine cursor --from-hook";
  },
  translateHookInput(raw: unknown, options?: TranslateHookInputOptions) {
    return buildCursorHookEvent(raw, options);
  },
};
