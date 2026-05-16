export type WhenScope = "frontend" | "backend" | "prisma" | "socket" | "visual";

type WhenColorKey = WhenScope | "always" | "custom";

export const WHEN_COLORS: Record<WhenColorKey, string> = {
  always: "#64748B",
  frontend: "#3B82F6",
  backend: "#22C55E",
  prisma: "#A855F7",
  socket: "#F97316",
  visual: "#EC4899",
  custom: "#6366F1",
};

export const WHEN_BG: Record<WhenColorKey, string> = {
  always: "bg-slate-500/20 text-slate-300",
  frontend: "bg-blue-500/20 text-blue-300",
  backend: "bg-green-500/20 text-green-300",
  prisma: "bg-purple-500/20 text-purple-300",
  socket: "bg-orange-500/20 text-orange-300",
  visual: "bg-pink-500/20 text-pink-300",
  custom: "bg-indigo-500/20 text-indigo-300",
};

const NAMED_SCOPES: ReadonlyArray<string> = ["frontend", "backend", "prisma", "socket", "visual"];

function getColorKey(when?: string): WhenColorKey {
  if (!when) return "always";
  if (NAMED_SCOPES.includes(when)) return when as WhenScope;
  return "custom";
}

export function getWhenColor(when?: string): string {
  return WHEN_COLORS[getColorKey(when)];
}

export function getWhenBg(when?: string): string {
  return WHEN_BG[getColorKey(when)];
}

export function getWhenLabel(when?: string): string {
  if (!when) return "Always";
  const labels: Record<string, string> = {
    frontend: "Frontend",
    backend: "Backend",
    prisma: "Prisma",
    socket: "WebSocket",
    visual: "Visual",
  };
  return labels[when] ?? when;
}
