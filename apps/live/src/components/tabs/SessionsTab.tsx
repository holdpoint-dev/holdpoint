import React from "react";
import type { ControlCommand, EventV1, SessionSummary } from "@holdpoint/live-protocol";
import { Hand, Radio, Send, TerminalSquare, Zap } from "lucide-react";
import { formatClock } from "../../lib/format";
import {
  latestEvent,
  openPendingPermissions,
  sessionLabel,
  sessionStatus,
  summarizeEvent,
} from "../../lib/events";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import { EmptyState } from "../ui/empty-state";

interface SessionsTabProps {
  sessions: SessionSummary[];
  eventsBySession: Record<string, EventV1[]>;
  controlBusy: Record<string, boolean>;
  sendControl: (sessionKey: string, command: ControlCommand) => Promise<boolean>;
}

export function SessionsTab({
  sessions,
  eventsBySession,
  controlBusy,
  sendControl,
}: SessionsTabProps) {
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  if (sessions.length === 0) {
    return (
      <div className="h-full overflow-y-auto px-5 py-4">
        <EmptyState
          icon={Radio}
          title="No live sessions"
          description="When an agent runs in this project, its session and live controls appear here."
        />
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 gap-4 overflow-y-auto px-5 py-4 [grid-template-columns:repeat(auto-fill,minmax(360px,1fr))] content-start">
      {sessions.map((session) => {
        const events = eventsBySession[session.key] ?? [];
        const status = sessionStatus(events);
        const latest = latestEvent(events);
        const pending = openPendingPermissions(events);
        const canControl = Boolean(session.caps?.can_control);
        const controlOnline = Boolean(session.caps?.control_online);
        const busy = controlBusy[session.key] ?? false;
        const enabled = canControl && controlOnline && !busy;
        const draft = drafts[session.key] ?? "";

        return (
          <Card key={session.key} className="flex flex-col">
            <CardContent className="flex flex-1 flex-col gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{sessionLabel(session)}</div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {session.cwd}
                  </div>
                </div>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="uppercase tracking-wide text-muted-foreground">Last event</div>
                  <div className="mt-0.5 text-sm text-foreground">
                    {formatClock(session.last_event_at)}
                  </div>
                </div>
                <div>
                  <div className="uppercase tracking-wide text-muted-foreground">Events</div>
                  <div className="mt-0.5 text-sm tabular-nums text-foreground">
                    {session.event_count}
                  </div>
                </div>
              </div>

              {latest ? (
                <p className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-foreground/80">
                  {summarizeEvent(latest)}
                </p>
              ) : null}

              <Separator />

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <TerminalSquare className="size-3.5" />
                  Control
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {!canControl
                    ? "observe only"
                    : controlOnline
                      ? "controls online"
                      : "bridge offline"}
                </span>
              </div>

              {pending.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {pending.map((event) => (
                    <div
                      key={event.payload.request_id}
                      className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
                        <Hand className="size-3.5" />
                        {event.payload.title ?? event.payload.permission_kind}
                      </div>
                      {event.payload.details ? (
                        <div className="mt-1 text-[11px] text-foreground/70">
                          {event.payload.details}
                        </div>
                      ) : null}
                      <div className="mt-2.5 flex gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={!enabled}
                          onClick={() =>
                            void sendControl(session.key, {
                              command: "approve_pending",
                              args: { request_id: event.payload.request_id },
                              actor: "user",
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={!enabled}
                          onClick={() =>
                            void sendControl(session.key, {
                              command: "deny_pending",
                              args: { request_id: event.payload.request_id },
                              actor: "user",
                            })
                          }
                        >
                          Deny
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {canControl
                    ? controlOnline
                      ? "No pending approvals."
                      : "Controls appear when the bridge connects."
                    : "This session does not expose active controls."}
                </p>
              )}

              <div className="mt-auto flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input
                    value={draft}
                    disabled={!enabled}
                    placeholder="Queue a note for the next turn…"
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [session.key]: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && enabled && draft.trim()) {
                        event.preventDefault();
                        const text = draft.trim();
                        void sendControl(session.key, {
                          command: "inject_context",
                          args: { text },
                          actor: "user",
                        }).then((ok) => {
                          if (ok) setDrafts((c) => ({ ...c, [session.key]: "" }));
                        });
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={!enabled || draft.trim().length === 0}
                    title="Inject context"
                    onClick={() => {
                      const text = draft.trim();
                      if (!text) return;
                      void sendControl(session.key, {
                        command: "inject_context",
                        args: { text },
                        actor: "user",
                      }).then((ok) => {
                        if (ok) setDrafts((c) => ({ ...c, [session.key]: "" }));
                      });
                    }}
                  >
                    <Send />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-fit"
                  disabled={!enabled}
                  onClick={() =>
                    void sendControl(session.key, {
                      command: "trigger_tool",
                      args: { tool_name: "holdpoint_dry_run", input: {} },
                      actor: "user",
                    })
                  }
                >
                  <Zap />
                  Trigger dry run
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
