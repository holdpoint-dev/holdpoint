"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

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
        className="mb-3 flex flex-wrap justify-center gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-1"
        role="group"
        aria-label="Choose your operating system"
      >
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlatform(p.id)}
            aria-pressed={platform === p.id}
            className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
              platform === p.id
                ? "bg-white/[0.08] text-bone"
                : "text-stone/60 hover:bg-white/[0.04] hover:text-stone"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div
        className="mb-4 flex flex-wrap justify-center gap-1"
        role="group"
        aria-label="Choose which agent to install for"
      >
        {AGENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAgent(a.id)}
            aria-pressed={agent === a.id}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              agent === a.id
                ? "bg-signal/10 text-signal"
                : "text-stone/60 hover:bg-white/[0.04] hover:text-stone"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/[0.09] bg-ink-2/80 px-4 py-3 shadow-2xl shadow-black/20">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <code
            className="inline-block min-w-max whitespace-nowrap font-mono text-sm text-bone"
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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm text-stone transition-colors hover:text-bone"
        >
          {copied ? <Check size={13} className="text-signal" /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

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
