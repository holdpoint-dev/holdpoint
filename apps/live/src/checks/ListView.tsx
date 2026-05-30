import React from "react";
import { ChevronDown, ListChecks, MessageSquare, Plus, Tag, Terminal, Trash2 } from "lucide-react";
import type { CheckDef } from "@holdpoint/types";
import { useCanvasStore } from "./store.js";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";

// ─── Scope ("when") options, in plain language ─────────────────────────────────

const WHEN_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Every change" },
  { value: "frontend", label: "Frontend files" },
  { value: "backend", label: "Backend / API files" },
  { value: "socket", label: "WebSocket files" },
  { value: "visual", label: "Visual / Storybook" },
  { value: "python", label: "Python files" },
  { value: "go", label: "Go files" },
  { value: "rust", label: "Rust files" },
  { value: "java", label: "Java / Kotlin files" },
  { value: "ruby", label: "Ruby files" },
  { value: "database", label: "Database / migrations" },
  { value: "prisma", label: "Prisma schema" },
  { value: "testing", label: "Test files" },
  { value: "infra", label: "Infrastructure files" },
  { value: "ci", label: "CI / CD pipelines" },
  { value: "docs", label: "Documentation" },
  { value: "structural", label: "Config / structural files" },
];

const CUSTOM = "__custom__";
const NAMED_SCOPES = WHEN_OPTIONS.slice(1).map((o) => o.value);

/** Human label for a scope, used in the compact list rows. */
function whenLabel(when: string | undefined): string {
  if (!when) return "Every change";
  return WHEN_OPTIONS.find((o) => o.value === when)?.label ?? `Pattern: ${when}`;
}

// ─── Small styled controls (semantic tokens, match the rest of the UI) ──────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40";

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "cursor-pointer appearance-none pr-9")}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

// ─── Detail panel: edit one check, applied live to the store ────────────────────

interface Draft {
  label: string;
  type: "task" | "prompt";
  cmd: string;
  prompt: string;
  when: string;
  conditionId: string;
}

function toDraft(check: CheckDef): Draft {
  return {
    label: check.label,
    type: check.cmd !== undefined ? "task" : "prompt",
    cmd: check.cmd ?? "",
    prompt: check.prompt ?? "",
    when: check.when ?? "",
    conditionId: check.conditionId ?? "",
  };
}

function draftToData(draft: Draft): Omit<CheckDef, "id"> {
  const data: Omit<CheckDef, "id"> = { label: draft.label.trim() || "Untitled check" };
  if (draft.when) data.when = draft.when;
  if (draft.conditionId) data.conditionId = draft.conditionId;
  if (draft.type === "task") data.cmd = draft.cmd;
  else data.prompt = draft.prompt;
  return data;
}

