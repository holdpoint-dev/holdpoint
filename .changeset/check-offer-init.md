---
"@holdpoint/cli": patch
"holdpoint": patch
---

check: offer to bootstrap when checks.yaml is missing in an interactive shell

If you run `holdpoint check` in a directory that hasn't been initialised
(no `checks.yaml`), the CLI now detects the cd-into-fresh-repo case and
prompts to run `holdpoint init` for you. Designed for the workflow where
holdpoint is installed globally and you expect it to "just work"
anywhere.

Behavior is gated on TTY + interactive context:

- Interactive shell (TTY) → prompt to init, default Y
- Agent hook (--staged) → fail-fast (unchanged) — hooks should
  never bootstrap silently
- CI / non-TTY → fail-fast (unchanged) — no prompt is
  possible, no silent bootstrap

After accepting the prompt, init runs to completion (printing its own
preflight + next-steps) and the check exits cleanly with a pointer to
review checks.yaml before re-running. We deliberately do NOT auto-run
checks immediately after init — the user just got bootstrapped and
hasn't customised checks.yaml yet.
