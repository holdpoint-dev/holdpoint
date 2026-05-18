import { minimatch } from "minimatch";

const SCOPE_PATTERNS: Record<string, string[]> = {
  // ── Web / app layers ────────────────────────────────────────────────────────
  frontend: [
    "**/*.tsx",
    "**/*.jsx",
    "**/*.css",
    "**/*.scss",
    "**/tailwind.config.*",
    "**/postcss.config.*",
    "apps/builder/**",
    "apps/web/**",
  ],
  backend: [
    "**/api/**",
    "**/server/**",
    "**/routes/**",
    "**/controllers/**",
    "**/middleware/**",
    "packages/*/src/**",
  ],
  socket: ["**/socket/**", "**/ws/**", "**/websocket/**"],
  visual: ["**/*.stories.tsx", "**/*.stories.ts", "**/__screenshots__/**", "**/*.snap"],

  // ── Languages ────────────────────────────────────────────────────────────────
  python: [
    "**/*.py",
    "**/*.pyi",
    "**/requirements*.txt",
    "**/pyproject.toml",
    "**/setup.py",
    "**/setup.cfg",
    "**/Pipfile",
    "**/uv.lock",
    "**/pytest.ini",
    "**/tox.ini",
  ],
  go: ["**/*.go", "**/go.mod", "**/go.sum"],
  rust: ["**/*.rs", "**/Cargo.toml", "**/Cargo.lock"],
  java: ["**/*.java", "**/*.kt", "**/*.gradle", "**/*.gradle.kts", "**/pom.xml"],
  ruby: ["**/*.rb", "**/Gemfile", "**/Gemfile.lock", "**/Rakefile"],

  // ── Cross-cutting concerns ───────────────────────────────────────────────────
  database: [
    "**/*.sql",
    "**/migrations/**",
    "**/migration/**",
    "**/prisma/**",
    "**/*.prisma",
    "**/db/**",
    "**/database/**",
    "**/seeds/**",
    "**/seed/**",
    "**/alembic.ini",
  ],
  // prisma is kept as a focused subset of database for Prisma-specific checks
  prisma: ["**/prisma/**", "**/*.prisma"],
  testing: [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.test.js",
    "**/*.test.jsx",
    "**/*.test.py",
    "**/*.test.rb",
    "**/*.test.go",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/*.spec.js",
    "**/__tests__/**",
    "**/test/**",
    "**/tests/**",
    "**/spec/**",
  ],
  infra: [
    "**/Dockerfile",
    "**/Dockerfile.*",
    "**/docker-compose.*",
    "**/*.tf",
    "**/*.tfvars",
    "**/*.hcl",
    "**/k8s/**",
    "**/kubernetes/**",
    "**/helm/**",
    "**/charts/**",
    "**/.dockerignore",
  ],
  ci: [
    "**/.github/workflows/**",
    "**/.circleci/**",
    "**/Jenkinsfile",
    "**/.gitlab-ci.yml",
    "**/.travis.yml",
    "**/.drone.yml",
  ],
  docs: ["**/*.mdx", "**/*.rst", "**/docs/**", "**/documentation/**"],
};

/**
 * Returns true if any of the changedFiles match the given when filter.
 * - `undefined` → always matches (no filter)
 * - named scope ("frontend", "backend", "prisma", "socket", "visual") → glob pattern match
 * - any other string → treated as a regex
 */
export function matchesWhen(when: string | undefined, changedFiles: string[]): boolean {
  if (!when) return true;
  // "__all__" holdpoint value means no staged files — run all checks unconditionally
  if (changedFiles.includes("__all__")) return true;

  if (when in SCOPE_PATTERNS) {
    const globs = SCOPE_PATTERNS[when]!;
    return changedFiles.some((file) => globs.some((glob) => minimatch(file, glob)));
  }

  // Custom regex
  const re = new RegExp(when);
  return changedFiles.some((f) => re.test(f));
}
