"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

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
    <div className="w-full">
      <div
        className="mb-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Choose your operating system"
      >
        {PLATFORMS.map((platformOption) => (
          <button
            key={platformOption.id}
            type="button"
            onClick={() => setPlatform(platformOption.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              platform === platformOption.id
                ? "border-signal/40 bg-signal/20 text-signal"
                : "border-white/10 bg-white/5 text-stone hover:border-white/20 hover:text-bone"
            }`}
          >
            {platformOption.label}
          </button>
        ))}
      </div>

      <div
        className="mb-3 flex flex-wrap gap-2"
        role="group"
        aria-label="Choose which agent to install for"
      >
        {AGENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAgent(a.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              agent === a.id
                ? "border-signal/40 bg-signal/20 text-signal"
                : "border-white/10 bg-white/5 text-stone hover:border-white/20 hover:text-bone"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div
        className="surface-panel flex flex-col gap-3 rounded-[24px] p-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
      >
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-white/10 bg-ink/70 px-4 py-3">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.22em] text-stone/80">
            Install command
          </p>
          <code className="inline-block min-w-max whitespace-nowrap text-sm leading-6 text-bone">
            <span className="select-none text-stone">$ </span>
            {command}
          </code>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy install command"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone transition hover:border-white/20 hover:text-bone sm:self-stretch"
        >
          {copied ? <Check size={14} className="text-signal" /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      {agent !== "all" && (
        <p className="mt-3 text-xs leading-6 text-stone">
          Per-agent <code className="text-bone">npx holdpoint@alpha init --agent ...</code> installs
          are the same on every OS. The platform toggle only changes the all-agents one-liner.
        </p>
      )}
    </div>
  );
}
