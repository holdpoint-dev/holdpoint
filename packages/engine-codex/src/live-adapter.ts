import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import type { EventV1 } from "@holdpoint/live-protocol";
import type { TranslateHookInputOptions } from "@holdpoint/sdk";

interface CodexHookInput {
  session_id?: string;
  turn_id?: string;
  cwd?: string;
  hook_event_name?: string;
  prompt?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  tool_use_id?: string;
  last_assistant_message?: string | null;
  stop_hook_active?: boolean;
  permission_mode?: string;
  agent_id?: string;
  agent_type?: string;
  trigger?: string;
  holdpoint_check?: {
    ok?: boolean;
    skipped?: boolean;
    reason?: string;
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

function truncate(value: string, max: number): { value: string; truncatedAt?: number } {
  if (value.length <= max) return { value };
  return { value: value.slice(0, max), truncatedAt: max };
}

function normalizeWriteTarget(cwd: string, target: string): string {
  const resolved = resolve(cwd, target);
  return existsSync(resolved) ? realpathSync.native(resolved) : resolved;
}

function extractApplyPatchTargets(patch: string, cwd: string): string[] {
  const paths = new Set<string>();
  for (const line of patch.split(/\r?\n/)) {
    const match = line.match(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/);
    if (match?.[1]) {
      paths.add(normalizeWriteTarget(cwd, match[1]));
    }
  }
  return [...paths];
}

function extractWriteTargets(input: CodexHookInput, cwd: string): string[] | undefined {
  const toolName = asString(input.tool_name)?.toLowerCase();
  const toolInput = asObject(input.tool_input);
  const candidates = new Set<string>();

  for (const key of ["file_path", "filePath", "path"]) {
    const value = toolInput[key];
    if (typeof value === "string" && value.trim()) {
      candidates.add(normalizeWriteTarget(cwd, value));
    }
  }

  const command = asString(toolInput.command);
  if (toolName === "apply_patch" && command) {
    for (const target of extractApplyPatchTargets(command, cwd)) {
      candidates.add(target);
    }
  }

  return candidates.size > 0 ? [...candidates] : undefined;
}

function permissionKindForTool(toolName: string | undefined) {
  const normalized = toolName?.trim().toLowerCase() ?? "";
  if (["bash", "shell"].includes(normalized)) return "shell";
  if (["apply_patch", "write", "edit"].includes(normalized)) return "write";
  if (["read", "grep"].includes(normalized)) return "read";
  if (normalized.startsWith("mcp")) return "mcp";
  return "custom-tool";
}

function buildCodexHookEvent(raw: unknown, options?: TranslateHookInputOptions): EventV1 | null {
  const input = asObject(raw) as CodexHookInput;
  const sessionId = asString(input.session_id);
  const hookEventName = asString(input.hook_event_name);
  if (!sessionId || !hookEventName) {
    return null;
  }

  const cwd = asString(input.cwd) ?? options?.cwd ?? process.cwd();
  const repoRoot = resolveRepoRoot(cwd);
  const base = {
    v: 1 as const,
    id: randomUUID(),
    ts: Date.now(),
    engine: "codex",
    session_id: sessionId,
    project_hash: sha12(repoRoot),
    cwd: repoRoot,
  };
  const toolName = asString(input.tool_name);
  const toolUseId = input.tool_use_id ?? input.turn_id ?? randomUUID();
  const writeTargets = extractWriteTargets(input, cwd);

  switch (hookEventName) {
    case "SessionStart":
      return {
        ...base,
        type: "session_start",
        payload: {
          ...(input.holdpoint_context?.truncated ? { tools_available: ["context_truncated"] } : {}),
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
          tool_use_id: toolUseId,
          tool_input: asObject(input.tool_input),
          ...(writeTargets ? { write_targets: writeTargets } : {}),
        },
      };
    case "PostToolUse":
      return {
        ...base,
        type: "tool_post",
        payload: {
          tool_name: toolName ?? "unknown",
          tool_use_id: toolUseId,
          success: true,
          duration_ms: 0,
          ...(input.tool_response
            ? { output_summary: truncate(JSON.stringify(input.tool_response), 2_000).value }
            : {}),
          ...(writeTargets ? { write_targets: writeTargets } : {}),
        },
      };
    case "PermissionRequest":
      return {
        ...base,
        type: "permission_pending",
        payload: {
          request_id: toolUseId,
          permission_kind: permissionKindForTool(toolName),
          tool_call_id: toolUseId,
          tool_name: toolName,
          title: toolName ? `${toolName} permission requested` : "Codex permission requested",
        },
      };
    case "Stop":
    case "SubagentStop": {
      const check = input.holdpoint_check;
      if (check?.skipped) {
        return {
          ...base,
          type: "meta",
          payload: {
            kind: "codex_stop_skipped",
            hook_event_name: hookEventName,
            reason: check.reason,
          },
        };
      }
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
          duration_ms: check?.durationMs ?? 0,
        },
      };
    }
    case "PreCompact":
    case "PostCompact":
    case "SubagentStart":
      return {
        ...base,
        type: "meta",
        payload: {
          kind: "codex_lifecycle",
          hook_event_name: hookEventName,
          trigger: input.trigger,
          agent_id: input.agent_id,
          agent_type: input.agent_type,
          ...(input.holdpoint_context?.truncated ? { context_truncated: true } : {}),
        },
      };
    default:
      return {
        ...base,
        type: "meta",
        payload: {
          kind: "codex_hook",
          hook_event_name: hookEventName,
        },
      };
  }
}

export const adapter = {
  id: "codex",
  displayName: "OpenAI Codex",
  capabilities: {
    can_stream: true,
  },
  generateBridgeCommand(): string {
    return "node_modules/.bin/holdpoint event --engine codex --from-hook";
  },
  translateHookInput(raw: unknown, options?: TranslateHookInputOptions) {
    return buildCodexHookEvent(raw, options);
  },
};
