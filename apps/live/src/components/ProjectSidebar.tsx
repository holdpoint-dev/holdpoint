import type { EventV1, ProjectSummary } from "@holdpoint/live-protocol";
import { FolderGit2, Inbox } from "lucide-react";
import { cn } from "../lib/utils";
import { formatAgo, projectColor } from "../lib/format";
import { openPendingPermissions } from "../lib/events";
import { ConnectionBadge } from "./ConnectionBadge";
import { EmptyState } from "./ui/empty-state";
import type { ConnectionState } from "../hooks/useLiveStore";

interface ProjectSidebarProps {
  projects: ProjectSummary[];
  selectedProjectHash: string | null;
  onSelect: (hash: string) => void;
  connectionState: ConnectionState;
  eventsBySession: Record<string, EventV1[]>;
}

/** Count of open permission prompts across all sessions of a project. */
function pendingCount(projectHash: string, eventsBySession: Record<string, EventV1[]>): number {
  let total = 0;
  for (const events of Object.values(eventsBySession)) {
    const first = events[0];
    if (!first || first.project_hash !== projectHash) continue;
    total += openPendingPermissions(events).length;
  }
  return total;
}

export function ProjectSidebar({
  projects,
  selectedProjectHash,
  onSelect,
  connectionState,
  eventsBySession,
}: ProjectSidebarProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card/40">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-accent/15 text-accent">
            <FolderGit2 className="size-4" />
          </div>
          <div className="text-sm font-semibold tracking-tight">Holdpoint</div>
        </div>
        <ConnectionBadge state={connectionState} />
      </div>

      <div className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Projects
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {projects.length === 0 ? (
          <EmptyState
            className="mx-2 py-10"
            icon={Inbox}
            title="No live projects"
            description="Keep this window open. Projects appear as soon as an agent emits its first event."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {projects.map((project) => {
              const active = project.project_hash === selectedProjectHash;
              const pending = pendingCount(project.project_hash, eventsBySession);
              return (
                <li key={project.project_hash}>
                  <button
                    type="button"
                    onClick={() => onSelect(project.project_hash)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/50",
                    )}
                  >
                    <span
                      aria-hidden
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: projectColor(project.project_hash) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm font-medium",
                            active ? "text-foreground" : "text-foreground/90",
                          )}
                        >
                          {project.name}
                        </span>
                        {pending > 0 ? (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                            {pending}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {project.root}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {project.session_count} session{project.session_count === 1 ? "" : "s"} ·{" "}
                        {formatAgo(project.last_active)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
