import React from "react";
import type { EventV1 } from "@holdpoint/live-protocol";
import { Activity, Filter } from "lucide-react";
import { cn } from "../../lib/utils";
import { EVENT_TYPES, type EventType } from "../../lib/events";
import { EventRow } from "../EventRow";
import { EmptyState } from "../ui/empty-state";

interface ActivityTabProps {
  events: EventV1[];
}

export function ActivityTab({ events }: ActivityTabProps) {
  const [active, setActive] = React.useState<Set<EventType>>(() => new Set());

  const counts = React.useMemo(() => {
    const map = new Map<EventType, number>();
    for (const event of events) map.set(event.type, (map.get(event.type) ?? 0) + 1);
    return map;
  }, [events]);

  const presentTypes = React.useMemo(
    () => EVENT_TYPES.filter((type) => counts.has(type)),
    [counts],
  );

  const filtered = React.useMemo(() => {
    if (active.size === 0) return events;
    return events.filter((event) => active.has(event.type));
  }, [active, events]);

  function toggle(type: EventType) {
    setActive((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="size-3.5" />
          Filter
        </span>
        {presentTypes.length === 0 ? (
          <span className="text-xs text-muted-foreground">No event types yet</span>
        ) : (
          presentTypes.map((type) => {
            const on = active.size === 0 || active.has(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggle(type)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors",
                  on
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {type}
                <span className="ml-1 opacity-70">{counts.get(type)}</span>
              </button>
            );
          })
        )}
        {active.size > 0 ? (
          <button
            type="button"
            onClick={() => setActive(new Set())}
            className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No matching events"
            description="Events from every session in this project stream here in real time."
          />
        ) : (
          <ol className="flex flex-col gap-2">
            {filtered.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
