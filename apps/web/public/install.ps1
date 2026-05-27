# install.ps1 — Holdpoint one-line installer for Windows PowerShell
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://holdpoint.dev/install.ps1 | iex"
#
# This is the Windows companion to install.sh. We keep the bracketed
# mission-control phase style for brand consistency but drop the wordmark
# glitch animation — Windows Terminal vs. legacy console vs. ISE handle
# unicode + cursor-control inconsistently and a broken animation looks
# worse than no animation. The static banner is the brand orange instead.
#
# Like install.sh, we deliberately do NOT print a "Done / Files written /
# Next steps" block at the end because `holdpoint init` already does.

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Phase([string]$Name, [string]$Status, [string]$Message, [System.ConsoleColor]$Color) {
  $padded = $Name.PadRight(8)
  Write-Host "  [" -NoNewline -ForegroundColor DarkGray
  Write-Host $padded -NoNewline -ForegroundColor Gray
  Write-Host "]  " -NoNewline -ForegroundColor DarkGray
  Write-Host $Status -NoNewline -ForegroundColor $Color
  Write-Host "  $Message" -ForegroundColor DarkGray
}

function Write-Ok([string]$Name, [string]$Message)      { Write-Phase $Name "✓" $Message Green }
function Write-Working([string]$Name, [string]$Message) { Write-Phase $Name "→" $Message Cyan  }
function Write-Warn([string]$Name, [string]$Message)    { Write-Phase $Name "!" $Message Yellow }
function Fail([string]$Name, [string]$Message) {
  Write-Host ""
  Write-Phase $Name "✗" $Message Red
  Write-Host ""
  exit 1
}

# ─── Banner ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  holdpoint" -ForegroundColor DarkYellow -NoNewline
Write-Host "  universal eval-guard for AI coding agents" -ForegroundColor DarkGray
Write-Host "  early alpha · https://holdpoint.dev" -ForegroundColor DarkGray
Write-Host ""

# ─── Phase 1 — Environment ─────────────────────────────────────────────
& git rev-parse --git-dir *> $null
if ($LASTEXITCODE -ne 0) {
  Fail "ENV" "Not a git repository — run from your project root"
}
Write-Ok "ENV" "git repository ok"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail "HOST" "Node.js not found · install from https://nodejs.org"
}

$nodeVersionRaw = & node -e "process.stdout.write(process.versions.node)"
if ($LASTEXITCODE -ne 0) {
  Fail "HOST" "Failed to read the installed Node.js version"
}

$nodeMajorRaw = ($nodeVersionRaw -split '\.')[0]
$nodeMajor = 0
if (-not [int]::TryParse($nodeMajorRaw, [ref]$nodeMajor)) {
  Fail "HOST" "Could not parse Node.js version: $nodeVersionRaw"
}

if ($nodeMajor -lt 18) {
  Fail "HOST" "Node.js $nodeVersionRaw detected · Holdpoint needs Node 18+"
}

$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLower()
Write-Ok "HOST" "windows/$arch · node $nodeVersionRaw"

# ─── Phase 2 — Fetch (warm the npx cache so init is fast) ──────────────
Write-Working "FETCH" "@holdpoint/cli@latest"
& npx --yes holdpoint --version *> $null
if ($LASTEXITCODE -ne 0) {
  Fail "FETCH" "Failed to fetch @holdpoint/cli@latest from npm"
}
Write-Ok "FETCH" "@holdpoint/cli@latest"

# ─── Phase 3 — Init (let the CLI print its own output) ─────────────────
Write-Working "INIT" "bootstrapping engines · per-agent preflight follows"
Write-Host ""
& npx --yes holdpoint init
if ($LASTEXITCODE -ne 0) {
  Fail "INIT" "npx holdpoint init exited with code $LASTEXITCODE"
}
Write-Host ""

# ─── Phase 4 — Hygiene ─────────────────────────────────────────────────
$gitignorePath = Join-Path (Get-Location) ".gitignore"
$gitignoreEntry = ".holdpoint/"

if (Test-Path -LiteralPath $gitignorePath) {
  $gitignoreContent = Get-Content -LiteralPath $gitignorePath -Raw
  $entries = if ([string]::IsNullOrEmpty($gitignoreContent)) { @() } else { $gitignoreContent -split "`r?`n" }

  if ($entries -notcontains $gitignoreEntry) {
    $needsLeadingNewline =
      $gitignoreContent.Length -gt 0 -and
      -not ($gitignoreContent.EndsWith("`n") -or $gitignoreContent.EndsWith("`r"))
    $prefix = if ($needsLeadingNewline) { [Environment]::NewLine } else { "" }
    Add-Content -LiteralPath $gitignorePath -Value ($prefix + $gitignoreEntry)
    Write-Ok "HYGIENE" "added .holdpoint/ to .gitignore"
  } else {
    Write-Ok "HYGIENE" ".gitignore already covers .holdpoint/"
  }
} else {
  Set-Content -LiteralPath $gitignorePath -Value $gitignoreEntry
  Write-Ok "HYGIENE" "created .gitignore with .holdpoint/"
}

# ─── Phase 5 — Gate armed ──────────────────────────────────────────────
Write-Host ""
Write-Host "  [" -NoNewline -ForegroundColor DarkGray
Write-Host "GATE    " -NoNewline -ForegroundColor Green
Write-Host "]  " -NoNewline -ForegroundColor DarkGray
Write-Host "✓  ARMED" -NoNewline -ForegroundColor Green
Write-Host "  holdpoint is active · run " -NoNewline -ForegroundColor DarkGray
Write-Host "holdpoint check" -NoNewline -ForegroundColor Yellow
Write-Host " any time" -ForegroundColor DarkGray
Write-Host ""
