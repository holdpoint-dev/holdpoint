---
"@holdpoint/live-daemon": minor
"@holdpoint/cli": patch
"holdpoint": patch
---

unify: fold the Builder into the Live dashboard — one UI to edit + monitor all repos

The standalone Builder is gone as a separate app. Its check editing now lives as
two tabs inside the unified Live dashboard, so there is a single UI (one bundle,
one auth flow, one localhost port) for watching agents **and** editing every
repo's `checks.yaml`:

- **Checks tab** — a dense master-detail editor (replacing the old card grid),
  scoped to the project selected in the sidebar. The left list shows checks
  grouped by Automatic / Manual; clicking one opens a detail panel where the
  filter and condition are labeled **dropdowns** ("Runs on", "Only if") instead
  of ambiguous colored tags, with plain-language help text. Loads that repo's
  `checks.yaml`, supports Export / Copy / Load template, and a **Save** that
  writes back to disk.
- **History tab** — the check-run report timeline for the selected project.
- **Save with diff confirm** — Save opens a YAML diff of on-disk vs. edited and
  only writes after you approve it.

Daemon changes:

- New authenticated `PUT /__holdpoint/checks?project=<hash>` endpoint. It
  validates the body against the Holdpoint schema (`@holdpoint/yaml-core`) and
  writes `checks.yaml` atomically (temp file + rename) within the project root.
- `/builder` and `/builder/` now `302` to `/live/?tab=checks`; the daemon no
  longer bundles or serves a separate builder UI (one bundle ships).
- `holdpoint build` opens the unified UI's Checks tab.

`apps/builder` source is retained but is no longer built into the shipped daemon.
