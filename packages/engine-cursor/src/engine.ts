import type { SentinelConfig } from "@sentinel/types";

/**
 * Generate .cursorrules additions from a SentinelConfig.
 *
 * Cursor has no programmatic hooks, so we inject natural-language rules that
 * instruct the agent to run and respect Sentinel checks before completing work.
 */
export function buildEngine(config: SentinelConfig): string {
  const deterministicList = config.deterministic
    .map((c) => `  - [${c.when ?? "always"}] ${c.label}: \`${c.cmd ?? "(no cmd)"}\``)
    .join("\n");

  const manualList = config.manual
    .map((c) => `  - [${c.when ?? "always"}] ${c.label}: ${c.manual ?? ""}`)
    .join("\n");

  return `
# ─── Sentinel Eval-Guard Rules (auto-generated) ──────────────────────────────
# DO NOT EDIT this block manually. Re-generate with: npx sentinel update

## Mandatory pre-completion checks

Before marking ANY task as done or making a final commit, you MUST:

1. Run all deterministic Sentinel checks and confirm they pass:
${deterministicList || "  (no deterministic checks configured)"}

2. Manually verify all manual checks:
${manualList || "  (no manual checks configured)"}

3. If any deterministic check exits non-zero, fix the underlying issue before
   proceeding. Do NOT suppress errors or skip checks.

4. For manual checks, explicitly state in your response that you have verified
   each item before marking the task complete.

## Running checks
   Run: \`npx sentinel check --staged\` to execute all deterministic checks.
   Fix all failures before proceeding.

# ─── End Sentinel Rules ───────────────────────────────────────────────────────
`;
}
