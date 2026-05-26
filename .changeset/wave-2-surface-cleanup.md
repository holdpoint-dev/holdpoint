---
"@holdpoint/cli": patch
"holdpoint": patch
---

Surface cleanup before beta: vocabulary, command names, and bare-binary behavior

- `holdpoint` with no subcommand now prints help instead of silently opening the
  browser UI. Use `holdpoint live` (already existed) to open Holdpoint Live —
  this matches every other CLI's bare-invocation convention and stops scripts
  from accidentally launching a browser tab.
- `holdpoint suggest` is the new name for `holdpoint evolve`. `evolve` keeps
  working as a hidden alias and prints a one-line deprecation notice to stderr
  before delegating; it will be removed before 1.0.
- User-facing docs and CLI strings now consistently say "engine" instead of
  "adapter" wherever the two were used interchangeably. The literal public
  contracts — the `holdpoint.adapter` `package.json` field, the `adapter` JS
  export from external engine packages, and the `LiveAdapter` SDK type — are
  unchanged. Third-party engines built against the existing contract require
  no code changes.
