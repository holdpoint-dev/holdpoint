"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const AGENTS = [
  { id: "all",     label: "All agents" },
  { id: "copilot", label: "Copilot"    },
  { id: "claude",  label: "Claude"     },
  { id: "cursor",  label: "Cursor"     },
  { id: "codex",   label: "Codex"      },
] as const;

type AgentId = (typeof AGENTS)[number]["id"];

function buildCommand(agentId: AgentId): string {
  if (agentId === "all") {
    return "curl -fsSL https://holdpoint.dev/install.sh | sh";
  }
  return `npx holdpoint@alpha init --agent ${agentId}`;
}

export function InstallCommand() {
  const [agent, setAgent]   = useState<AgentId>("all");
  const [copied, setCopied] = useState(false);
  const command = buildCommand(agent);

  function handleCopy() {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="w-full max-w-xl">
      {/* Agent picker tabs */}
      <div
        className="mb-2 flex flex-wrap gap-1"
        role="group"
        aria-label="Choose which agent to install for"
      >
        {AGENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAgent(a.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              agent === a.id
                ? "bg-signal/20 text-signal border border-signal/40"
                : "bg-ink-2 text-stone border border-ink-3 hover:border-stone/50 hover:text-bone"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Command display */}
      <div
        className="flex items-center justify-between gap-3 rounded-xl border border-ink-3 bg-ink-2 px-4 py-3 text-sm"
        style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" }}
      >
        <span className="truncate text-bone">
          <span className="select-none text-stone">$ </span>
          {command}
        </span>
        <button
          onClick={handleCopy}
          aria-label="Copy install command"
          className="shrink-0 text-stone transition hover:text-bone"
        >
          {copied ? <Check size={14} className="text-signal" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
