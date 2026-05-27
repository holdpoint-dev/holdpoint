type JsonObject = Record<string, unknown>;

const HOLDPOINT_CURSOR_HOOK_MARKER = "HOLDPOINT_MANAGED=cursor";

function isObject(value: unknown): value is JsonObject {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function asHookArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isManagedCursorHook(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.command === "string" &&
    (value.command.includes(HOLDPOINT_CURSOR_HOOK_MARKER) ||
      value.command.includes(".cursor/holdpoint-hook.mjs"))
  );
}

/**
 * Merge generated Holdpoint Cursor hooks into `.cursor/hooks.json` without
 * clobbering user/partner hooks. Re-runs remove only entries carrying
 * Holdpoint's marker or the generated hook script path.
 */
export function mergeCursorHooks(existing: JsonObject, generated: JsonObject): JsonObject {
  const existingHooks = isObject(existing.hooks) ? existing.hooks : {};
  const generatedHooks = isObject(generated.hooks) ? generated.hooks : {};
  const mergedHooks: JsonObject = {};

  for (const eventName of new Set([
    ...Object.keys(existingHooks),
    ...Object.keys(generatedHooks),
  ])) {
    const preserved = asHookArray(existingHooks[eventName]).filter(
      (entry) => !isManagedCursorHook(entry),
    );
    const next = asHookArray(generatedHooks[eventName]);
    if (preserved.length > 0 || next.length > 0) {
      mergedHooks[eventName] = [...preserved, ...next];
    }
  }

  return { ...existing, ...generated, hooks: mergedHooks };
}
