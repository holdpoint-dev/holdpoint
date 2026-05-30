import type { EventV1 } from "@holdpoint/live-protocol";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleDot,
  Cog,
  FileWarning,
  Hand,
  LogIn,
  LogOut,
  MessageSquare,
  Play,
  ShieldCheck,
  ShieldX,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../lib/utils";
import { formatClock, shortId } from "../lib/format";
import { eventTone, summarizeEvent, type EventType, type Tone } from "../lib/events";

const ICONS: Record<EventType, LucideIcon> = {
  session_start: LogIn,
  session_end: LogOut,
  prompt_submit: MessageSquare,
  tool_pre: Play,
  tool_post: CheckCircle2,
  tool_failure: XCircle,
  notification: Bell,
  stop_block: ShieldX,
  stop_pass: ShieldCheck,
  check_run: CircleDot,
  permission_pending: Hand,
  permission_resolved: CheckCircle2,
  conflict: FileWarning,
  control: Cog,
  meta: CircleDot,
};

const FALLBACK: LucideIcon = AlertTriangle;

const toneIcon: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
};

const toneRail: Record<Tone, string> = {
  neutral: "bg-border",
  accent: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  info: "bg-info",
};

export function EventRow({ event, showSession = true }: { event: EventV1; showSession?: boolean }) {
  const tone = eventTone(event.type);
  const Icon = ICONS[event.type] ?? FALLBACK;
  return (
    <li className="relative flex gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <span className={cn("absolute inset-y-2 left-0 w-0.5 rounded-full", toneRail[tone])} />
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          toneIcon[tone],
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {event.type}
          </span>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {event.seq ? `#${event.seq} · ` : ""}
            {formatClock(event.ts)}
          </span>
        </div>
        <p className="mt-0.5 break-words text-sm text-foreground/90">{summarizeEvent(event)}</p>
        {showSession ? (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {event.engine} · {shortId(event.session_id)}
          </p>
        ) : null}
      </div>
    </li>
  );
}
