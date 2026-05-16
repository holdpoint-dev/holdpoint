.PHONY: help install build dev dev-web dev-builder test lint typecheck format format-check clean check validate update

# ─── Default target ───────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "  Sentinel monorepo"
	@echo ""
	@echo "  Setup"
	@echo "    make install        Install all dependencies (pnpm)"
	@echo "    make build          Build all packages"
	@echo ""
	@echo "  Development"
	@echo "    make dev            Start all apps in dev mode (web + builder)"
	@echo "    make dev-web        Start apps/web only  (Next.js  → localhost:3000)"
	@echo "    make dev-builder    Start apps/builder only (Vite → localhost:5173)"
	@echo ""
	@echo "  Quality"
	@echo "    make test           Run all tests"
	@echo "    make lint           Run ESLint across all packages"
	@echo "    make typecheck      Run tsc --noEmit across all packages"
	@echo "    make format         Auto-format with Prettier"
	@echo "    make format-check   Check formatting (non-destructive)"
	@echo ""
	@echo "  Sentinel"
	@echo "    make check          Run sentinel deterministic checks"
	@echo "    make validate       Validate checks.yaml schema"
	@echo "    make update         Regenerate engine files from checks.yaml"
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
	pnpm turbo dev

dev-web: install
	pnpm turbo dev --filter=@sentinel/web

dev-builder: install
	pnpm turbo dev --filter=@sentinel/builder

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

# ─── Sentinel ─────────────────────────────────────────────────────────────────

check:
	node packages/cli/dist/index.js check

validate:
	node packages/cli/dist/index.js validate

update:
	node packages/cli/dist/index.js update

# ─── Housekeeping ─────────────────────────────────────────────────────────────

clean:
	pnpm turbo clean
	rm -rf node_modules
