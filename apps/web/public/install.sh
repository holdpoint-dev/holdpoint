#!/usr/bin/env bash
# install.sh — Holdpoint one-line installer
# Usage: curl -fsSL https://holdpoint.dev/install.sh | sh
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

hp()   { printf "${CYAN}  holdpoint${RESET}  %s\n" "$*"; }
ok()   { printf "${GREEN}  ✓${RESET}  %s\n" "$*"; }
warn() { printf "${YELLOW}  ⚠${RESET}  %s\n" "$*"; }
die()  { printf "${RED}  ✗${RESET}  %s\n" "$*" >&2; exit 1; }

# ─── Banner ───────────────────────────────────────────────────────────────────

printf "\n"
printf "${CYAN}${BOLD}  holdpoint${RESET}  ${DIM}universal eval-guard for AI coding agents${RESET}\n"
printf "  ${DIM}early alpha · https://holdpoint.dev${RESET}\n"
printf "\n"

# ─── Prerequisites ────────────────────────────────────────────────────────────

git rev-parse --git-dir > /dev/null 2>&1 \
  || die "Not a git repository. Run this inside your project root."

command -v node > /dev/null 2>&1 \
  || die "Node.js not found. Install Node.js 18+ from https://nodejs.org"

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[ "$NODE_MAJOR" -ge 18 ] \
  || warn "Node.js ${NODE_MAJOR} detected — Holdpoint requires Node 18+. Upgrade recommended."

# ─── Install ──────────────────────────────────────────────────────────────────

hp "Installing for all agents  ${DIM}(Claude Code · Copilot · Cursor · Codex)${RESET}"
printf "\n"

npx --yes holdpoint@alpha init

# ─── Post-install hygiene ─────────────────────────────────────────────────────

# .holdpoint/ stores check-reports — it's runtime cache, not source.
if ! grep -qxF ".holdpoint/" .gitignore 2>/dev/null; then
  printf "\n.holdpoint/" >> .gitignore
fi

# ─── Done ─────────────────────────────────────────────────────────────────────

printf "\n"
printf "${GREEN}${BOLD}  Done.${RESET}  Holdpoint is active.\n"
printf "\n"
printf "  ${BOLD}Files written — commit these to your repo:${RESET}\n"
printf "  ${DIM}·${RESET} ${YELLOW}checks.yaml${RESET}                       your eval checkpoints (edit this)\n"
printf "  ${DIM}·${RESET} ${YELLOW}.claude/settings.json${RESET}             Claude Code stop hook\n"
printf "  ${DIM}·${RESET} ${YELLOW}.github/extensions/holdpoint/${RESET}     Copilot extension\n"
printf "  ${DIM}·${RESET} ${YELLOW}.cursorrules${RESET}                       Cursor rules\n"
printf "  ${DIM}·${RESET} ${YELLOW}.codex/hooks.json${RESET}                 Codex hook\n"
printf "\n"
printf "  ${BOLD}Next steps:${RESET}\n"
printf "  ${DIM}1.${RESET} Review ${YELLOW}checks.yaml${RESET} and add checks for your project\n"
printf "  ${DIM}2.${RESET} ${DIM}git add -A && git commit -m 'chore: add holdpoint'${RESET}\n"
printf "  ${DIM}3.${RESET} ${YELLOW}npx holdpoint@alpha check --staged${RESET} to run checks at any time\n"
printf "\n"
printf "  ${DIM}Visual builder · npx holdpoint@alpha builder${RESET}\n"
printf "  ${DIM}Docs           · https://holdpoint.dev/docs${RESET}\n"
printf "\n"
