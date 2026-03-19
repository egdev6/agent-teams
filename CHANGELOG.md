# Changelog

All notable changes to Agent Teams are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

---

## [1.1.3] - 2026-03-19

### Patch Changes

- be7ccbf: ### Engram integration updated to support v1.9.9+

  - Agents now call `mem_session_end` at the end of every session to ensure memories are properly consolidated before closing — this applies to all roles: worker, orchestrator, router and aggregator.
  - When a recall result appears truncated, agents are now instructed to follow up with `mem_get_observation` to retrieve the full entry.
  - Setup now detects the installed Engram version and warns if it's below the minimum required (1.9.9), with a direct link to download the latest release.

  ### Agent Manager and Team Manager now show local-only entries

  Previously, agents and teams that existed on disk (in `.agent-teams/agents/` and `.agent-teams/teams/`) but hadn't been registered in the catalog were invisible in the UI until you explicitly ran a catalog capture. Now they appear immediately — no capture step needed.

  - **"Local only" badge**: any agent or team that lives on disk but is not yet in the catalog is tagged with an amber _Local only_ badge directly on its card, so you always know which entries still need to be saved to the catalog.
  - The existing **"Unregistered files detected"** alert on the dashboard continues to work as before — clicking _Import to catalog_ removes the badge and registers the entries.
  - No behaviour changes for entries already in the catalog.

  ### Dashboard UI/UX improvements

  The dashboard has been tidied up so it feels less cluttered, especially once teams, agents, and pending changes start accumulating.

  - **Collapsible notification details**: the "Unregistered files detected" and sync status alerts now show only a summary line by default. Tap **See details** to expand the full list of files or pending changes — the noise is gone until you actually need it.
  - **Compact stats row**: the six status indicators (Profile, Team, Engram, Skills, Teams, Agents) now render as a tight single-line row on smaller panels instead of wrapping into a two-column grid that pushed everything else down.
  - **Quick actions menu**: the Quick Actions card has been replaced by a small **☰ menu button** sitting on the right side of the Dashboard header. All the same shortcuts are one click away without occupying a full card on the page.
  - @agent-teams/core@1.1.3
  - @agent-teams/webviews@1.1.3

## [1.1.2] - 2026-03-18

### Patch Changes

- 8c38b37: ### Fix: editing an agent now loads all its settings correctly

  Opening an agent for editing from the Manage Agents page now correctly pre-fills every field — role, domain, intents, skills, context packs, targets, scope, and workflow steps. Previously those would appear empty or reset to defaults, forcing users to re-enter their configuration from scratch.

  This also covers agents that were imported from the registry rather than created locally: the wizard now loads their data from the catalog and, on save, creates a local spec file automatically so edits are persisted.

  ### Fix: agent cards in Manage Agents now show description, intents, and teams

  Agent cards were showing only the agent name and role. Description, intent tags, and team membership badges are now visible immediately when the page loads, without needing to open the agent first.

  The dashboard footer also now shows the actual installed extension version instead of a hardcoded placeholder.

  ### Fix: workflow steps are now editable for all agent types

  The "Workflow Steps" editor in the wizard was only shown for orchestrator and router agents. Worker agents use workflow steps too (they are included in the generated prompt), but the section was hidden. All roles can now view and edit their workflow steps.

  ### Permissions and tools stay in sync automatically

  The wizard now keeps permissions and tools consistent as you configure an agent:

  - Enabling **can edit files** or **can create files** automatically adds the `edit/editFiles` tool. Disabling both removes it.
  - The **Delegates to** field is now greyed out when `can_delegate` is off, making it clear it has no effect.
  - Workers and routers have their key permissions locked on by default since removing them would break core functionality.

  ### Improved empty state for the Skills section

  When an agent has no skills assigned yet, both the Create and Edit agent pages now show a proper empty state with an icon, a short description, and a **Browse registry** button, instead of a plain text hint.

  ### MCP Servers section in the agent wizard

  A new collapsible **MCP Servers** section in the Workflow & Tools step lets you declare which MCP servers an agent depends on (id, command, args, and env vars). On sync, those servers are automatically merged into your workspace MCP config file and listed in the generated agent prompt.

  ### Smaller VSIX and faster webview load times

  - The packaged extension is lighter: source maps are only generated during development, and pre-compressed asset files that VS Code cannot serve are no longer produced.
  - The webview now splits its JavaScript into separate vendor chunks (React, Radix UI, icons), so the browser can cache dependencies independently and pages load faster after the first visit.

  ### Fix: agent version is preserved when editing

  Saving an edited agent no longer resets the `version` field to `1.0.0`. The wizard now loads the existing version from the spec and writes it back unchanged.

  ### Fix: deleting an agent now waits for confirmation before navigating

  Clicking **Delete Agent** previously sent the delete request and immediately navigated back to the agent list, so if the user cancelled the confirmation dialog they were left on the list with no feedback. The UI now waits for the extension to confirm (or cancel) before navigating, and shows any deletion error inline.

  ### Fix: Save button explains why it is disabled

  When the **Save Changes** (or **Create Agent**) button is greyed out, hovering it now shows a concise tooltip explaining which field needs to be filled — e.g. _"Add at least one workflow step"_. This is especially noticeable when editing agents imported from the registry that arrive without workflow steps.

  ### Fix: editing an imported agent pre-fills default tools when none are declared

  Opening an agent imported from the registry that has no `tools` entries now pre-populates the Tools section with the role-appropriate defaults (the same ones the Create wizard would add), so users start from a sensible baseline instead of a blank list.

  ### Fix: invalid MCP server env JSON is caught before saving

  Entering malformed JSON in the **Env** field of an MCP server entry and clicking Save used to silently discard the value. It now shows an inline error and blocks the save until the JSON is corrected.

