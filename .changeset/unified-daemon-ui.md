---
"@holdpoint/cli": minor
"@holdpoint/live-daemon": minor
---

Unify the browser surface: `holdpoint builder` now reuses the singleton Holdpoint Live daemon and opens `/builder/` instead of running a separate `localhost:4321` server. The daemon serves `/live/` and `/builder/` routes and protects builder project bootstrap data behind the existing browser auth flow.
