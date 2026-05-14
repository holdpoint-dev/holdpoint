#!/usr/bin/env bash
# install.sh — Sentinel one-line installer
# Usage: curl -fsSL https://raw.githubusercontent.com/HarzerHeribert/sentinel/main/install.sh | sh
set -euo pipefail

SENTINEL_CYAN='\033[0;36m'
SENTINEL_GREEN='\033[0;32m'
SENTINEL_YELLOW='\033[1;33m'
SENTINEL_RED='\033[0;31m'
SENTINEL_RESET='\033[0m'

info()    { echo -e "${SENTINEL_CYAN}[sentinel]${SENTINEL_RESET} $*"; }
success() { echo -e "${SENTINEL_GREEN}[sentinel] ✓${SENTINEL_RESET} $*"; }
warn()    { echo -e "${SENTINEL_YELLOW}[sentinel] ⚠${SENTINEL_RESET} $*"; }
error()   { echo -e "${SENTINEL_RED}[sentinel] ✗${SENTINEL_RESET} $*" >&2; }
die()     { error "$*"; exit 1; }

echo ""
echo -e "${SENTINEL_CYAN}   ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗${SENTINEL_RESET}"
echo -e "${SENTINEL_CYAN}   ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║${SENTINEL_RESET}"
echo -e "${SENTINEL_CYAN}   ███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║${SENTINEL_RESET}"
echo -e "${SENTINEL_CYAN}   ╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║${SENTINEL_RESET}"
echo -e "${SENTINEL_CYAN}   ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗${SENTINEL_RESET}"
echo -e "${SENTINEL_CYAN}   ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝${SENTINEL_RESET}"
echo ""
info "Universal eval-guard for AI coding agents"
echo ""

# ─── Checks ───────────────────────────────────────────────────────────────────

# Must be inside a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  die "Not a git repository. Run this inside your project root."
fi

# Node.js check
if ! command -v node &> /dev/null; then
  die "Node.js not found. Install Node.js 18+ from https://nodejs.org and re-run."
fi

NODE_VERSION=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VERSION" -lt 18 ]; then
  warn "Node.js ${NODE_VERSION} detected. Sentinel requires Node 18+. Upgrade recommended."
fi

# ─── Agent detection ──────────────────────────────────────────────────────────

DETECTED_AGENT="unknown"

if [ -d ".github/extensions" ]; then
  DETECTED_AGENT="copilot"
elif [ -d ".claude" ] || command -v claude &> /dev/null 2>&1; then
  DETECTED_AGENT="claude"
elif [ -f ".cursorrules" ] || [ -d ".cursor" ]; then
  DETECTED_AGENT="cursor"
fi

info "Detected agent: ${DETECTED_AGENT}"

# ─── Stack detection ──────────────────────────────────────────────────────────

DETECTED_STACK="unknown"

HAS_NEXT=false
HAS_TSCONFIG=false
HAS_PYPROJECT=false
HAS_PRISMA=false
HAS_BACKEND=false

[ -f "next.config.ts" ] || [ -f "next.config.js" ] || [ -f "next.config.mjs" ] && HAS_NEXT=true
[ -f "tsconfig.json" ] && HAS_TSCONFIG=true
[ -f "pyproject.toml" ] || [ -f "requirements.txt" ] || [ -f "setup.py" ] && HAS_PYPROJECT=true
[ -f "prisma/schema.prisma" ] && HAS_PRISMA=true
[ -d "server" ] || [ -d "api" ] || [ -d "backend" ] && HAS_BACKEND=true

if $HAS_NEXT && ($HAS_PRISMA || $HAS_BACKEND); then
  DETECTED_STACK="fullstack"
elif $HAS_NEXT; then
  DETECTED_STACK="nextjs"
elif $HAS_TSCONFIG; then
  DETECTED_STACK="typescript"
elif $HAS_PYPROJECT; then
  DETECTED_STACK="python"
fi

info "Detected stack: ${DETECTED_STACK}"

# ─── Install ──────────────────────────────────────────────────────────────────

info "Running: npx sentinel@latest init --stack=${DETECTED_STACK} --agent=${DETECTED_AGENT}"
echo ""

npx --yes sentinel@latest init --stack="${DETECTED_STACK}" --agent="${DETECTED_AGENT}"

echo ""
success "Sentinel active."
echo ""
echo -e "  Edit ${SENTINEL_YELLOW}checks.yaml${SENTINEL_RESET} to customise your eval checkpoints."
echo -e "  Run   ${SENTINEL_YELLOW}npx sentinel check${SENTINEL_RESET} to validate at any time."
echo -e "  Open  ${SENTINEL_YELLOW}npx sentinel build${SENTINEL_RESET} for the visual builder."
echo ""
