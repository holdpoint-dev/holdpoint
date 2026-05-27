type JsonObject = Record<string, unknown>;

const HOLDPOINT_CLAUDE_HOOK_MARKER = "HOLDPOINT_MANAGED=claude";

function isObject(value: unknown): value is JsonObject {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function asHookArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isManagedHookCommand(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.command === "string" &&
    value.command.includes(HOLDPOINT_CLAUDE_HOOK_MARKER)
  );
}

function isLegacyManagedHookCommand(value: unknown): boolean {
  if (!isObject(value) || typeof value.command !== "string") return false;
  return (
    value.command === "node_modules/.bin/holdpoint event --engine claude --from-hook || true" ||
    value.command === "node_modules/.bin/holdpoint check --staged"
  );
}

function isManagedHookEntry(value: unknown): boolean {
  if (!isObject(value)) return false;
  const hooks = asHookArray(value.hooks);
  return (
    hooks.length > 0 &&
    (hooks.every(isManagedHookCommand) || hooks.every(isLegacyManagedHookCommand))
  );
}

/**
 * Merge generated Holdpoint hooks into .claude/settings.json without clobbering
 * user-owned hooks. Re-runs remove only entries carrying Holdpoint's marker.
 */
export function mergeClaudeSettings(existing: JsonObject, generated: JsonObject): JsonObject {
  const existingHooks = isObject(existing.hooks) ? existing.hooks : {};
  const generatedHooks = isObject(generated.hooks) ? generated.hooks : {};
  const mergedHooks: JsonObject = {};

  for (const eventName of new Set([
    ...Object.keys(existingHooks),
    ...Object.keys(generatedHooks),
  ])) {
    const preserved = asHookArray(existingHooks[eventName]).filter(
      (entry) => !isManagedHookEntry(entry),
    );
    const next = asHookArray(generatedHooks[eventName]);
    if (preserved.length > 0 || next.length > 0) {
      mergedHooks[eventName] = [...preserved, ...next];
    }
  }

  return { ...existing, ...generated, hooks: mergedHooks };
}
