"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";

const AGENTS = [
  { id: "all", label: "All agents" },
  { id: "copilot", label: "Copilot" },
  { id: "claude", label: "Claude" },
  { id: "cursor", label: "Cursor" },
  { id: "codex", label: "Codex" },
] as const;

const PLATFORMS = [
  { id: "unix", label: "macOS / Linux" },
  { id: "windows", label: "Windows" },
] as const;

const CURSOR_NOTICE =
  "Cursor cannot hard-block completion: Holdpoint only writes .cursorrules instructions, so checks are advisory there.";

type AgentId = (typeof AGENTS)[number]["id"];
type PlatformId = (typeof PLATFORMS)[number]["id"];

function buildCommand(agentId: AgentId, platformId: PlatformId): string {
  if (agentId === "all") {
    return platformId === "windows"
      ? 'powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://holdpoint.dev/install.ps1 | iex"'
      : "curl -fsSL https://holdpoint.dev/install.sh | sh";
  }
  return `npx holdpoint@alpha init --agent ${agentId}`;
}

/** Agent-aware install command picker with copy support for the landing page. */
export function InstallCommand() {
  const [agent, setAgent] = useState<AgentId>("all");
  const [platform, setPlatform] = useState<PlatformId>("unix");
  const [copied, setCopied] = useState(false);
  const command = buildCommand(agent, platform);
  const showCursorNotice = agent === "cursor" || agent === "all";

  function handleCopy() {
    void navigator.clipboard
      .writeText(command)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch((error: unknown) => {
        console.error("Failed to copy install command.", error);
      });
  }

  return (
    <div className="w-full rounded-[1.35rem] border border-white/[0.08] bg-white/[0.035] p-2 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-3 px-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-stone/55">
          Install command
        </p>

        <div
          className="inline-flex w-fit rounded-full border border-white/[0.07] bg-ink/70 p-0.5"
          role="group"
          aria-label="Choose your operating system"
        >
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              aria-pressed={platform === p.id}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                platform === p.id ? "bg-white/[0.1] text-bone" : "text-stone/55 hover:text-stone"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 border-y border-white/[0.06] px-1 py-2">
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label="Choose which agent to install for"
        >
          {AGENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAgent(a.id)}
              aria-pressed={agent === a.id}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                agent === a.id
                  ? "bg-signal/10 text-signal"
                  : "text-stone/55 hover:bg-white/[0.04] hover:text-stone"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 rounded-[1rem] border border-white/[0.08] bg-ink/75 px-3 py-2.5">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <code
            className="inline-block min-w-max whitespace-nowrap font-mono text-[13px] leading-6 text-bone"
            style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
          >
            <span className="select-none text-stone/40">$ </span>
            {command}
          </code>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy install command"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.06] px-2.5 py-1.5 text-xs text-stone transition-colors hover:border-signal/30 hover:text-bone"
        >
          {copied ? <Check size={13} className="text-signal" /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {showCursorNotice ? (
        <div className="mt-2 flex gap-2 rounded-[0.9rem] border border-signal/20 bg-signal/[0.07] px-3 py-2 text-xs leading-relaxed text-stone">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" />
          <p>
            <span className="font-medium text-bone">Cursor is advisory only.</span> {CURSOR_NOTICE}
          </p>
        </div>
      ) : null}

      {agent !== "all" ? (
        <p className="mt-3 text-xs text-stone/50">
          Per-agent{" "}
          <code className="font-mono text-stone/70">npx holdpoint@alpha init --agent ...</code> is
          cross-platform. The platform toggle only changes the all-agent one-liner.
        </p>
      ) : null}
    </div>
  );
}
