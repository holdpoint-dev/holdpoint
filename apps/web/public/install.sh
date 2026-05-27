#!/usr/bin/env sh
# install.sh — Holdpoint one-line installer
# Usage: curl -fsSL https://holdpoint.dev/install.sh | sh
#
# Animation philosophy: this script is the user's first impression of
# Holdpoint, so we lean into the brand's terminal-glyph aesthetic — a
# glitchy reveal of the wordmark using the same . : + * # x = - palette
# the landing page cycles through, then a mission-control style sequence
# of bracketed phase indicators with a braille spinner during the slow
# bits. All animation is TTY-gated; piped to a log file you get plain
# text. We deliberately do NOT print a "Done / Files written / Next steps"
# block at the end because `holdpoint init` already prints all of that
# and duplicating it produces an awkward double-block.

set -eu

# ─── Terminal capability detection ───────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-dumb}" != "dumb" ]; then
  C_SIGNAL='\033[38;5;202m'  # ≈ rgb(224, 78, 42) — Holdpoint brand orange
  C_GLYPH='\033[38;5;208m'   # softer orange for the glitch frames
  C_CYAN='\033[38;5;51m'
  C_GREEN='\033[38;5;42m'
  C_YELLOW='\033[38;5;220m'
  C_RED='\033[38;5;203m'
  C_DIM='\033[2m'
  C_BOLD='\033[1m'
  C_RESET='\033[0m'
  HIDE_CURSOR=$(printf '\033[?25l')
  SHOW_CURSOR=$(printf '\033[?25h')
  CLEAR_LINE=$(printf '\033[2K\r')
  IS_TTY=1
else
  C_SIGNAL= C_GLYPH= C_CYAN= C_GREEN= C_YELLOW= C_RED=
  C_DIM= C_BOLD= C_RESET=
  HIDE_CURSOR= SHOW_CURSOR= CLEAR_LINE=
  IS_TTY=0
fi

# Always restore cursor visibility on exit/interrupt.
trap 'printf "%s" "${SHOW_CURSOR}"' EXIT INT TERM

# ─── Output helpers ──────────────────────────────────────────────────────
# Bracketed mission-control phase indicators. Pad name to 8 chars so the
# checkmark column lines up across rows.
phase() {
  name="$1"
  status="$2"   # ✓ / ⠿ / → / ✗
  msg="$3"
  color="$4"
  padded=$(printf "%-8s" "$name")
  printf "  ${C_DIM}[${C_RESET}${C_DIM}${C_BOLD}%s${C_RESET}${C_DIM}]${C_RESET}  ${color}%s${C_RESET}  ${C_DIM}%s${C_RESET}\n" \
    "$padded" "$status" "$msg"
}

ok()    { phase "$1" "✓" "$2" "$C_GREEN"; }
working() { phase "$1" "→" "$2" "$C_CYAN"; }
warn()  { phase "$1" "!" "$2" "$C_YELLOW"; }
fail()  { printf "\n"; phase "$1" "✗" "$2" "$C_RED"; printf "\n"; exit 1; }

# ─── Glyph entropy (pre-generated so animation loops don't fork awk) ─────
# 240 chars of pseudo-random glyphs from the brand palette. We slice
# substrings out of this for glitch frames.
glyph_entropy() {
  awk 'BEGIN {
    srand();
    pool = ".:+*#x=-";
    s = "";
    for (i = 0; i < 240; i++) {
      s = s substr(pool, int(rand() * length(pool)) + 1, 1);
    }
    print s;
  }'
}

# Take an N-char window of entropy starting at a given offset.
glyph_window() {
  start=$1
  len=$2
  printf "%s" "$ENTROPY" | cut -c"$start"-$((start + len - 1))
}

