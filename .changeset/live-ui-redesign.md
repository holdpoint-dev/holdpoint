---
"@holdpoint/live-daemon": patch
"@holdpoint/cli": patch
"holdpoint": patch
---

live UI: full redesign on Radix UI primitives with task-focused tabs

The Holdpoint Live monitoring UI (served by the daemon at `/live/`, bundled
into `@holdpoint/live-daemon`) has been rebuilt from a single cramped pane into
a clean, tabbed interface built on Radix UI + a shadcn-style component layer
(the same stack the builder app already uses: `class-variance-authority`,
`tailwind-merge`, `clsx`, `lucide-react`).

- **Project sidebar** with live connection status and a per-project badge that
  surfaces the count of pending approvals at a glance.
- **Activity tab** — a tone-coded, icon-led event timeline with per-type filter
  chips (and counts) so a noisy stream is scannable.
- **Sessions tab** — one control card per session: status, last event, and the
  approve / deny / inject-context / trigger-dry-run controls, gated on session
  capabilities.
- **Conflicts tab** — a dedicated view for "two agents reached for the same
  file," grouped by file with a clear holder → requester rendering.
- **Health tab** — gate-effectiveness metrics derived from the event history
  (Stop-gate pass rate, check pass rate, tool success rate, conflicts, average
  Stop duration) plus the top failing checks.

Internally the monolithic `App.tsx` was split into a `useLiveStore` hook
(REST bootstrap + hydration + WebSocket stream), pure `lib/` helpers
(`events`, `format`, `api`), reusable `components/ui` primitives, and one
component per tab. No protocol or daemon API changes — purely a presentation
overhaul.
