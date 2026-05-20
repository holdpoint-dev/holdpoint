import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { identifyProject } from "@holdpoint/live-daemon";
import type { EventV1 } from "@holdpoint/live-protocol";
import { parseEventV1, parseEventsBatch } from "@holdpoint/live-protocol";
import { BridgeClient } from "@holdpoint/sdk";

interface ClaudeHookInput {
  session_id?: string;
  cwd?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_use_id?: string;
  toolUseId?: string;
  duration_ms?: number;
  success?: boolean;
  error?: string;
}

function readStdin(): string {
  return readFileSync(0, "utf8");
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

function buildClaudeHookEvent(raw: unknown): EventV1 | null {
  const input = asObject(raw) as ClaudeHookInput;
  const cwd = asString(input.cwd) ?? process.cwd();
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
    cwd,
  };

  switch (hookEventName) {
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
    case "Stop":
      return {
        ...base,
        type: "stop_pass",
        payload: {
          duration_ms: asNumber(input.duration_ms) ?? 0,
        },
      };
    case "TaskCompleted":
      return {
        ...base,
        type: "meta",
        payload: {
          kind: "claude_task_completed",
          hook_event_name: hookEventName,
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

export async function eventCommand(options: {
  engine?: string;
  fromHook?: boolean;
}): Promise<void> {
  const stdin = readStdin().trim();
  if (!stdin) {
    if (options.fromHook) {
      process.exit(0);
    }
    console.error("No JSON input received on stdin.");
    process.exit(3);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(stdin);
  } catch {
    if (options.fromHook) {
      process.exit(0);
    }
    console.error("Invalid JSON input.");
    process.exit(3);
  }

  const client = new BridgeClient();

  try {
    if (options.fromHook) {
      if (options.engine !== "claude") {
        process.exit(0);
      }
      const event = buildClaudeHookEvent(raw);
      if (!event) {
        process.exit(0);
      }
      await client.sendEvent(event);
      process.exit(0);
    }

    if (Array.isArray(raw)) {
      await client.sendEvents(parseEventsBatch(raw));
    } else {
      await client.sendEvent(parseEventV1(raw));
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exit(3);
  }
}
