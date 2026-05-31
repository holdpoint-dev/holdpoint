import { cn } from "../lib/utils";
import type { ConnectionState } from "../hooks/useLiveStore";
import type { Tone } from "../lib/events";
import { Badge } from "./ui/badge";

const META: Record<ConnectionState, { label: string; tone: Tone; pulse: boolean }> = {
  connecting: { label: "Connecting", tone: "accent", pulse: true },
  live: { label: "Live", tone: "success", pulse: true },
  reconnecting: { label: "Reconnecting", tone: "accent", pulse: true },
  offline: { label: "Offline", tone: "danger", pulse: false },
};

const dotColor: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  accent: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  info: "bg-info",
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const meta = META[state];
  return (
    <Badge tone={meta.tone}>
      <span className="relative flex size-2">
        {meta.pulse ? (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              dotColor[meta.tone],
            )}
          />
        ) : null}
        <span className={cn("relative inline-flex size-2 rounded-full", dotColor[meta.tone])} />
      </span>
      {meta.label}
    </Badge>
  );
}
