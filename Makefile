.PHONY: help install build dev dev-web dev-builder dev-live test lint typecheck format format-check clean check validate update publish

# ─── Default target ───────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "  Holdpoint monorepo"
	@echo ""
	@echo "  Setup"
	@echo "    make install        Install all dependencies (pnpm)"
	@echo "    make build          Build all packages"
	@echo ""
	@echo "  Development"
	@echo "    make dev            Start the marketing site + builder UI"
	@echo "    make dev-web        Start apps/web only  (Next.js  → localhost:3000)"
	@echo "    make dev-builder    Start apps/builder only (Vite → localhost:4321)"
	@echo "    make dev-live       Start/reuse Holdpoint Live and open the browser UI"
	@echo ""
	@echo "  Quality"
	@echo "    make test           Run all tests"
	@echo "    make lint           Run ESLint across all packages"
	@echo "    make typecheck      Run tsc --noEmit across all packages"
	@echo "    make format         Auto-format with Prettier"
	@echo "    make format-check   Check formatting (non-destructive)"
	@echo ""
	@echo "  Holdpoint"
	@echo "    make check          Run holdpoint deterministic checks"
	@echo "    make validate       Validate checks.yaml schema"
	@echo "    make update         Regenerate engine files from checks.yaml"
	@echo ""
	@echo "  Publishing"
	@echo "    make publish        Publish packages to npm (browser 2FA — run async)"
	@echo ""
	@echo "  Housekeeping"
	@echo "    make clean          Remove all build artefacts and node_modules"
	@echo ""

# ─── Setup ────────────────────────────────────────────────────────────────────

install:
	pnpm install

build: install
	pnpm turbo build

# ─── Development ──────────────────────────────────────────────────────────────

dev: install
	pnpm turbo dev --filter=@holdpoint/web --filter=@holdpoint/builder

dev-web: install
	pnpm turbo dev --filter=@holdpoint/web

dev-builder: install
	pnpm turbo dev --filter=@holdpoint/builder

dev-live: install
	node packages/cli/dist/index.js live

# ─── Quality ──────────────────────────────────────────────────────────────────

test:
	pnpm turbo test

lint:
	pnpm turbo lint

typecheck:
	pnpm turbo typecheck

format:
	pnpm format

format-check:
	pnpm format:check

# ─── Holdpoint ─────────────────────────────────────────────────────────────────

check:
	node packages/cli/dist/index.js check

validate:
	node packages/cli/dist/index.js validate

update:
	node packages/cli/dist/index.js update

# ─── Publishing ───────────────────────────────────────────────────────────────
# AI agents: run this target in async bash mode. Send {enter} via write_bash
# when npm prints its "Press ENTER to open in browser" passkey prompt.
# Then notify the user to complete authentication in the browser that opens.

publish: build
	bash scripts/publish.sh

# ─── Housekeeping ─────────────────────────────────────────────────────────────

clean:
	pnpm turbo clean
	rm -rf node_modules
