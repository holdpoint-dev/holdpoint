import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Tone } from "../../lib/events";
import { Card } from "./card";

const toneText: Record<Tone, string> = {
  neutral: "text-foreground",
  accent: "text-accent",
  success: "text-success",
  danger: "text-danger",
  info: "text-info",
};

export interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
}

export function Stat({ label, value, hint, icon: Icon, tone = "neutral" }: StatProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon ? <Icon className={cn("size-4", toneText[tone])} /> : null}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", toneText[tone])}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}

/** Thin horizontal meter for ratios (0..1). */
export function Meter({ value, tone = "accent" }: { value: number; tone?: Tone }) {
  const toneBg: Record<Tone, string> = {
    neutral: "bg-muted-foreground",
    accent: "bg-accent",
    success: "bg-success",
    danger: "bg-danger",
    info: "bg-info",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", toneBg[tone])}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  );
}
