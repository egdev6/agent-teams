# Project Instructions (Monorepo)

## 0. Monorepo Topology

Monorepo tool: pnpm workspaces
Workspace globs: `packages/*` (`pnpm-workspace.yaml`)
Root package metadata: `agent-teams-monorepo` v2.0.0, `"private": true`, `"type": "module"`

Packages:
- `@agent-teams/core` -> `packages/core`
- `@agent-teams/extension` -> `packages/extension`
- `@agent-teams/webviews` -> `packages/webviews`
- `@agent-teams/cli` -> `packages/cli`

Evidence:
- `pnpm-workspace.yaml`
- `package.json`
- `tsconfig.json` (project references for all four packages)

---

## 1. Root-Level Standards

Package manager: pnpm 8.15.0 (`"packageManager": "pnpm@8.15.0"`)
Runtime engines: Node `>=18.0.0`, pnpm `>=8.0.0`
TypeScript base (`tsconfig.json`): `target: es2022`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `composite: true`
Linting: Biome 2.4.4 (`biome.json`) with `noUnusedVariables: error`, `noUnusedImports: error`, `useImportType: error`, `useConst: error`
Formatting: Biome (`indentWidth: 2`, `lineWidth: 100`, single quotes, semicolons always, LF line endings)
Testing baseline: `tsconfig.test.json` includes `vitest/globals`; Vitest dependency exists in `packages/extension/package.json`
Build orchestration: root `build` runs `build:core` first, then `build:webviews`, `build:extension`, and `build:cli` in parallel via `concurrently`
Git hooks: Lefthook 1.6.1 (`lefthook.yml`) with pre-commit (`pnpm lint` + `pnpm typecheck`), pre-push (`pnpm build`), and commit-msg (`commitlint`)
Shared config location: root `biome.json`, `tsconfig.json`, `commitlint.config.js`, `lefthook.yml`
Skill directories: canonical project skills in `.github/skills/`; mirror for Claude in `.claude/skills/`

Skill usage matrix:

| Skill | Use when | Primary scope |
| --- | --- | --- |
| `vscode-extension-architecture` | You modify activation events, command wiring, extension lifecycle, disposables, `vscode` API integration, or `vsce` packaging behavior | `packages/extension` |
| `vscode-webview-react-bridge` | You change host<->webview messaging, panel/webview contracts, navigation handoff, or webview bootstrapping | `packages/extension`, `packages/webviews` |
| `pnpm-monorepo-ts-references` | You touch workspace scripts, package build order, TypeScript references/paths, or cross-package imports | root + all `packages/*` |
| `react-webview-performance` | You optimize bundle size, routing/render performance, or UI responsiveness inside VS Code webviews | `packages/webviews` |
| `vscode-extension-testing` | You add/refactor tests for extension commands, webview messaging contracts, or CLI integration behavior | `packages/extension`, `packages/webviews`, `packages/cli` |
| `agent-teams-domain-conventions` | You modify kits/teams/agents flows, profile generation, schema validation, or sync behavior | `packages/core`, `packages/extension`, `packages/cli` |
| `release-and-publish-vscode` | You prepare a release: publisher metadata, icon/assets, versioning, changelog, packaging, and publish checks | `packages/extension` |
| `vercel-react-best-practices` | You build/refactor React code and want performance-safe defaults for components, data flow, and rendering | `packages/webviews` |
| `vercel-composition-patterns` | You refactor complex components with prop proliferation or design reusable composition APIs | `packages/webviews` |

Evidence:
- `package.json`
- `biome.json`
- `tsconfig.json`
- `tsconfig.test.json`
- `lefthook.yml`
- `commitlint.config.js`

---

## 2. Per-Package Rules

---

### Package: core
Path: `packages/core`
Type: library

Stack:
- Runtime: Node.js
- Language: TypeScript (`"type": "commonjs"`)
- Build tool: `tsc` (`tsc -p .`)

Key scripts (max 8):
- build: `tsc -p .`
- typecheck: `tsc --noEmit`
- clean: `rimraf dist`

Structure (1-level only):
- root folders: `src/`, `schemas/`, `templates/`
- src folders: `schemas/`, `templates/`, `types/`, `utils/`

Visible conventions:
- Exports: barrel `src/index.ts`; sub-barrels under `src/types/` and `src/utils/`
- Naming: camelCase file names under `src/`

Evidence:
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `packages/core/src/` (directory listing)
- `packages/core/src/types/index.ts`

---

### Package: extension
Path: `packages/extension`
Type: app (VS Code extension)

Stack:
- Runtime/API: VS Code Extension API (`engines.vscode: ^1.85.0`)
- Language: TypeScript (`"type": "commonjs"`)
- Routing: internal router (`src/router.ts`)
- Build tool: `tsc` (`tsc -p ./`)

Key scripts (max 8):
- build: `pnpm run compile` (`postcompile` copies webviews)
- watch: `tsc -watch -p ./`
- typecheck: `tsc --noEmit`
- clean: `rimraf dist`
- package: `vsce package`
- vscode:prepublish: `pnpm run build`

Structure (1-level only):
- root folders: `src/`
- src folders: `commands/`
- src top-level files: `agentGenerator.ts`, `agentLoader.ts`, `composer.ts`, `contextPackProcessor.ts`, `dashboardPanel.ts`, `extension.ts`, `kitBrowserPanel.ts`, `logger.ts`, `mergeEngine.ts`, `orchestrator.ts`, `profileEditorPanel.ts`, `profileLoader.ts`, `router.ts`, `skillsRegistry.ts`, `teamManager.ts`, `types.ts`
- commands folder: `agents/`, `base/`, `kits/`, `project/`, `teams/`, `views/`, `index.ts`, `v2Commands.ts`