function CheckDetail({
  check,
  conditionIds,
  onDeleted,
}: {
  check: CheckDef;
  conditionIds: string[];
  onDeleted: () => void;
}) {
  const { updateCheck, deleteCheck } = useCanvasStore();
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(check));
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Re-sync only when a different check is selected (not on our own edits).
  React.useEffect(() => {
    setDraft(toDraft(check));
    setConfirmDelete(false);
  }, [check.id]);

  // Push every edit straight into the store so the outer Save diff reflects it.
  function patch(next: Partial<Draft>) {
    setDraft((current) => {
      const merged = { ...current, ...next };
      updateCheck(check.id, draftToData(merged));
      return merged;
    });
  }

  const whenIsCustom = draft.when !== "" && !NAMED_SCOPES.includes(draft.when);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-md",
                draft.type === "task" ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
              )}
            >
              {draft.type === "task" ? (
                <Terminal className="size-3.5" />
              ) : (
                <MessageSquare className="size-3.5" />
              )}
            </span>
            <span className="truncate text-sm font-semibold text-foreground">
              {draft.label || "Untitled check"}
            </span>
          </div>
          <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{check.id}</span>
        </div>
        <Button
          size="sm"
          variant={confirmDelete ? "danger" : "ghost"}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 3000);
              return;
            }
            deleteCheck(check.id);
            onDeleted();
          }}
        >
          <Trash2 />
          {confirmDelete ? "Confirm" : "Delete"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <Field label="Name">
          <input
            className={inputClass}
            value={draft.label}
            onChange={(e) => patch({ label: e.target.value })}
            placeholder="What this check verifies"
          />
        </Field>

        <Field label="Type">
          <Select value={draft.type} onChange={(v) => patch({ type: v as "task" | "prompt" })}>
            <option value="task">Automatic — runs a command</option>
            <option value="prompt">Manual — the agent confirms it</option>
          </Select>
        </Field>

        {draft.type === "task" ? (
          <Field
            label="Command"
            hint="Runs automatically. The agent can't finish until this exits successfully."
          >
            <input
              className={cn(inputClass, "font-mono")}
              value={draft.cmd}
              onChange={(e) => patch({ cmd: e.target.value })}
              placeholder="npm test"
            />
          </Field>
        ) : (
          <Field
            label="Instruction"
            hint="The agent must read this and confirm it before finishing."
          >
            <textarea
              rows={4}
              className={cn(inputClass, "resize-none")}
              value={draft.prompt}
              onChange={(e) => patch({ prompt: e.target.value })}
              placeholder="e.g. Confirm new API routes have request validation."
            />
          </Field>
        )}

        <Field
          label="Runs on"
          hint="Limit this check to changes that touch matching files. “Every change” always runs it."
        >
          <Select
            value={whenIsCustom ? CUSTOM : draft.when}
            onChange={(v) => patch({ when: v === CUSTOM ? (whenIsCustom ? draft.when : "") : v })}
          >
            {WHEN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            <option value={CUSTOM}>Custom file pattern…</option>
          </Select>
          {whenIsCustom ? (
            <input
              className={cn(inputClass, "mt-2 font-mono")}
              value={draft.when}
              onChange={(e) => patch({ when: e.target.value })}
              placeholder="\.test\.ts$"
            />
          ) : null}
        </Field>

        <Field
          label="Only if"
          hint="Skip this check unless a project condition matches. Conditions are defined in checks.yaml."
        >
          {conditionIds.length === 0 && !draft.conditionId ? (
            <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground">
              No conditions defined for this project — this check always applies.
            </p>
          ) : (
            <Select value={draft.conditionId} onChange={(v) => patch({ conditionId: v })}>
              <option value="">Always applies</option>
              {[...new Set([...conditionIds, draft.conditionId].filter(Boolean))].map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </div>
  );
}

// ─── List row ───────────────────────────────────────────────────────────────

function CheckRow({
  check,
  active,
  onSelect,
}: {
  check: CheckDef;
  active: boolean;
  onSelect: () => void;
}) {
  const isTask = check.cmd !== undefined;
  return (
    <button
      type="button"
      data-testid="check-row"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        active ? "bg-muted" : "hover:bg-muted/50",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md",
          isTask ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
        )}
      >
        {isTask ? <Terminal className="size-3.5" /> : <MessageSquare className="size-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{check.label}</span>
        {isTask && check.cmd ? (
          <span className="block truncate font-mono text-[11px] text-muted-foreground">
            {check.cmd}
          </span>
        ) : null}
      </span>
      {check.when ? (
        <span className="shrink-0 text-[11px] text-muted-foreground">{whenLabel(check.when)}</span>
      ) : null}
      {check.conditionId ? (
        <Tag className="size-3 shrink-0 text-muted-foreground" aria-label="conditional" />
      ) : null}
    </button>
  );
}

function ListGroup({
  title,
  hint,
  icon,
  checks,
  selectedId,
  onSelect,
  onAdd,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  checks: CheckDef[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-center gap-2 px-3">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <span className="text-[11px] text-muted-foreground/70">{checks.length}</span>
        <button
          type="button"
          onClick={onAdd}
          className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          title={`Add ${title.toLowerCase()}`}
        >
          <Plus className="size-3" />
          Add
        </button>
      </div>
      {checks.length === 0 ? (
        <p className="px-3 pb-2 text-xs text-muted-foreground/70">{hint}</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {checks.map((check) => (
            <CheckRow
              key={check.id}
              check={check}
              active={check.id === selectedId}
              onSelect={() => onSelect(check.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Main ListView ──────────────────────────────────────────────────────────

export function ListView() {
  const { config, addCheck } = useCanvasStore();
  const checks = React.useMemo(() => config?.checks ?? [], [config]);
  const conditionIds = React.useMemo(() => (config?.conditions ?? []).map((c) => c.id), [config]);

  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const automated = checks.filter((c) => c.cmd !== undefined);
  const manual = checks.filter((c) => c.prompt !== undefined);

  // Keep a valid selection as checks load / change.
  React.useEffect(() => {
    if (checks.length === 0) {
      setSelectedId(null);
    } else if (!selectedId || !checks.some((c) => c.id === selectedId)) {
      setSelectedId(checks[0]!.id);
    }
  }, [checks, selectedId]);

  function handleAdd(type: "task" | "prompt") {
    const label = type === "task" ? "New automatic check" : "New manual check";
    addCheck({ label, ...(type === "task" ? { cmd: "" } : { prompt: "" }) });
    const next = useCanvasStore.getState().config?.checks ?? [];
    const created = next[next.length - 1];
    if (created) setSelectedId(created.id);
  }

  const selected = checks.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(280px,360px)_1fr]">
      <div className="min-h-0 overflow-y-auto border-r border-border px-2 py-4">
        <div className="flex flex-col gap-5">
          <ListGroup
            title="Automatic"
            hint="No automatic checks. Add a command that must pass — lint, tests, types."
            icon={<Terminal className="size-3.5 text-success" />}
            checks={automated}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={() => handleAdd("task")}
          />
          <ListGroup
            title="Manual"
            hint="No manual checks. Add an instruction the agent must confirm before finishing."
            icon={<MessageSquare className="size-3.5 text-warning" />}
            checks={manual}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={() => handleAdd("prompt")}
          />
        </div>
      </div>

      <div className="min-h-0">
        {selected ? (
          <CheckDetail
            key={selected.id}
            check={selected}
            conditionIds={conditionIds}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              icon={ListChecks}
              title="No check selected"
              description="Pick a check on the left to see and edit its details, or add one."
            />
          </div>
        )}
      </div>
    </div>
  );
}
