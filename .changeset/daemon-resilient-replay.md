---
"@holdpoint/live-daemon": patch
---

daemon: stop bricking startup when pending events reference deleted paths

Two-layer fix for the silent failure mode where `holdpoint live` and
`holdpoint builder` would hang for 5 seconds and then throw "Daemon
unavailable + cannot spawn" because the daemon process crashed during
startup with `ENOENT: no such file or directory, lstat ...`.

Root cause: the daemon replays pending events from
`~/.holdpoint/spool/pending/` on startup. Each event triggers
`identifyProject(cwd)` which called `realpathSync(cwd)`. If the event
referenced a project directory that had since been renamed or deleted,
the lstat would throw ENOENT and bring down the whole replay — and
with it the daemon startup. The bricked state was permanent: every
subsequent daemon spawn re-replayed the same bad event and re-crashed.

Layer 1 — `identifyProject` now has three fallbacks:

1. git rev-parse --show-toplevel + realpath (canonical)
2. realpath(cwd) (cwd exists, not a repo)
3. raw cwd string (cwd deleted — was throwing)

Layer 2 — `replayPending` now wraps each event in try/catch and always
deletes the file at the end, so a malformed payload can't cause an
infinite-loop brick. Failed events are logged with a `[holdpoint]`
prefix and dropped.

Includes regression tests for both layers — see
`packages/live-daemon/src/__tests__/project-identity.test.ts` and the
`LiveStore.replayPending` describe block in `store.test.ts`.
