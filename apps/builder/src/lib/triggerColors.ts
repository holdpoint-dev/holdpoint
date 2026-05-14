import type { TriggerType } from "@sentinel/types";

export const TRIGGER_COLORS: Record<TriggerType, string> = {
  always: "#64748B",
  frontend: "#3B82F6",
  backend: "#22C55E",
  prisma: "#A855F7",
  socket: "#F97316",
  visual: "#EC4899",
  custom: "#6366F1",
};

export const TRIGGER_BG: Record<TriggerType, string> = {
  always: "bg-slate-500/20 text-slate-300",
  frontend: "bg-blue-500/20 text-blue-300",
  backend: "bg-green-500/20 text-green-300",
  prisma: "bg-purple-500/20 text-purple-300",
  socket: "bg-orange-500/20 text-orange-300",
  visual: "bg-pink-500/20 text-pink-300",
  custom: "bg-indigo-500/20 text-indigo-300",
};
