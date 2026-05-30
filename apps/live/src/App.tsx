import React from "react";
import { Activity, FileWarning, Gauge, History, ListChecks, Radio, X } from "lucide-react";
import { useLiveStore } from "./hooks/useLiveStore";
import { openPendingPermissions, type ConflictEvent } from "./lib/events";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ActivityTab } from "./components/tabs/ActivityTab";
import { SessionsTab } from "./components/tabs/SessionsTab";
import { ConflictsTab } from "./components/tabs/ConflictsTab";
import { HealthTab } from "./components/tabs/HealthTab";
import { ChecksTab } from "./checks/ChecksTab";
import { ReportView } from "./checks/ReportView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { TooltipProvider } from "./components/ui/tooltip";

const TAB_VALUES = ["activity", "sessions", "conflicts", "health", "checks", "history"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function initialTab(): TabValue {
  const requested = new URLSearchParams(window.location.search).get("tab");
  return (TAB_VALUES as readonly string[]).includes(requested ?? "")
    ? (requested as TabValue)
    : "activity";
}

export default function App() {
  const store = useLiveStore();
  const {
    projects,
    sessions,
    eventsBySession,
    connectionState,
    error,
    selectedProjectHash,
    setSelectedProjectHash,
    sendControl,
    controlBusy,
    clearError,
  } = store;

  const currentProject = React.useMemo(
    () => projects.find((project) => project.project_hash === selectedProjectHash) ?? null,
    [projects, selectedProjectHash],
  );

  const currentSessions = React.useMemo(() => {
    if (!selectedProjectHash) return [];
    return sessions
      .filter((session) => session.project_hash === selectedProjectHash)
      .sort((left, right) => right.last_event_at - left.last_event_at);
  }, [selectedProjectHash, sessions]);

  // Events for the active project, newest first, de-duplicated across sessions.
  const projectEvents = React.useMemo(() => {
    const seen = new Set<string>();
    const all = currentSessions.flatMap((session) => eventsBySession[session.key] ?? []);
    const unique = all.filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
    return unique.sort((left, right) => (right.seq ?? 0) - (left.seq ?? 0));
  }, [currentSessions, eventsBySession]);

  const conflicts = React.useMemo(
    () => projectEvents.filter((event): event is ConflictEvent => event.type === "conflict"),
    [projectEvents],
  );

  const pendingTotal = React.useMemo(
    () =>
      currentSessions.reduce(
        (total, session) =>
          total + openPendingPermissions(eventsBySession[session.key] ?? []).length,
        0,
      ),
    [currentSessions, eventsBySession],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full">
        <ProjectSidebar
          projects={projects}
          selectedProjectHash={selectedProjectHash}
          onSelect={setSelectedProjectHash}
          connectionState={connectionState}
          eventsBySession={eventsBySession}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-6 py-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {currentProject?.name ?? "Awaiting project"}
              </h1>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {currentProject?.root ??
                  "Open Holdpoint from a project, or wait for the first event."}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {currentSessions.length} session{currentSessions.length === 1 ? "" : "s"}
              </span>
              <span aria-hidden>·</span>
              <span>{projectEvents.length} events</span>
            </div>
          </header>

          {error ? (
            <div className="flex items-center justify-between gap-3 border-b border-danger/30 bg-danger/10 px-6 py-2.5 text-sm text-danger">
              <span className="truncate">{error}</span>
              <button
                type="button"
                onClick={clearError}
                className="shrink-0 rounded-md p-1 hover:bg-danger/20"
                aria-label="Dismiss error"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}

          <Tabs defaultValue={initialTab()} className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-border px-6 py-3">
              <TabsList>
                <TabsTrigger value="activity">
                  <Activity />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="sessions">
                  <Radio />
                  Sessions
                  {pendingTotal > 0 ? (
                    <Badge tone="accent" className="ml-1 px-1.5 py-0">
                      {pendingTotal}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="conflicts">
                  <FileWarning />
                  Conflicts
                  {conflicts.length > 0 ? (
                    <Badge tone="danger" className="ml-1 px-1.5 py-0">
                      {conflicts.length}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="health">
                  <Gauge />
                  Health
                </TabsTrigger>
                <TabsTrigger value="checks">
                  <ListChecks />
                  Checks
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="activity">
              <ActivityTab events={projectEvents} />
            </TabsContent>
            <TabsContent value="sessions">
              <SessionsTab
                sessions={currentSessions}
                eventsBySession={eventsBySession}
                controlBusy={controlBusy}
                sendControl={sendControl}
              />
            </TabsContent>
            <TabsContent value="conflicts">
              <ConflictsTab conflicts={conflicts} />
            </TabsContent>
            <TabsContent value="health">
              <HealthTab events={projectEvents} />
            </TabsContent>
            <TabsContent value="checks">
              <ChecksTab
                projectHash={selectedProjectHash}
                projectName={currentProject?.name ?? "project"}
              />
            </TabsContent>
            <TabsContent value="history">
              <ReportView projectHash={selectedProjectHash} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </TooltipProvider>
  );
}