# ─── Wordmark reveal ─────────────────────────────────────────────────────
# Glitches through random glyphs, then resolves "holdpoint" letter by
# letter from the left while the remaining columns keep flickering.
# Skipped entirely when not a TTY.
reveal_wordmark() {
  word="holdpoint"
  len=${#word}

  if [ "$IS_TTY" -eq 0 ]; then
    printf "  ${C_SIGNAL}${C_BOLD}%s${C_RESET}  ${C_DIM}universal eval-guard for AI coding agents${C_RESET}\n" "$word"
    printf "  ${C_DIM}early alpha · https://holdpoint.dev${C_RESET}\n\n"
    return
  fi

  printf "%s" "$HIDE_CURSOR"

  # Pure-glitch frames (6 frames, all-random glyphs).
  i=1
  while [ $i -le 6 ]; do
    frame=$(glyph_window $((i * 9 + 1)) $len)
    printf "${CLEAR_LINE}  ${C_GLYPH}${C_BOLD}%s${C_RESET}" "$frame"
    sleep 0.05
    i=$((i + 1))
  done

  # Reveal each letter L→R; the rest keeps flickering.
  i=1
  while [ $i -le $len ]; do
    resolved=$(printf "%s" "$word" | cut -c1-$i)
    rest_len=$((len - i))
    if [ "$rest_len" -gt 0 ]; then
      flicker=$(glyph_window $((100 + i * 7)) $rest_len)
    else
      flicker=""
    fi
    printf "${CLEAR_LINE}  ${C_SIGNAL}${C_BOLD}%s${C_RESET}${C_GLYPH}${C_BOLD}%s${C_RESET}" \
      "$resolved" "$flicker"
    sleep 0.07
    i=$((i + 1))
  done

  # Final settled wordmark + tagline.
  printf "${CLEAR_LINE}  ${C_SIGNAL}${C_BOLD}%s${C_RESET}  ${C_DIM}universal eval-guard for AI coding agents${C_RESET}\n" "$word"
  printf "  ${C_DIM}early alpha · https://holdpoint.dev${C_RESET}\n\n"
  printf "%s" "$SHOW_CURSOR"
}

# ─── Braille spinner around a long-running command ───────────────────────
# Wraps the given command, hides its output unless it fails. Plain
# fallback for non-TTY.
run_with_spinner() {
  name="$1"; label="$2"; shift 2
  if [ "$IS_TTY" -eq 0 ]; then
    working "$name" "$label"
    "$@" >/tmp/holdpoint-install.log 2>&1 || {
      cat /tmp/holdpoint-install.log >&2
      fail "$name" "$label failed"
    }
    ok "$name" "$label"
    return
  fi

  printf "%s" "$HIDE_CURSOR"
  ( # Spinner subshell — writes braille frames until parent removes the flag file.
    spin_i=0
    frames="⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏"
    while [ -f /tmp/holdpoint-spin ]; do
      spin_i=$(( (spin_i + 1) % 10 ))
      f=$(echo "$frames" | awk -v n=$((spin_i + 1)) '{print $n}')
      padded=$(printf "%-8s" "$name")
      printf "${CLEAR_LINE}  ${C_DIM}[${C_RESET}${C_DIM}${C_BOLD}%s${C_RESET}${C_DIM}]${C_RESET}  ${C_CYAN}%s${C_RESET}  ${C_DIM}%s${C_RESET}" \
        "$padded" "$f" "$label"
      sleep 0.08
    done
  ) &
  spin_pid=$!
  touch /tmp/holdpoint-spin

  "$@" >/tmp/holdpoint-install.log 2>&1
  status=$?

  rm -f /tmp/holdpoint-spin
  wait "$spin_pid" 2>/dev/null || true
  printf "%s" "$CLEAR_LINE"

  if [ $status -ne 0 ]; then
    fail "$name" "$label failed"
  fi
  ok "$name" "$label"
}

# ─── Banner + entropy seed ───────────────────────────────────────────────
ENTROPY=$(glyph_entropy)
printf "\n"
reveal_wordmark

# ─── Phase 1 — Environment ──────────────────────────────────────────────
git rev-parse --git-dir >/dev/null 2>&1 \
  || fail "ENV" "Not a git repository — run from your project root"
ok "ENV" "git repository ok"

command -v node >/dev/null 2>&1 \
  || fail "HOST" "Node.js not found · install from https://nodejs.org"

NODE_VERSION=$(node -e "process.stdout.write(process.versions.node)")
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
OS_NAME=$(uname -s | tr '[:upper:]' '[:lower:]')
OS_ARCH=$(uname -m)

if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "HOST" "Node.js $NODE_VERSION detected · Holdpoint needs Node 18+"
fi
ok "HOST" "$OS_NAME/$OS_ARCH · node $NODE_VERSION"

# ─── Phase 2 — Fetch (the slow part) ────────────────────────────────────
# Warm the npx cache with a --version so the slow fetch happens here
# under the spinner, then the actual `init` call is near-instant.
run_with_spinner "FETCH" "@holdpoint/cli@latest" \
  npx --yes holdpoint --version

# ─── Phase 3 — Init (let the CLI print its own output) ──────────────────
working "INIT" "bootstrapping engines · per-agent preflight follows"
printf "\n"
# This is the operational handoff. We deliberately do NOT capture or
# suppress init's output — its preflight, per-agent breadcrumbs, and
# next-steps block are the real content. install.sh just frames it.
npx --yes holdpoint init
printf "\n"

# ─── Phase 4 — Hygiene ──────────────────────────────────────────────────
if grep -qxF ".holdpoint/" .gitignore 2>/dev/null; then
  ok "HYGIENE" ".gitignore already covers .holdpoint/"
else
  printf "\n.holdpoint/\n" >> .gitignore
  ok "HYGIENE" "added .holdpoint/ to .gitignore"
fi

# ─── Phase 5 — Gate armed ───────────────────────────────────────────────
printf "\n"
printf "  ${C_DIM}[${C_RESET}${C_GREEN}${C_BOLD}GATE    ${C_RESET}${C_DIM}]${C_RESET}  ${C_GREEN}${C_BOLD}✓  ARMED${C_RESET}  ${C_DIM}holdpoint is active · run${C_RESET} ${C_YELLOW}holdpoint check${C_RESET} ${C_DIM}any time${C_RESET}\n"
printf "\n"
