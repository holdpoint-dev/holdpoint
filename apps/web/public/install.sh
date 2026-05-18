#!/usr/bin/env bash
# install.sh — Holdpoint one-line installer
# Usage: curl -fsSL https://holdpoint.dev/install.sh | sh
set -euo pipefail

HOLDPOINT_CYAN='\033[0;36m'
HOLDPOINT_GREEN='\033[0;32m'
HOLDPOINT_YELLOW='\033[1;33m'
HOLDPOINT_RED='\033[0;31m'
HOLDPOINT_RESET='\033[0m'

info()    { echo -e "${HOLDPOINT_CYAN}[holdpoint]${HOLDPOINT_RESET} $*"; }
success() { echo -e "${HOLDPOINT_GREEN}[holdpoint] ✓${HOLDPOINT_RESET} $*"; }
warn()    { echo -e "${HOLDPOINT_YELLOW}[holdpoint] ⚠${HOLDPOINT_RESET} $*"; }
error()   { echo -e "${HOLDPOINT_RED}[holdpoint] ✗${HOLDPOINT_RESET} $*" >&2; }
die()     { error "$*"; exit 1; }

echo ""
echo -e "${HOLDPOINT_CYAN}  ██╗  ██╗ ██████╗ ██╗     ██████╗ ██████╗  ██████╗ ██╗███╗   ██╗████████╗${HOLDPOINT_RESET}"
echo -e "${HOLDPOINT_CYAN}  ██║  ██║██╔═══██╗██║     ██╔══██╗██╔══██╗██╔═══██╗██║████╗  ██║╚══██╔══╝${HOLDPOINT_RESET}"
echo -e "${HOLDPOINT_CYAN}  ███████║██║   ██║██║     ██║  ██║██████╔╝██║   ██║██║██╔██╗ ██║   ██║   ${HOLDPOINT_RESET}"
echo -e "${HOLDPOINT_CYAN}  ██╔══██║██║   ██║██║     ██║  ██║██╔═══╝ ██║   ██║██║██║╚██╗██║   ██║   ${HOLDPOINT_RESET}"
echo -e "${HOLDPOINT_CYAN}  ██║  ██║╚██████╔╝███████╗██████╔╝██║     ╚██████╔╝██║██║ ╚████║   ██║   ${HOLDPOINT_RESET}"
echo -e "${HOLDPOINT_CYAN}  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═════╝ ╚═╝      ╚═════╝ ╚═╝╚═╝  ╚═══╝   ╚═╝   ${HOLDPOINT_RESET}"
echo ""
info "Universal eval-guard for AI coding agents"
info "Installing alpha — APIs may change before 1.0."
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
  warn "Node.js ${NODE_VERSION} detected. Holdpoint requires Node 18+. Upgrade recommended."
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

info "Running: npx @holdpoint/cli@alpha init --stack=${DETECTED_STACK} --agent=${DETECTED_AGENT}"
echo ""

npx --yes @holdpoint/cli@alpha init --stack="${DETECTED_STACK}" --agent="${DETECTED_AGENT}"

echo ""
success "Holdpoint active."
echo ""
echo -e "  Edit ${HOLDPOINT_YELLOW}checks.yaml${HOLDPOINT_RESET} to customise your eval checkpoints."
echo -e "  Run   ${HOLDPOINT_YELLOW}npx @holdpoint/cli@alpha check${HOLDPOINT_RESET} to validate at any time."
echo -e "  Open  ${HOLDPOINT_YELLOW}npx @holdpoint/cli@alpha builder${HOLDPOINT_RESET} for the visual builder (monorepo only in alpha)."
echo ""
