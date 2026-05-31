import React from "react";
import {
  CheckCircle,
  XCircle,
  SkipForward,
  Eye,
  RefreshCw,
  GitCommit,
  Clock,
  FileText,
} from "lucide-react";
import type { CheckReports, CheckRun, CheckRunResult } from "@holdpoint/types";

// ─── Relative time formatting ─────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: CheckRunResult["status"] }) {
  switch (status) {
    case "pass":
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    case "fail":
      return <XCircle className="h-4 w-4 text-red-400" />;
    case "skip":
      return <SkipForward className="h-4 w-4 text-stone/50" />;
    case "shown":
      return <Eye className="h-4 w-4 text-amber-400" />;
  }
}

function statusText(status: CheckRunResult["status"]): string {
  switch (status) {
    case "pass":
      return "Passed";
    case "fail":
      return "Failed";
    case "skip":
      return "Skipped";
    case "shown":
      return "Shown to agent";
  }
}

// ─── Summary badges ───────────────────────────────────────────────────────────

function SummaryBadges({ summary }: { summary: CheckRun["summary"] }) {
  return (
    <div className="flex items-center gap-2">
      {summary.passed > 0 && (
        <span className="flex items-center gap-1 rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 text-xs text-green-400">
          <CheckCircle className="h-3 w-3" />
          {summary.passed}
        </span>
      )}
      {summary.failed > 0 && (
        <span className="flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-xs text-red-400">
          <XCircle className="h-3 w-3" />
          {summary.failed}
        </span>
      )}
      {summary.skipped > 0 && (
        <span className="flex items-center gap-1 rounded border border-stone/30 bg-stone/10 px-1.5 py-0.5 text-xs text-stone">
          <SkipForward className="h-3 w-3" />
          {summary.skipped}
        </span>
      )}
      {summary.shown > 0 && (
        <span className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
          <Eye className="h-3 w-3" />
          {summary.shown}
        </span>
      )}
    </div>
  );
}

// ─── Run card ─────────────────────────────────────────────────────────────────

function RunCard({ run }: { run: CheckRun }) {
  const [expanded, setExpanded] = React.useState(false);
  const hasFailed = run.summary.failed > 0;

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-node transition-colors ${
        hasFailed ? "border-red-500/30" : "border-node-border"
      }`}
    >
      {/* Header */}
      <button
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-node-border/30"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {/* Status dot */}
        <div
          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
            hasFailed ? "bg-red-500" : "bg-green-500"
          }`}
        />

        {/* Commit info */}
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          {run.shortSha ? (
            <span className="flex items-center gap-1 font-mono text-sm text-bone">
              <GitCommit className="h-3.5 w-3.5 text-stone/50" />
              {run.shortSha}
            </span>
          ) : (
            <span className="font-mono text-sm text-stone/50">uncommitted</span>
          )}

          <SummaryBadges summary={run.summary} />

          <span className="ml-auto flex items-center gap-1 text-xs text-stone/50">
            <Clock className="h-3 w-3" />
            <span title={formatTimestamp(run.timestamp)}>{relativeTime(run.timestamp)}</span>
          </span>
        </div>

        {/* Expand indicator */}
        <svg
          className={`h-4 w-4 flex-shrink-0 text-stone/40 transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-node-border p-4 pt-3 space-y-4">
          {/* Changed files */}
          {run.files.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-stone/60">
                <FileText className="h-3.5 w-3.5" />
                Changed files ({run.files.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {run.files.slice(0, 20).map((f) => (
                  <span
                    key={f}
                    className="rounded border border-node-border bg-canvas px-1.5 py-0.5 font-mono text-xs text-stone/70"
                  >
                    {f}
                  </span>
                ))}
                {run.files.length > 20 && (
                  <span className="text-xs text-stone/40">+{run.files.length - 20} more</span>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          <div>
            <p className="mb-2 text-xs font-medium text-stone/60">
              Check results ({run.results.length})
            </p>
            <div className="space-y-1.5">
              {run.results.map((r, i) => (
                <div key={`${r.id}-${i}`} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={r.status} />
                    <span className="flex-1 text-sm text-bone">{r.label}</span>
                    <span
                      className={`text-xs ${
                        r.status === "pass"
                          ? "text-green-400"
                          : r.status === "fail"
                            ? "text-red-400"
                            : r.status === "shown"
                              ? "text-amber-400"
                              : "text-stone/50"
                      }`}
                    >
                      {statusText(r.status)}
                    </span>
                    <span className="font-mono text-xs text-stone/30">{r.id}</span>
                  </div>
                  {r.status === "fail" && r.output && (
                    <pre className="ml-6 max-h-32 overflow-auto rounded bg-canvas p-2 font-mono text-xs text-red-300/80 whitespace-pre-wrap">
                      {r.output.trim().split("\n").slice(0, 15).join("\n")}
                    </pre>
                  )}
                  {r.status === "skip" && r.skipReason && (
                    <p className="ml-6 text-xs text-stone/50">{r.skipReason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ReportView ──────────────────────────────────────────────────────────

/**
 * Displays check run history loaded from `/__holdpoint/initial-reports`.
 * Shows a timeline of recent `holdpoint check` runs with per-check results.
 */
export function ReportView({ projectHash }: { projectHash?: string | null } = {}) {
  const [reports, setReports] = React.useState<CheckReports | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const projectParam = React.useMemo(
    () => projectHash ?? new URLSearchParams(window.location.search).get("project"),
    [projectHash],
  );
  const reportsPath = projectParam
    ? `/__holdpoint/initial-reports?project=${encodeURIComponent(projectParam)}`
    : "/__holdpoint/initial-reports";

  const load = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(reportsPath, { credentials: "include" })
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CheckReports>;
      })
      .then((data) => {
        setReports(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load reports");
        setLoading(false);
      });
  }, [reportsPath]);

  // Re-load whenever switching to this tab
  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="w-full flex h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-stone/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex h-full items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-400/60" />
          <p className="text-sm text-stone/70">Failed to load history</p>
          <p className="mt-1 text-xs text-stone/50">{error}</p>
          <button
            onClick={load}
            className="mx-auto mt-4 flex items-center gap-1.5 rounded-md border border-node-border px-3 py-1.5 text-sm text-stone hover:border-accent hover:text-bone"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const runs = reports?.runs ?? [];

  if (runs.length === 0) {
    return (
      <div className="w-full flex h-full items-center justify-center">
        <div className="text-center">
          <GitCommit className="mx-auto mb-3 h-10 w-10 text-stone/30" />
          <p className="text-sm text-stone/70">No check runs recorded yet.</p>
          <p className="mt-1 text-xs text-stone/50 max-w-xs">
            Run{" "}
            <code className="rounded bg-node-border px-1 py-0.5 font-mono">holdpoint check</code> in
            your project — results will appear here.
          </p>
          <button
            onClick={load}
            className="mx-auto mt-4 flex items-center gap-1.5 rounded-md border border-node-border px-3 py-1.5 text-sm text-stone hover:border-accent hover:text-bone"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-canvas p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-bone">Check History</h2>
            <p className="mt-0.5 text-xs text-stone/50">
              {runs.length} run{runs.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-md border border-node-border px-3 py-1.5 text-sm text-stone hover:border-accent hover:text-bone"
            title="Refresh history"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Run list */}
        <div className="space-y-3">
          {runs.map((run, i) => (
            <RunCard key={`${run.sha ?? "uncommitted"}-${i}`} run={run} />
          ))}
        </div>
      </div>
    </div>
  );
}
