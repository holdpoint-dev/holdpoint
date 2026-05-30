import React from "react";
import { ArrowRight, FileWarning, ShieldCheck } from "lucide-react";
import { formatClock, shortId } from "../../lib/format";
import type { ConflictEvent } from "../../lib/events";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { EmptyState } from "../ui/empty-state";

interface ConflictsTabProps {
  conflicts: ConflictEvent[];
}

interface FileGroup {
  filePath: string;
  events: ConflictEvent[];
  lastTs: number;
}

export function ConflictsTab({ conflicts }: ConflictsTabProps) {
  const groups = React.useMemo<FileGroup[]>(() => {
    const byFile = new Map<string, ConflictEvent[]>();
    for (const event of conflicts) {
      const list = byFile.get(event.payload.file_path) ?? [];
      list.push(event);
      byFile.set(event.payload.file_path, list);
    }
    return [...byFile.entries()]
      .map(([filePath, events]) => ({
        filePath,
        events: events.sort((a, b) => b.ts - a.ts),
        lastTs: Math.max(...events.map((event) => event.ts)),
      }))
      .sort((a, b) => b.lastTs - a.lastTs);
  }, [conflicts]);

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      {groups.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No file conflicts"
          description="Holdpoint flags it here when two agents reach for the same file at once. A clean board means no collisions detected."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {groups.length} file{groups.length === 1 ? "" : "s"} with overlapping writes. The{" "}
            <span className="text-foreground">holder</span> had the file first; the{" "}
            <span className="text-foreground">requester</span> was blocked.
          </p>
          {groups.map((group) => {
            const latest = group.events[0]!;
            return (
              <Card key={group.filePath} className="border-danger/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileWarning className="size-4 shrink-0 text-danger" />
                      <span className="truncate font-mono text-sm text-foreground">
                        {group.filePath}
                      </span>
                    </div>
                    <Badge tone="danger">
                      {group.events.length}×{" "}
                      {latest.payload.kind === "lock_held" ? "lock" : "write"}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1">
                      <span className="text-muted-foreground">holder</span>
                      <span className="font-medium text-foreground">
                        {latest.payload.holder.engine}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {shortId(latest.payload.holder.session_id)}
                      </span>
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    <span className="flex items-center gap-1.5 rounded-md border border-danger/30 bg-danger/10 px-2 py-1">
                      <span className="text-muted-foreground">requester</span>
                      <span className="font-medium text-danger">
                        {latest.payload.requester.engine}
                      </span>
                      <span className="font-mono text-danger/80">
                        {shortId(latest.payload.requester.session_id)}
                      </span>
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                      {formatClock(latest.ts)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
