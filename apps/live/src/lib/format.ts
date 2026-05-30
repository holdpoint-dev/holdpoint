export function basename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function formatClock(value: number): string {
  if (value <= 0) return "—";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export function formatAgo(value: number): string {
  if (value <= 0) return "awaiting activity";
  const diffMs = Math.max(0, Date.now() - value);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remSeconds}s`;
}

/** Deterministic hue derived from a project hash, used to color-code projects. */
export function projectHue(projectHash: string): number {
  return Number.parseInt(projectHash.slice(0, 6), 16) % 360;
}

export function projectColor(projectHash: string): string {
  return `hsl(${projectHue(projectHash)} 70% 60%)`;
}

export function shortId(value: string, length = 6): string {
  return value.slice(0, length);
}
