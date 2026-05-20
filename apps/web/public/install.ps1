# install.ps1 — Holdpoint one-line installer for Windows PowerShell
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://holdpoint.dev/install.ps1 | iex"

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Brand([string]$Message) {
  Write-Host "  holdpoint" -ForegroundColor Cyan -NoNewline
  Write-Host "  $Message"
}

function Write-Ok([string]$Message) {
  Write-Host "  ✓" -ForegroundColor Green -NoNewline
  Write-Host "  $Message"
}

function Write-Warn([string]$Message) {
  Write-Host "  ⚠" -ForegroundColor Yellow -NoNewline
  Write-Host "  $Message"
}

function Fail([string]$Message) {
  Write-Host "  ✗" -ForegroundColor Red -NoNewline
  Write-Host "  $Message"
  exit 1
}

Write-Host ""
Write-Host "  holdpoint  universal eval-guard for AI coding agents" -ForegroundColor Cyan
Write-Host "  early alpha · https://holdpoint.dev" -ForegroundColor DarkGray
Write-Host ""

& git rev-parse --git-dir *> $null
if ($LASTEXITCODE -ne 0) {
  Fail "Not a git repository. Run this inside your project root."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail "Node.js not found. Install Node.js 18+ from https://nodejs.org"
}

$nodeMajorRaw = & node -e "process.stdout.write(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0) {
  Fail "Failed to read the installed Node.js version."
}

$nodeMajor = 0
if (-not [int]::TryParse($nodeMajorRaw, [ref]$nodeMajor)) {
  Fail "Could not parse the installed Node.js version."
}

if ($nodeMajor -lt 18) {
  Write-Warn "Node.js $nodeMajor detected — Holdpoint requires Node 18+. Upgrade recommended."
}

Write-Brand "Installing for all agents (Claude Code · Copilot · Cursor · Codex)"
Write-Host ""

& npx --yes holdpoint@alpha init
if ($LASTEXITCODE -ne 0) {
  Fail "Installation failed. npx holdpoint@alpha init exited with code $LASTEXITCODE."
}

$gitignorePath = Join-Path (Get-Location) ".gitignore"
$gitignoreEntry = ".holdpoint/"

if (Test-Path -LiteralPath $gitignorePath) {
  $gitignoreContent = Get-Content -LiteralPath $gitignorePath -Raw
  $entries = if ([string]::IsNullOrEmpty($gitignoreContent)) {
    @()
  } else {
    $gitignoreContent -split "`r?`n"
  }

  if ($entries -notcontains $gitignoreEntry) {
    $needsLeadingNewline =
      $gitignoreContent.Length -gt 0 -and
      -not ($gitignoreContent.EndsWith("`n") -or $gitignoreContent.EndsWith("`r"))
    $prefix = if ($needsLeadingNewline) { [Environment]::NewLine } else { "" }
    Add-Content -LiteralPath $gitignorePath -Value ($prefix + $gitignoreEntry)
  }
} else {
  Set-Content -LiteralPath $gitignorePath -Value $gitignoreEntry
}

Write-Host ""
Write-Ok "Done. Holdpoint is active."
Write-Host ""
Write-Host "  Files written — commit these to your repo:"
Write-Host "  · checks.yaml                   your eval checkpoints (edit this)" -ForegroundColor Yellow
Write-Host "  · .claude/settings.json         Claude Code stop hook" -ForegroundColor Yellow
Write-Host "  · .github/extensions/holdpoint/ Copilot extension" -ForegroundColor Yellow
Write-Host "  · .cursorrules                  Cursor rules" -ForegroundColor Yellow
Write-Host "  · .codex/hooks.json             Codex hook" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Next steps:"
Write-Host "  1. Review checks.yaml and add checks for your project"
Write-Host "  2. git add -A && git commit -m 'chore: add holdpoint'"
Write-Host "  3. holdpoint check --staged to run checks at any time"
Write-Host ""
Write-Host "  Visual builder · holdpoint builder" -ForegroundColor DarkGray
Write-Host "  Docs           · https://holdpoint.dev/docs" -ForegroundColor DarkGray
Write-Host ""