- Updated dependencies [8c38b37]
  - @agent-teams/webviews@1.1.2
  - @agent-teams/core@1.1.2

## [1.1.1] - 2026-03-16

### Patch Changes

- dec9bc1: ### Engram autonomous mode for worker agents

  Adds a new `engram.mode: autonomous` option for worker agents. In this mode the worker can be dispatched directly — without a router or orchestrator — and handles its own task lifecycle: it recalls task context from Engram at session start (supporting both `[Handoff:{taskId}]` and `[Parallel:{taskId}]` prefixes), persists its result, and calls `complete_subtask` to notify the aggregator when done.

  - **Schema & types**: new `engram` property (`mode: default | autonomous`) added to the agent spec schema and TypeScript types.
  - **Memory instructions**: `buildMemorySection` now accepts the `engramMode` and generates expanded recall/dispatch instructions when in autonomous mode.
  - **Team manager**: autonomous workers automatically receive the `complete-subtask` tool and get a dedicated task-context block injected into their prompt.
  - **Extension**: `engram` field is correctly read and written in the create-agent and save-agent flows, clearing the field when unset during edits.
  - **Wizard UI**: a new "Engram — Autonomous task context" checkbox appears in the Rules step for worker agents when Engram is configured, wired through both the Create Agent and Edit Agent pages.

  ### MCP servers per agent

  Adds an optional `mcpServers` array to agent specs. Declared servers are merged (by `id`, never overwriting) into the project MCP config files on every team sync: `.vscode/mcp.json` (`servers` key) for Copilot targets and `.mcp.json` at project root (`mcpServers` key) for Claude targets.

  - **Schema & types**: new `mcpServers` property (`id`, `command`, `args?`, `env?`) added to `agent.schema.json` and `AgentSpec` TypeScript types (`AgentMcpServer` interface).
  - **Team manager**: `syncMcpServers()` merges agent-declared servers into the target MCP config file; an `## MCP Servers` table is also appended to the generated agent prompt.
  - **Extension**: `mcpServers` field is read and written in the create-agent and save-agent flows, clearing the field when unset during edits.
  - **Wizard UI**: a collapsible "MCP Servers" section in the Workflow & Tools step lets users add/remove servers with id, command, args (one per line) and env (JSON object) fields, wired through both the Create Agent and Edit Agent pages.

- Updated dependencies [dec9bc1]
  - @agent-teams/webviews@1.1.1
  - @agent-teams/core@1.1.1

## [1.1.0] - 2026-03-13

### Minor Changes

