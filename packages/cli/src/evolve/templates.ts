import type { ConditionDef } from "@holdpoint/types";
import type { ProjectProfile } from "./scanner.js";

export interface EvolveTemplate {
  id: string;
  label: string;
  when?: string;
  cmd?: string;
  prompt?: string;
  conditionId?: string;
  /** Condition to add to checks.yaml alongside the check (only if conditionId is set) */
  condition?: Omit<ConditionDef, "id"> & { id: string };
  /** Returns true if this check is relevant to the given project profile */
  trigger: (p: ProjectProfile) => boolean;
}

/** Returns the correct run command for a package.json script, respecting the detected package manager. */
function pmScript(profile: ProjectProfile, script: string, fallback: string): string {
  if (!profile.scripts[script]) return fallback;
  if (profile.packageManager === "npm") return `npm run ${script}`;
  return `${profile.packageManager} ${script}`;
}

/**
 * Returns all applicable check templates for the given project profile.
 * Caller should filter out templates whose IDs already exist in checks.yaml.
 */
export function getTemplates(profile: ProjectProfile): EvolveTemplate[] {
  return [
    // ── Universal checks (always proposed for any project) ──────────────────
    {
      id: "git-commit",
      label: "Commit all changes before finishing",
      cmd: 'git rev-parse --is-inside-work-tree 2>/dev/null || exit 0; [ -z "$(git status --porcelain)" ] && exit 0; git status --short; exit 1',
      trigger: () => true,
    },
    {
      id: "changelog-update",
      label: "Add a CHANGELOG.md entry for this session",
      prompt:
        "Before committing, add an entry to CHANGELOG.md describing what was done. " +
        "Use Keep a Changelog format — add under ## [Unreleased] (create the file " +
        "and that section if absent). Group entries as Added, Changed, Fixed, or Removed. " +
        "Be concise but specific. The entry text will serve as the commit message.",
      trigger: () => true,
    },
    {
      id: "readme-sync",
      label: "Update README.md if user-facing changes were made",
      prompt:
        "If you added, changed, or removed user-facing functionality — CLI commands, " +
        "configuration options, public APIs, or significant new features — update " +
        "README.md to reflect those changes.",
      trigger: () => true,
    },
    {
      id: "no-todos",
      label: "No TODO/FIXME left in changed code",
      prompt:
        "Scan the files you changed for any TODO, FIXME, HACK, or XXX comments. " +
        "Either resolve them before finishing or convert them to GitHub issues. " +
        "Don't leave incomplete work silently behind.",
      trigger: () => true,
    },

    // ── TypeScript / JavaScript ──────────────────────────────────────────────
    {
      id: "typecheck",
      label: "TypeScript type check",
      cmd: pmScript(profile, "typecheck", "npx tsc --noEmit"),
      trigger: (p) => p.hasTypeScript,
    },
    {
      id: "lint",
      label: "Lint codebase",
      cmd: profile.hasEslint
        ? pmScript(profile, "lint", "npx eslint .")
        : profile.hasBiome
          ? pmScript(profile, "lint", "npx @biomejs/biome check .")
          : pmScript(profile, "lint", "echo 'No linter detected'"),
      trigger: (p) => p.hasEslint || p.hasBiome,
    },
    {
      id: "format-check",
      label: "Prettier — format check",
      cmd: pmScript(profile, "format:check", "npx prettier --check ."),
      trigger: (p) => p.hasPrettier,
    },
    {
      id: "test",
      label: "Unit tests",
      cmd: profile.hasVitest
        ? pmScript(profile, "test", "npx vitest run")
        : pmScript(profile, "test", "npx jest --passWithNoTests"),
      trigger: (p) => p.hasVitest || p.hasJest,
    },
    {
      id: "jsdoc",
      label: "JSDoc on changed public functions",
      prompt:
        "Ensure all changed public functions, classes, and module exports have " +
        "accurate JSDoc comments (description + @param + @returns where applicable).",
      trigger: (p) => p.hasTypeScript || p.hasReact,
    },
    {
      id: "build",
      label: "Production build passes",
      cmd: pmScript(profile, "build", "echo 'No build script detected'"),
      trigger: (p) => Boolean(p.scripts["build"]),
    },

    // ── Python ───────────────────────────────────────────────────────────────
    {
      id: "python-lint",
      label: "Ruff — Python linting",
      cmd: "ruff check .",
      when: "python",
      trigger: (p) => p.hasPython && p.hasRuff,
    },
    {
      id: "python-test",
      label: "Pytest — Python unit tests",
      cmd: "pytest",
      when: "python",
      trigger: (p) => p.hasPython && p.hasPytest,
    },

    // ── Go ───────────────────────────────────────────────────────────────────
    {
      id: "go-test",
      label: "Go tests",
      cmd: "go test ./...",
      when: "go",
      trigger: (p) => p.hasGo,
    },
    {
      id: "go-vet",
      label: "Go vet",
      cmd: "go vet ./...",
      when: "go",
      trigger: (p) => p.hasGo,
    },

    // ── Database ─────────────────────────────────────────────────────────────
    {
      id: "db-migrations",
      label: "Database migration for schema changes",
      when: "database",
      prompt:
        "If schema or migration files changed, ensure the appropriate migration was " +
        "generated with your ORM tool (e.g. `prisma migrate dev`, `alembic revision`, " +
        "`rails db:migrate`) and committed alongside the schema change.",
      trigger: (p) => p.hasPrisma || p.hasAlembic || p.hasMigrations || p.hasDrizzle,
    },
    {
      id: "prisma-format",
      label: "Prisma schema format check",
      when: "prisma",
      cmd: "npx prisma format --check 2>/dev/null || npx prisma format",
      conditionId: "has-prisma",
      condition: {
        id: "has-prisma",
        operator: "file_exists",
        path: "prisma/schema.prisma",
      },
      trigger: (p) => p.hasPrisma,
    },

    // ── OpenAPI ──────────────────────────────────────────────────────────────
    {
      id: "openapi-sync",
      label: "OpenAPI spec updated for API changes",
      when: "backend",
      conditionId: "has-openapi",
      condition: {
        id: "has-openapi",
        operator: "file_exists",
        path: "openapi.yaml",
      },
      prompt:
        "If any API routes were added or changed, update openapi.yaml (or openapi.json) " +
        "to reflect the new endpoints, request/response shapes, and error codes.",
      trigger: (p) => p.hasOpenApi,
    },

    // ── Infra ─────────────────────────────────────────────────────────────────
    {
      id: "docker-build",
      label: "Docker build passes",
      when: "infra",
      cmd: "docker build . --quiet -t app:ci",
      conditionId: "has-dockerfile",
      condition: {
        id: "has-dockerfile",
        operator: "file_exists",
        path: "Dockerfile",
      },
      trigger: (p) => p.hasDocker,
    },
    {
      id: "terraform-validate",
      label: "Terraform validate",
      when: "infra",
      cmd: "terraform validate",
      trigger: (p) => p.hasTerraform,
    },

    // ── Frontend ─────────────────────────────────────────────────────────────
    {
      id: "i18n",
      label: "i18n — no hardcoded user-facing strings",
      when: "frontend",
      prompt:
        "Confirm all user-visible strings are wrapped in the project's i18n function " +
        "(e.g. `t()`, `useTranslation`, `<Trans>`) and that locale files are updated " +
        "for any new copy.",
      trigger: (p) => p.hasNext && p.hasReact,
    },
  ];
}
