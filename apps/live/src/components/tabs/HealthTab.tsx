import React from "react";
import type { EventV1 } from "@holdpoint/live-protocol";
import { CheckCircle2, FileWarning, Gauge, ShieldCheck, Timer, Wrench } from "lucide-react";
import { deriveHealth } from "../../lib/events";
import { formatDuration } from "../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Meter, Stat } from "../ui/stat";
import { EmptyState } from "../ui/empty-state";
import type { Tone } from "../../lib/events";

function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function rateTone(value: number | null): Tone {
  if (value === null) return "neutral";
  if (value >= 0.9) return "success";
  if (value >= 0.6) return "accent";
  return "danger";
}

export function HealthTab({ events }: { events: EventV1[] }) {
  const health = React.useMemo(() => deriveHealth(events), [events]);

  const hasData =
    health.checkTotal > 0 ||
    health.stopBlocks + health.stopPasses > 0 ||
    health.toolRuns > 0 ||
    health.conflicts > 0;

  if (!hasData) {
    return (
      <div className="h-full overflow-y-auto px-5 py-4">
        <EmptyState
          icon={Gauge}
          title="No metrics yet"
          description="Once agents run checks and hit the Stop gate, this tab summarizes how effectively Holdpoint is gating work."
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-5">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <Stat
          label="Gate pass rate"
          value={pct(health.gatePassRate)}
          hint={`${health.stopPasses} passed · ${health.stopBlocks} blocked`}
          icon={ShieldCheck}
          tone={rateTone(health.gatePassRate)}
        />
        <Stat
          label="Check pass rate"
          value={pct(health.checkPassRate)}
          hint={`${health.checkPass}/${health.checkTotal} checks passed`}
          icon={CheckCircle2}
          tone={rateTone(health.checkPassRate)}
        />
        <Stat
          label="Tool success"
          value={pct(health.toolSuccessRate)}
          hint={`${health.toolFailures} failure${health.toolFailures === 1 ? "" : "s"} / ${health.toolRuns} runs`}
          icon={Wrench}
          tone={rateTone(health.toolSuccessRate)}
        />
        <Stat
          label="Conflicts"
          value={health.conflicts}
          hint="file collisions detected"
          icon={FileWarning}
          tone={health.conflicts > 0 ? "danger" : "success"}
        />
        <Stat
          label="Avg stop time"
          value={health.avgStopMs === null ? "—" : formatDuration(health.avgStopMs)}
          hint="time to run the Stop gate"
          icon={Timer}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stop gate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Meter value={health.gatePassRate ?? 0} tone={rateTone(health.gatePassRate)} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-success">{health.stopPasses}</span> passed
              </span>
              <span>
                <span className="font-medium text-danger">{health.stopBlocks}</span> blocked
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              How often agents cleared every check on their first Stop attempt. Blocks mean
              Holdpoint caught incomplete work before it shipped.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top failing checks</CardTitle>
          </CardHeader>
          <CardContent>
            {health.failingCheckLabels.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                No check failures recorded. Every executed check passed.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {health.failingCheckLabels.map((entry) => (
                  <li
                    key={entry.label}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2"
                  >
                    <span className="truncate text-sm text-foreground/90">{entry.label}</span>
                    <span className="shrink-0 rounded-full bg-danger/15 px-2 py-0.5 font-mono text-[11px] text-danger">
                      {entry.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
