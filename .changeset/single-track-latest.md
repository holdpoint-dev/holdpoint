---
"@holdpoint/cli": patch
"@holdpoint/types": patch
"@holdpoint/yaml-core": patch
"@holdpoint/engine-claude": patch
"@holdpoint/engine-copilot": patch
"@holdpoint/engine-cursor": patch
"@holdpoint/engine-codex": patch
"@holdpoint/sdk": patch
"@holdpoint/live-protocol": patch
"@holdpoint/live-daemon": patch
"holdpoint": patch
---

release: single-track publishing — drop the `alpha` dist-tag, use `latest` only

We're a solo-maintained pre-1.0 project with no parallel release tracks
(no LTS, no beta, no stable-being-patched-while-experiments-ship). Two
dist-tags (`latest` + `alpha`) only bought us complexity: every release
required either a workflow that synced both (which silently broke under
OIDC trusted publishing, since OIDC tokens don't authorize subsequent
`npm dist-tag add` calls) or manual repair commands after each publish.

This bump moves everyone to single-track `latest`-only publishing:

- `publishConfig.tag` removed from all 11 package.json files (npm
  defaults to `latest` when unset).
- `.github/workflows/publish.yaml` was already simplified to publish
  with `--tag latest` only; the dist-tag sync block is gone.
- `scripts/publish.sh` (local manual publish) drops the dist-tag sync.
- `install.sh`, `install.ps1`, README, web app, and CLI install
  instructions now use `npx holdpoint` (no `@alpha` suffix).
- The historical `alpha` dist-tag on npm is left pointing at the last
  alpha-tagged version (`0.1.0-alpha.16`) as a breadcrumb; remove
  manually with `npm dist-tag rm @holdpoint/<pkg> alpha` if desired.

The version-string format stays `0.1.0-alpha.N` (we remain in
`.changeset/pre.json` pre-release mode). "Alpha" is signaled by the
version string, the README banner, and the alpha-software callouts —
not by the dist-tag, which is just a default-resolver.