- fd81a16: ## Parallel dispatch, aggregator role, and LM tools

  ### New features

  **Parallel dispatch infrastructure**

  - Added `agent-teams-dispatch-parallel` LM tool — fans out a task to multiple orchestrators simultaneously, each in its own chat session
  - Added `agent-teams-complete-subtask` LM tool — called by worker/orchestrator agents to signal subtask completion after persisting results to Engram
  - Added `TaskCoordinator` — file-system observer that watches for subtask completions and auto-opens the aggregator chat once all parallel subtasks finish
  - Added `agent-teams-handoff` LM tool — opens a new chat targeted at a specific orchestrator with full task context passed via Engram

  **MCP dispatch server**

  - Added `packages/cli/src/mcp/dispatch-server.ts` — stdio MCP server that exposes dispatch tools for use outside VS Code
  - Added `mcp:start` CLI command to start the MCP server
  - Extension packaging now writes `dist/mcp/package.json` with `type: module` so the bundled MCP server runs correctly when started by VS Code from the extension package

  **New `aggregator` role**

  - Added `aggregator` as a first-class agent role in `@agent-teams/core`
  - Aggregator agents receive a structured Engram recall pattern to load all subtask results, detect file-path conflicts across orchestrators, and produce a unified outcome

  ### Improvements

  **Memory instructions overhaul**

  - Orchestrator: detailed mandatory Engram key patterns for both single handoff (`handoff:{taskId}`) and parallel dispatch (`task:{taskId}:subtask:{agentId}`)
  - Router: structured routing decision logging (`routing:patterns`) + decision guide for choosing between `agent-teams-handoff` and `agent-teams-dispatch-parallel`
  - Worker: mandatory recall/remember patterns with explicit trigger conditions
  - All roles: instructions are now marked as mandatory to prevent agents from skipping persistence steps

  **Claude target generation**

  - Claude-target agents now receive Engram + MCP delegation instructions tailored to Claude Code instead of Copilot LM tool guidance
  - Root `AGENTS.md` now includes a Claude-specific `Delegation via Engram` protocol and lists synced Claude agents
  - Codex keeps the generic root context behavior while Claude gets target-specific coordination guidance
  - When `claude_code` and `codex` are both enabled, the shared root `AGENTS.md` now preserves the Claude protocol instead of being overwritten by an empty Codex context file

  **Agent wizard — role-aware steps**

  - Router role now hides the Scope and Skills steps (not applicable to routers)
  - `OutputContextStep`: max-items and never-include fields hidden for router role
  - `RulesStep`: permissions and constraints sections hidden for router role
  - `IdentityStep`: subdomain field hidden for router and orchestrator roles

  **Agent spec format compatibility**

  - Dashboard and team manager now support both legacy (`_metadata.id` / `_metadata.role`) and current (root `id` / `role`) spec formats when importing, listing, and validating agent specs

  **teamManager**

  - Added VS Code built-in tool alias normalization (`codebase` → `search/codebase`, `editFiles` → `edit/editFiles`) to survive VS Code tool renames
  - Added `delegates_to` reference validation: warns when a Copilot-target agent delegates to an agent ID that does not exist for that target
  - Root build task now uses the correct extension package filter (`agent-teams`) so `Dev: Build Once` actually compiles the extension

  ### Validation

  - Verified generated Claude sync output (`AGENTS.md` + `.claude/agents/*`) contains the new Engram delegation protocol
  - Verified the bundled MCP server responds to `dispatch_task` and `complete_subtask` after the module packaging fix
  - Deferred full end-to-end Claude release validation to the release cycle

  **CLI `init-agent`**

  - Router agents now include `agent-teams-handoff` as a default frontmatter tool
  - Added default delegation instruction to router system prompts

### Patch Changes

- Updated dependencies [fd81a16]
  - @agent-teams/webviews@1.1.0
  - @agent-teams/core@1.1.0

## [1.0.9] - 2026-03-12

### Patch Changes

- 4eae697: Fix error in rules when import agent from yml
  Detects not sincronized team/agent in the project show notification to import
  Fix catalog agents list in manage agents
  Add total teams in catalog stats in dashboard
  Fix total agents in catalog stats in dashboard
  Add version notes to releases page
  Agents roles empty list in tabs
- Updated dependencies [4eae697]
  - @agent-teams/webviews@1.0.9
  - @agent-teams/core@1.0.9

## [1.0.8] - 2026-03-11

### Patch Changes

- d6b4d18: Add gitignore option by target in profile
  Fix biome rule with important
  Fix total agents stats error
- Updated dependencies [d6b4d18]
  - @agent-teams/webviews@1.0.8
  - @agent-teams/core@1.0.8

## [1.0.7] - 2026-03-11

### Patch Changes

- Extension preview updated
  Add gitignore .agent-temns folder in profile
- Updated dependencies
  - @agent-teams/webviews@1.0.7
  - @agent-teams/core@1.0.7

## [1.0.6] - 2026-03-10

### Patch Changes

- c999597: - Error in sync
  - Sync modal fixed
- Updated dependencies [c999597]
  - @agent-teams/webviews@1.0.6
  - @agent-teams/core@1.0.6

## [1.0.5] - 2026-03-10

### Patch Changes

- - Fix error in agent skills panel
  - Changeset wizard improvement
  - Fixed project skills list
  - Add reset catalog in import/export view
- Updated dependencies
  - @agent-teams/webviews@1.0.5
  - @agent-teams/core@1.0.5

## [1.0.4] - 2026-03-10

### Patch Changes

- a1e8944: - Open dashboard panel fixed
  - @agent-teams/core@1.0.4
  - @agent-teams/webviews@1.0.4

## [1.0.3] - 2026-03-10

### Patch Changes

- 14d64af: - Fix: open dashboard panel
  - @agent-teams/core@1.0.3
  - @agent-teams/webviews@1.0.3

## [1.0.2] - 2026-03-09

### Patch Changes

- 23d0290: - Add release flow automation
  - @agent-teams/core@1.0.2
  - @agent-teams/webviews@1.0.2

## [1.0.1] - 2026-03-09

### Patch Changes

- - Remove targets in agent output md
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @agent-teams/webviews@1.0.1
  - @agent-teams/core@1.0.1

All notable changes to the agent-teams extension will be documented in this file.
This file is updated automatically by `pnpm release:version` — do not edit manually.
The root CHANGELOG.md is the canonical public record.

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
- `@router` — intent-aware routing participant; matches user input to the most
  relevant registered agent using normalized scoring (intent ratio, path match, keyword
  ratio, and domain match)
- Dynamic participants: one `@<agentId>` participant registered per loaded
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
