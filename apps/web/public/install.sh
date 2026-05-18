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

hp()   { printf "${CYAN}[holdpoint]${RESET} %s\n" "$*"; }
ok()   { printf "${GREEN}[holdpoint] ✓${RESET} %s\n" "$*"; }
warn() { printf "${YELLOW}[holdpoint] ⚠${RESET} %s\n" "$*"; }
die()  { printf "${RED}[holdpoint] ✗${RESET} %s\n" "$*" >&2; exit 1; }

# ─── Banner ───────────────────────────────────────────────────────────────────

printf "\n"
printf "${CYAN}  ██╗  ██╗ ██████╗ ██╗     ██████╗ ██████╗  ██████╗ ██╗███╗   ██╗████████╗${RESET}\n"
printf "${CYAN}  ██║  ██║██╔═══██╗██║     ██╔══██╗██╔══██╗██╔═══██╗██║████╗  ██║╚══██╔══╝${RESET}\n"
printf "${CYAN}  ███████║██║   ██║██║     ██║  ██║██████╔╝██║   ██║██║██╔██╗ ██║   ██║   ${RESET}\n"
printf "${CYAN}  ██╔══██║██║   ██║██║     ██║  ██║██╔═══╝ ██║   ██║██║██║╚██╗██║   ██║   ${RESET}\n"
printf "${CYAN}  ██║  ██║╚██████╔╝███████╗██████╔╝██║     ╚██████╔╝██║██║ ╚████║   ██║   ${RESET}\n"
printf "${CYAN}  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═════╝ ╚═╝      ╚═════╝ ╚═╝╚═╝  ╚═══╝   ╚═╝  ${RESET}\n"
printf "\n"
hp "Universal eval-guard for AI coding agents"
hp "${DIM}Early alpha — APIs may change before 1.0${RESET}"
printf "\n"

# ─── Prerequisites ────────────────────────────────────────────────────────────

git rev-parse --git-dir > /dev/null 2>&1 \
  || die "Not a git repository. Run this inside your project root."

command -v node > /dev/null 2>&1 \
  || die "Node.js not found. Install Node.js 18+ from https://nodejs.org"

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[ "$NODE_MAJOR" -ge 18 ] \
  || warn "Node.js ${NODE_MAJOR} detected — Holdpoint requires Node 18+. Upgrade recommended."

# ─── Detect agent ─────────────────────────────────────────────────────────────

AGENT="unknown"
if   [ -d ".github/extensions" ];                             then AGENT="copilot"
elif [ -d ".claude" ] || command -v claude > /dev/null 2>&1; then AGENT="claude"
elif [ -f ".cursorrules" ] || [ -d ".cursor" ];              then AGENT="cursor"
fi

hp "Detected agent : ${BOLD}${AGENT}${RESET}"

# ─── Detect stack ─────────────────────────────────────────────────────────────

STACK="unknown"
HAS_NEXT=false; HAS_TS=false; HAS_PY=false; HAS_GO=false
HAS_PRISMA=false; HAS_BACKEND=false

if [ -f "next.config.ts" ] || [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then HAS_NEXT=true;   fi
if [ -f "tsconfig.json" ];                                                            then HAS_TS=true;    fi
if [ -f "pyproject.toml" ] || [ -f "requirements.txt" ] || [ -f "setup.py" ];        then HAS_PY=true;    fi
if [ -f "go.mod" ];                                                                   then HAS_GO=true;    fi
if [ -f "prisma/schema.prisma" ];                                                     then HAS_PRISMA=true; fi
if [ -d "server" ] || [ -d "api" ] || [ -d "backend" ];                              then HAS_BACKEND=true; fi

if   $HAS_NEXT && ($HAS_PRISMA || $HAS_BACKEND); then STACK="fullstack"
elif $HAS_NEXT;                                   then STACK="nextjs"
elif $HAS_TS;                                     then STACK="typescript"
elif $HAS_PY;                                     then STACK="python"
elif $HAS_GO;                                     then STACK="go"
fi

hp "Detected stack  : ${BOLD}${STACK}${RESET}"

# ─── Install ──────────────────────────────────────────────────────────────────

printf "\n"
hp "Running: npx @holdpoint/cli@alpha init --stack=${STACK} --agent=${AGENT}"
printf "\n"

npx --yes @holdpoint/cli@alpha init --stack="${STACK}" --agent="${AGENT}"

# ─── Done ─────────────────────────────────────────────────────────────────────

printf "\n"
ok "Holdpoint is active."
printf "\n"
printf "  ${DIM}Edit${RESET}   ${YELLOW}checks.yaml${RESET}                        — customise your eval checkpoints\n"
printf "  ${DIM}Check${RESET}  ${YELLOW}npx @holdpoint/cli@alpha check${RESET}     — run all checks manually\n"
printf "  ${DIM}Build${RESET}  ${YELLOW}npx @holdpoint/cli@alpha builder${RESET}   — open the visual builder\n"
printf "  ${DIM}Docs${RESET}   ${YELLOW}https://holdpoint.dev/docs${RESET}         — full documentation\n"
printf "\n"
