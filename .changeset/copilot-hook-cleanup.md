---
"@holdpoint/engine-copilot": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

Remove dead task_complete gating code from generated holdpoint-check.mjs

The Copilot hooks script (.github/hooks/holdpoint-check.mjs) was carrying ~280 lines of check-running logic that was never reachable — holdpoint.json only registers it for sessionStart events, and task_complete interception is handled exclusively by extension.mjs via the Copilot SDK. The script is now sessionStart-only (62 lines vs 344).
