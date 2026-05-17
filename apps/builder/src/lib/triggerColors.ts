export type WhenScope =
  | "frontend"
  | "backend"
  | "socket"
  | "visual"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "ruby"
  | "database"
  | "prisma"
  | "testing"
  | "infra"
  | "ci"
  | "docs";

type WhenColorKey = WhenScope | "always" | "custom";

export const WHEN_COLORS: Record<WhenColorKey, string> = {
  always: "#64748B",
  // Web / app layers
  frontend: "#3B82F6",
  backend: "#22C55E",
  socket: "#F97316",
  visual: "#EC4899",
  // Languages
  python: "#F59E0B",
  go: "#06B6D4",
  rust: "#EF4444",
  java: "#FB923C",
  ruby: "#F43F5E",
  // Cross-cutting
  database: "#10B981",
  prisma: "#A855F7",
  testing: "#84CC16",
  infra: "#78716C",
  ci: "#EAB308",
  docs: "#0EA5E9",
  custom: "#6366F1",
};

export const WHEN_BG: Record<WhenColorKey, string> = {
  always: "bg-slate-500/20 text-slate-300",
  frontend: "bg-blue-500/20 text-blue-300",
  backend: "bg-green-500/20 text-green-300",
  socket: "bg-orange-500/20 text-orange-300",
  visual: "bg-pink-500/20 text-pink-300",
  python: "bg-amber-500/20 text-amber-300",
  go: "bg-cyan-500/20 text-cyan-300",
  rust: "bg-red-500/20 text-red-300",
  java: "bg-orange-400/20 text-orange-300",
  ruby: "bg-rose-500/20 text-rose-300",
  database: "bg-emerald-500/20 text-emerald-300",
  prisma: "bg-purple-500/20 text-purple-300",
  testing: "bg-lime-500/20 text-lime-300",
  infra: "bg-stone-500/20 text-stone-300",
  ci: "bg-yellow-500/20 text-yellow-300",
  docs: "bg-sky-500/20 text-sky-300",
  custom: "bg-indigo-500/20 text-indigo-300",
};

const NAMED_SCOPES: ReadonlyArray<string> = [
  "frontend",
  "backend",
  "socket",
  "visual",
  "python",
  "go",
  "rust",
  "java",
  "ruby",
  "database",
  "prisma",
  "testing",
  "infra",
  "ci",
  "docs",
];

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
    socket: "WebSocket",
    visual: "Visual",
    python: "Python",
    go: "Go",
    rust: "Rust",
    java: "Java / Kotlin",
    ruby: "Ruby",
    database: "Database",
    prisma: "Prisma",
    testing: "Testing",
    infra: "Infrastructure",
    ci: "CI / CD",
    docs: "Documentation",
  };
  return labels[when] ?? when;
}
