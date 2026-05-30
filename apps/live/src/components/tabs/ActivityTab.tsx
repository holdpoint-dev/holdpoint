import React from "react";
import type { EventV1 } from "@holdpoint/live-protocol";
import { Activity, ListFilter } from "lucide-react";
import { cn } from "../../lib/utils";
import { eventTone, type EventType, type Tone } from "../../lib/events";
import { EventRow } from "../EventRow";
import { EmptyState } from "../ui/empty-state";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface ActivityTabProps {
  events: EventV1[];
}

/** Event types grouped into human categories for the filter menu. */
const CATEGORIES: { label: string; types: EventType[] }[] = [
  { label: "Lifecycle", types: ["session_start", "session_end"] },
  { label: "Prompts", types: ["prompt_submit"] },
  { label: "Tools", types: ["tool_pre", "tool_post", "tool_failure"] },
  { label: "Gate & checks", types: ["check_run", "stop_pass", "stop_block"] },
  { label: "Permissions", types: ["permission_pending", "permission_resolved"] },
  { label: "Conflicts", types: ["conflict"] },
  { label: "Other", types: ["notification", "control", "meta"] },
];

const toneDot: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  accent: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  info: "bg-info",
};

export function ActivityTab({ events }: ActivityTabProps) {
  const [active, setActive] = React.useState<Set<EventType>>(() => new Set());

  const counts = React.useMemo(() => {
    const map = new Map<EventType, number>();
    for (const event of events) map.set(event.type, (map.get(event.type) ?? 0) + 1);
    return map;
  }, [events]);

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

  // Only show categories that have at least one event type present in the stream.
  const visibleCategories = CATEGORIES.map((cat) => ({
    ...cat,
    types: cat.types.filter((t) => counts.has(t)),
  })).filter((cat) => cat.types.length > 0);

  const label =
    active.size === 0 ? "All events" : `${active.size} type${active.size === 1 ? "" : "s"}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <ListFilter />
              {label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {visibleCategories.length === 0 ? (
              <DropdownMenuLabel>No events yet</DropdownMenuLabel>
            ) : (
              visibleCategories.map((cat, index) => (
                <React.Fragment key={cat.label}>
                  {index > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel>{cat.label}</DropdownMenuLabel>
                  {cat.types.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={active.size === 0 || active.has(type)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={() => toggle(type)}
                    >
                      <span className={cn("size-2 rounded-full", toneDot[eventTone(type)])} />
                      <span className="flex-1 font-mono text-xs">{type}</span>
                      <span className="text-[11px] text-muted-foreground">{counts.get(type)}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </React.Fragment>
              ))
            )}
            {active.size > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setActive(new Set())}>
                  Clear filter
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {events.length} events
        </span>
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