Visible conventions:
- File split: one concern per file (panel/loader/generator/composer/etc.)
- Naming: panel-related files use `*Panel` camelCase filenames (`dashboardPanel.ts`, `profileEditorPanel.ts`, `kitBrowserPanel.ts`)
- Extension entry point: `src/extension.ts` -> `dist/extension.js`

Evidence:
- `packages/extension/package.json`
- `packages/extension/tsconfig.json`
- `packages/extension/src/` (directory listing)
- `packages/extension/src/commands/` (directory listing)

---

### Package: webviews
Path: `packages/webviews`
Type: app (VS Code webview SPA)

Stack:
- Runtime: React 19 inside VS Code webviews
- Language: TypeScript (`"type": "module"`, JSX `react-jsx`)
- Routing: `react-router-dom` 6.22.0 using `createMemoryRouter` + `RouterProvider` (`src/dashboard.tsx`)
- Styling: Tailwind CSS v4 + shadcn/ui-style components built on Radix primitives
- Build tool: Vite 5 (`vite.config.ts`) + `@vitejs/plugin-react`; `postbuild` copies `dist/` to `../extension/dist/webviews`

Key scripts (max 8):
- dev: `vite`
- build: `tsc && vite build`
- watch: `vite build --watch`
- typecheck: `tsc --noEmit`
- clean: `rimraf dist`

Structure (1-level only):
- root folders/files: `src/` plus `dashboard.html`
- src folders: `components/`, `lib/`, `pages/`, `routes/`, `styles/`
- pages/routes: `src/pages/` (`CreateAgentPage.tsx`, `DashboardPage.tsx`, `KitBrowserPage.tsx`, `ProfileEditorPage.tsx`, `ProfileEditorPageOptimized.tsx`, `SkillsBrowserPage.tsx`, `TeamManagerPage.tsx`), `src/routes/index.tsx`
- components: `src/components/layout/`, `src/components/shared/`, `src/components/ui/`
- webview bridge: `src/lib/vscode.ts`

Visible conventions:
- Naming: PascalCase for page components, camelCase for utilities
- Exports: partial barrel in `src/pages/index.ts` (currently exports Dashboard, KitBrowser, ProfileEditor, TeamManager)
- Path aliases: `@/`, `@components/`, `@pages/`, `@styles/`, `@lib/`
- Bundle strategy: single HTML entry (`dashboard.html`) and `inlineDynamicImports: true`

Evidence:
- `packages/webviews/package.json`
- `packages/webviews/tsconfig.json`
- `packages/webviews/vite.config.ts`
- `packages/webviews/src/dashboard.tsx`
- `packages/webviews/src/routes/index.tsx`
- `packages/webviews/src/pages/` (directory listing)
- `packages/webviews/src/components/` (directory listing)

---

### Package: cli
Path: `packages/cli`
Type: tooling (CLI binary)

Stack:
- Runtime: Node.js (`"type": "module"`)
- Language: TypeScript
- Build tool: `tsc --build`; dev runner: `tsx watch`

Key scripts (max 8):
- dev: `tsx watch src/cli.ts`
- build: `tsc --build`
- start: `node dist/cli.js`
- typecheck: `tsc --noEmit`
- clean: `rimraf dist`

Structure (1-level only):
- root folders: `src/`
- src folders: `tools/`
- src top-level files: `cli.ts`
- tools folder: `create-agent.ts`, `init-agent.ts`, `profile-init.ts`, `skills-commands.ts`, `sync-agents.ts`, `team-create.ts`, `team-list.ts`, `team-sync.ts`, `validate-agent.ts`, `watch-agents.ts`

Visible conventions:
- Naming: kebab-case in `src/tools/`
- Binary entry point: `src/cli.ts` -> `dist/cli.js` (`agent-teams` bin)

Evidence:
- `packages/cli/package.json`
- `packages/cli/src/` (directory listing)
- `packages/cli/src/tools/` (directory listing)

---

## 3. Cross-Package Shared Patterns

Shared UI: webview-only UI stack (`packages/webviews`); no confirmed cross-package UI library
Shared config: root `biome.json`, root `tsconfig.json` (with references to all packages), `lefthook.yml`, and `commitlint.config.js`
Shared tooling: TypeScript `^5.3.x` and `rimraf` used across all packages
Shared conventions: Conventional Commits enforced with commitlint; strict TypeScript mode; package outputs under `dist/`

Evidence:
- `biome.json` (root)
- `tsconfig.json` (root, references all four packages)
- `packages/core/package.json`, `packages/extension/package.json`, `packages/webviews/package.json`, `packages/cli/package.json`
- `commitlint.config.js` (root)
- `lefthook.yml` (root)

---

## 4. Unknown or Unverifiable Areas

- State management solution for webviews (no Redux/Zustand/Jotai usage confirmed from current sources)
- Server-state/data-fetching strategy in webviews (no React Query/SWR usage confirmed from current sources)
- Test file placement and naming strategy (no `*.test.ts` / `*.spec.ts` files found in current workspace)
- CI/CD intent and coverage beyond the visible workflow (`.github/workflows/translate-docs.yml` exists, but broader pipeline scope is unclear)
- Extension icon status mismatch (`icon.png` is referenced in `packages/extension/package.json`, but file is currently missing)
- Publisher readiness (`"publisher": "your-publisher-name"` is still a placeholder)
- Whether `tsconfig.test.json` is actively wired into a Vitest runner config or kept as standalone compiler context


