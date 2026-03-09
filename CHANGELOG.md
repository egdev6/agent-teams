# Changelog

All notable changes to Agent Teams are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.0.0] - 2026-03-09

First stable release of the Agent Teams VS Code extension — a complete system for creating,
organizing, and running AI agents with GitHub Copilot in the context of a software project.

### Added

#### Webview Dashboard
- Embedded React single-page application (SPA) served as a VS Code webview panel
- 12 pages reachable via in-panel navigation: Dashboard, Profile Editor, Team Manager,
  Agent Manager, Create Agent, Edit Agent, Create Team, Edit Team, Skills Browser,
  Context Packs, Import/Export, and Agent Wizard
- Stats overview: active team, agent count, sync status, and Engram integration health
- Sync status card with pending-changes breakdown and one-click sync trigger
- Engram setup banner for first-time memory configuration
- Quick actions card for common navigation shortcuts

#### Kits & Teams System
- Three-layer architecture: **Core** (shared schemas and utilities) → **Kits** (reusable agent
  bundles) → **Project Profiles** (per-project configuration) → **Team Profiles** (team-level
  overrides and kit selection)
- Kit format: `kit.yml` manifest with metadata, technology requirements, and versioning;
  `agents/` directory for agent specs with `{{placeholder}}` syntax; `context-packs/` for
  reusable documentation chunks
- Bundled kit: `testing-vitest` — provides `vitest-worker` and `test-orchestrator` agents
  with skills, context packs, and sensible defaults
- Project profiles (`.agent-teams/project.profile.yml`): technology flags, path mappings,
  command definitions, context pack references, and agent overrides
- Team profiles (`.agent-teams/teams/<id>.yml`): select kits, enable/disable individual
  agents, and apply team-level overrides
- JSON Schema validation for all profile and kit types via AJV

#### Composition & Merge Engine
- `AgentComposer` — resolves placeholders, merges context packs, and applies overrides to
  produce final agent specs from kit + profile + team inputs
- `MergeEngine` — deep merge with four strategies: `team-priority` (default),
  `profile-priority`, `kit-priority`, and `explicit-only`
- Array merge modes: `replace`, `concat`, and `union`
- Conflict tracking: every merge decision is recorded with before/after values
- Dry-run mode: computes the full diff of a sync without writing any files; results include
  per-agent action (`create`, `update`, or `skip`) and a structured `SyncResult` summary

#### Dynamic Context Pack Template Engine
- `ContextPackProcessor` — processes context pack Markdown files before they are embedded
  into agent specs
- Variable resolution: `{{project:*}}`, `{{path:*}}`, `{{command:*}}`, `{{env:*}}`,
  `{{kit:*}}`
- Conditional blocks: `{{#if condition}}`, `{{#unless}}`, `{{else}}`
- Technology and environment checks: `{{#if technology:react}}`,
  `{{#if env:NODE_ENV=production}}`
- Loops: `{{#each technologies}}`, `{{#each paths}}`, `{{#each commands}}`
- Nested includes: `{{include:kit:pack}}`, `{{include:project:pack}}`, depth-limited to
  prevent recursion
- Text filters: `{{uppercase:}}`, `{{lowercase:}}`, `{{capitalize:}}`
- Result caching; manual cache invalidation available

#### Skills System
- `SkillsRegistry` — loads and validates a YAML skill registry (`skills.registry.yml`)
  against `schemas/skills.registry.schema.json`
- Nine skill categories: `file_operations`, `code_analysis`, `execution`, `browser`,
  `database`, `testing`, `documentation`, `git`, `deployment`
- Security levels per skill definition
- Role-based skill recommendations (`router`, `orchestrator`, `worker`)
- Skills Browser page in the dashboard for discovery

#### Catalog
- `CatalogManager` — maintains a persistent global catalog of agents, teams, and skills
  stored in VS Code global storage
- Commands to capture a workspace snapshot, export the catalog to JSON, and import from
  a JSON file (additive or replace mode)

#### VS Code Commands
- `openDashboard` — open the main webview dashboard panel
- `initProfile` — interactive wizard to initialize a project profile
- `createTeam` — wizard to create a team profile with kit selection
- `listTeams` — browse available teams and open their YAML files
- `syncTeam` — sync a team to `.github/agents/`; supports dry-run preview
- `browseKits` — open the kit browser UI
- `openKitBrowser` — direct shortcut to the kit browser panel
- `captureWorkspaceCatalog` — snapshot the current workspace into the global catalog
- `exportCatalog` — export the catalog to a JSON file
- `importCatalog` — import agents/teams/skills from a JSON file
- `setupEngram` — wizard to configure the Engram memory extension
- `createAgent` — open the Create Agent wizard page
- `syncAgents` — sync all agent specs in the workspace to `.github/agents/`
- `reloadAgents` — reload agents without restarting VS Code
- `selectAgent` — quick-pick to select an active agent
- `createFromSpec` — generate an agent markdown file from a YAML spec

#### Chat Participants
- `@agent-teams.router` — intent-aware routing participant; matches user input to the most
  relevant registered agent using normalized scoring (intent ratio, path match, keyword
  ratio, and domain match)
- Dynamic participants: one `@agent-teams.<agentId>` participant registered per loaded
  agent; participants reload automatically when specs or configuration change

#### CLI (`agent-teams` binary)
- `profile:init` — initialize a project profile interactively
- `team:create` — create a team profile
- `team:list` — list all available teams
- `team:sync` — sync a team to `.github/agents/`; `--dry-run` and `--no-diff` flags
- `agents:init` — interactive agent creation wizard
- `agents:create` — generate an agent from a YAML spec
- `agents:validate` — validate all agent specs against the schema
- `agents:sync` — sync agents to a target project directory
- `agents:watch` — watch mode for continuous regeneration on spec changes
- `skills` — skills management commands

#### Engram Integration
- Setup flow (`setupEngram` command) to install and configure the Engram memory
  extension for persistent agent memory across sessions

### Technical Notes

- Monorepo managed with pnpm workspaces; packages: `core`, `extension`, `webviews`, `cli`
- Webview SPA built with React 19, React Router (memory router), Tailwind CSS v4, and
  Radix-based UI components; bundled by Vite with `inlineDynamicImports: true`
- Extension compiled with `tsc`; webview assets copied into `dist/webviews` at build time
- Strict TypeScript across all packages; linting and formatting via Biome 2.x
- Git hooks via Lefthook: lint + typecheck on pre-commit, build on pre-push

---

[Unreleased]: https://github.com/egdev6/agent-teams/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/egdev6/agent-teams/releases/tag/v1.0.0
