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

  // ── Project structure / dependency manifests ─────────────────────────────────
  // Covers any file whose change signals that the project's dependency graph,
  // toolchain config, CI pipeline, or API contract has shifted — i.e. the checks
  // themselves may need to evolve to stay in sync.
  structural: [
    "**/package.json",
    "**/tsconfig*.json",
    "**/requirements*.txt",
    "**/pyproject.toml",
    "**/Pipfile",
    "**/setup.py",
    "**/setup.cfg",
    "**/pytest.ini",
    "**/tox.ini",
    "**/go.mod",
    "**/Cargo.toml",
    "**/pom.xml",
    "**/build.gradle",
    "**/build.gradle.kts",
    "**/Gemfile",
    "**/vitest.config.*",
    "**/jest.config.*",
    "**/playwright.config.*",
    "**/eslint.config.*",
    "**/.eslintrc*",
    "**/biome.json",
    "**/prettier.config.*",
    "**/.prettierrc*",
    "**/next.config.*",
    "**/Dockerfile*",
    "**/docker-compose*.yml",
    "**/docker-compose*.yaml",
    "**/*.tf",
    "**/prisma/schema.prisma",
    "**/openapi.yaml",
    "**/openapi.yml",
    "**/openapi.json",
    "**/.github/workflows/*.yml",
    "**/.github/workflows/*.yaml",
    "**/.circleci/**",
    "**/Jenkinsfile",
    "**/.gitlab-ci.yml",
    "**/.travis.yml",
  ],
};

/**
 * Returns true if any of the changedFiles match the given when filter.
 * - `undefined` → always matches (no filter)
 * - named scope ("frontend", "backend", "structural", …) → minimatch glob match
 * - key in userPatterns → regex match using the resolved pattern string
 * - any other string → treated as a raw regex
 */
export function matchesWhen(
  when: string | undefined,
  changedFiles: string[],
  userPatterns?: Record<string, string>,
): boolean {
  if (!when) return true;
  // "__all__" holdpoint value means no staged files — run all checks unconditionally
  if (changedFiles.includes("__all__")) return true;

  if (when in SCOPE_PATTERNS) {
    const globs = SCOPE_PATTERNS[when]!;
    return changedFiles.some((file) => globs.some((glob) => minimatch(file, glob)));
  }

  // User-defined named patterns (regex-based)
  if (userPatterns && when in userPatterns) {
    const re = new RegExp(userPatterns[when]!);
    return changedFiles.some((f) => re.test(f));
  }

  // Raw regex fallback
  const re = new RegExp(when);
  return changedFiles.some((f) => re.test(f));
}
