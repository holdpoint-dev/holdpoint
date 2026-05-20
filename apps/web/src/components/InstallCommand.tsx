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
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Choose your operating system"
      >
        {PLATFORMS.map((platformOption) => (
          <button
            key={platformOption.id}
            type="button"
            onClick={() => setPlatform(platformOption.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              platform === platformOption.id
                ? "border-signal/[0.35] bg-signal/[0.18] text-signal"
                : "border-white/10 bg-white/5 text-stone hover:border-white/20 hover:text-bone"
            }`}
          >
            {platformOption.label}
          </button>
        ))}
      </div>

      <div
        className="mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label="Choose which agent to install for"
      >
        {AGENTS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setAgent(option.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              agent === option.id
                ? "border-signal/[0.35] bg-signal/[0.18] text-signal"
                : "border-white/10 bg-white/5 text-stone hover:border-white/20 hover:text-bone"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div
        className="surface-panel rounded-[30px] p-4"
        style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
      >
        <div className="rounded-[24px] border border-white/10 bg-ink/85 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-stone/80">
                Install command
              </p>
              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <code className="inline-block min-w-max whitespace-nowrap text-sm leading-7 text-bone">
                  <span className="select-none text-stone">$ </span>
                  {command}
                </code>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy install command"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-stone transition hover:border-white/20 hover:text-bone"
            >
              {copied ? <Check size={14} className="text-signal" /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>

      {agent !== "all" ? (
        <p className="mt-4 text-sm leading-7 text-stone">
          Per-agent{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-bone">
            npx holdpoint@alpha init --agent ...
          </code>{" "}
          installs are the same on every OS. The platform toggle only changes the all-agent
          one-liner.
        </p>
      ) : null}
    </div>
  );
}
