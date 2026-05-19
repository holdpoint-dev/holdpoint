import type { HoldpointConfig } from "@holdpoint/types";

/**
 * Generate .cursorrules additions from a HoldpointConfig.
 *
 * Cursor has no programmatic hooks, so we inject natural-language rules that
 * instruct the agent to run and respect Holdpoint checks before completing work.
 */
export function buildEngine(config: HoldpointConfig): string {
  const deterministicList = config.checks
    .filter((c) => c.cmd !== undefined)
    .map((c) => `  - [${c.when ?? "always"}] ${c.label}: \`${c.cmd ?? "(no cmd)"}\``)
    .join("\n");

  const promptList = config.checks
    .filter((c) => c.prompt !== undefined)
    .map((c) => `  - [${c.when ?? "always"}] ${c.label}: ${c.prompt ?? ""}`)
    .join("\n");

  return `
# ─── Holdpoint Rules (auto-generated) ─────────────────────────────────────────
# DO NOT EDIT this block manually. Re-generate with: npx holdpoint update

## Mandatory pre-completion checks

Before marking ANY task as done or making a final commit, you MUST:

1. Run all Holdpoint tasks and confirm they pass:
${deterministicList || "  (no tasks configured)"}

2. Act on all matching agent prompts:
${promptList || "  (no prompt checks configured)"}

3. If any task exits non-zero, fix the underlying issue before
   proceeding. Do NOT suppress errors or skip tasks.

4. For prompt checks, explicitly state in your response that you have acted on
   each item before marking the task complete.

## Running checks
   Run: \`node_modules/.bin/holdpoint check --staged\` to execute all tasks.
   Fix all failures before proceeding.

# ─── End Holdpoint Rules ───────────────────────────────────────────────────────
`;
}
