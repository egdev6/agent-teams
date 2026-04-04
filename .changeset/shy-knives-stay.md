---
"agent-teams": minor
"@agent-teams/core": minor
"@agent-teams/webviews": minor
"@agent-teams/cli": minor
---

> Requires Engram ≥ 1.9.9 · VS Code ≥ 1.113.0

## Built-in agent: @agent-designer

A new agent is now bundled with the extension and available immediately without any workspace setup:

- **`@agent-designer`** — generates a valid `AgentSpec` YAML from a natural-language description. Uses the `agent-spec-authoring` skill and the project context to produce specs coherent with the existing team. Also supports importing an existing agent definition from another format (Claude Code `.md`, Copilot `.agent.md`, OpenCode `.md`, plain markdown) and converting it to an `AgentSpec` YAML.

Workspace agents always take precedence — if you already have an agent with the same `id`, your local version wins.

The `agent-spec-authoring` skill is now bundled with the extension. It is injected automatically into `@agent-designer` sessions — no workspace setup or manual skill installation required. A skill installed locally in `.agent-teams/skills/agent-spec-authoring/` still takes precedence over the bundled version.

## New sync targets: Gemini CLI, OpenAI Agents SDK, and OpenCode

You can now sync your agent teams to three new platforms directly from the Profile Editor:

- **Gemini CLI** — generates a `GEMINI.md` file at your project root. Context packs are inlined by priority (essential packs always, standard packs up to your budget, reference packs listed as links). No per-agent files, no MCP config needed.
- **OpenAI Agents SDK** — generates an `AGENTS.md` file at your project root using the same priority-aware approach.
- **OpenCode** — generates per-agent markdown files at `.opencode/agents/{agent-id}.md` with OpenCode-specific frontmatter (`mode`, `permissions`, `model`). Supports all agent roles (router, orchestrator, worker) with proper tool mappings and MCP server configuration.

All three appear as checkboxes in the Profile Editor alongside Claude Code, Codex, and GitHub Copilot.

## AI-guided onboarding: @project-configurator and @consultant

Two new bundled agents complete the AI-assisted setup flow:

- **`@project-configurator`** — performs an exhaustive, technology-agnostic analysis of any project to auto-generate a complete `project.profile.yml` and atomized context packs with real codebase-derived content. Works with any build system or language (Android/Kotlin, .NET/C#, Rust, Go, Python, Swift/iOS, Flutter, monorepos with mixed stacks, etc.) — no technology is assumed until found in actual files. Detects build manifests, extracts verbatim commands, maps paths, and proposes context packs by functional domain. Requires explicit user confirmation before writing any file.
- **`@consultant`** — read-only advisory agent that analyses your active team's coverage gaps, responsibility overlaps, broken handoff references, and circular delegation chains. Recommends new agents, MCP integrations, skill assignments, and context pack allocations, grounded in the project profile and existing agent specs. Always defers execution to `@agent-designer`.

## Dashboard: AI-first onboarding flow

The dashboard now surfaces the right AI agent at each step of the setup journey:

- **No profile configured** — the "Configure Your Project" card now shows two options: **"Auto-configure with AI"** (opens `@project-configurator`, primary action) and **"Configure manually"** (opens the Profile Editor form, secondary action).
- **Profile configured + active team** — the Team Agents card header and empty state now show **"Design with AI"** (opens `@agent-designer`, primary action) alongside **"Create manually"** (previous behaviour, secondary action).
- **Full setup complete** (profile + active team + at least one agent) — a new **Consultant** card appears above the Team Agents card with a "Consult your team" CTA that opens `@consultant`.

## Profile ZIP export / import

The Import / Export page now includes a **ZIP section** that packages the entire `.agent-teams/` directory — agents, teams, context packs, skills, and profile config — into a portable ZIP file. Import a ZIP on another machine to restore the full workspace configuration in one click. Files that already exist prompt for confirmation before being overwritten.

## Context packs budget preview

The Profile Editor Context Packs section now has a **Preview** button that shows a live budget breakdown for the selected packs:

- How many characters are inlined vs referenced per target (claude, gemini, openai, codex)
- Budget bar showing usage vs. the configured limit
- For GitHub Copilot: all selected packs are copied as separate `.github/context/` files (no budget limit)

## Profile Editor redesigned as accordion

All profile sections (Basic Information, Context Packs, Sync Targets, Technologies, Paths, Commands, .gitignore) are now collapsible accordion panels. Each section header shows a live summary of its current values, making it easier to scan and edit large profiles.

## "Not synced" badge for modified agents and teams

Agents and teams whose source spec was modified after the last successful sync now show a **"Not synced"** warning badge in the Agent Manager and Team Manager. Useful for spotting stale outputs before relying on generated files.

## Agent wizard improvements

- **Standard tools as checkboxes** — the Workflow & Tools step now shows VS Code built-in tools (`read`, `edit`, `search`, `execute`, `browser`, `agent`, `web`, `todo`, `vscode`) as a checkbox grid. Custom or extension tools remain as free-text rows below.
- **Per-field validation** — Name, Description, Role, and Workflow Steps show inline error messages with a 300 ms debounce as you type, making it clear what's blocking the Save button.
- **Engram description per role** — the Engram toggle now shows a role-specific description (router, orchestrator, or worker) instead of a generic message.
- **Skill title in selected skills list** — the Skills step now shows the human-readable skill title instead of the raw skill ID.

## Cleaner `--dry-run` output

Running `agent-teams team:sync --dry-run` now shows a colour-coded diff:

```
  + path/to/new-agent.md        [create]
  ~ path/to/updated-agent.md    [update]
  - path/to/removed-agent.md    [delete]
```

Changes are grouped by target when syncing to multiple platforms at once.

## Tool name normalization

Agent specs that reference the old compound tool names (`search/codebase`, `edit/editFiles`) are automatically normalized to their current short equivalents (`search`, `edit`) during sync. Extension tools now use the qualified `egdev6.agent-teams/` prefix in generated Copilot frontmatter.

## Per-agent Engram opt-in

Engram-dependent features (memory instructions, dispatch tools) now activate per-agent rather than globally. An agent that declares `engram` in its `mcpServers` list will receive Engram context even in workspaces that don't have a global Engram MCP server configured. This enables self-contained agents that can be bootstrapped on a fresh machine.

## Internal: unified sync target names

The internal names for sync targets now match the schema (`github_copilot`, `claude_code`, `codex`, `gemini`, `openai`). Old aliases (`copilot`, `claude`) in existing profile files are still recognised automatically — no migration needed.

## Agent Manager: role-based tabs

The Manage Agents page now groups agents into three tabs — **Router**, **Orchestrator**, and **Worker** — each showing a live count. Navigating and reviewing agents of a specific role no longer requires scrolling through the full list. An empty-state message is shown per tab when no agents of that role exist in the catalog.

## "Design with AI" shortcut on Agent Manager

The **Design a new agent with AI** shortcut is now available directly in the Agent Manager page header. Opens the `@agent-designer` AI chat in one click, without having to return to the Dashboard first.

## Create Team and Edit Team dedicated pages

Agent Teams now has full CRUD pages for managing teams:

- **Create Team** — a dedicated form page with team name, description, and an agent member picker. The summary card updates live as you add or remove members, and the **Create Team** button is disabled until a name is provided.
- **Edit Team** — loads the existing team data for editing. Supports renaming, updating the description, and adjusting member assignments. Includes **Set as Active Team** and **Delete Team** actions directly in the editing view — both are disabled while the team is the currently active one, preventing accidental changes.

Previously, team creation was handled by a simpler inline dialog; the new dedicated pages bring the team authoring experience in line with the agent wizard.

## Skills Browser: community registry search

The **Explore Skills** tab in the Skills Browser now lets you search and install community skills directly from the Agent Teams registry. Enter a keyword to browse available skills, view descriptions, install counts, and source links, and click **Install** to add any skill to your workspace without leaving the extension.

## `complete-subtask` added to the standard VS Code tools

`complete-subtask` is now listed as a first-class checkbox in the standard VS Code tools grid in the agent wizard. Select it for orchestrator and worker agents that participate in Engram-coordinated parallel task flows — it signals task completion to the `TaskCoordinator` so the fan-in aggregation step can proceed automatically.

## Internal: Playwright E2E test suite for the dashboard webviews

A full Playwright end-to-end test suite now covers the dashboard webviews (TC-06 through TC-30). Tests run against the compiled SPA using a VS Code API shim that intercepts `postMessage` calls, exercising agent management, team management, the profile editor, agent wizard, skills browser, context packs, and import/export. A shared fixtures and helpers module standardises navigation and state injection across all test files.

## Claude Code sub-agent fine-tuning

Five new configuration fields give you precise control over how your agents behave when running as Claude Code sub-agents:

- **`claude_effort`** — thinking effort level (`low`, `medium`, `high`, `max`). Use `low` for quick deterministic tasks like routing or formatting, `medium` for standard work, `high`/`max` for deep architectural analysis.
- **`claude_permission_mode`** — controls how the sub-agent handles file edits (`default`, `acceptEdits`, `dontAsk`, `bypassPermissions`).
- **`claude_disallowed_tools`** — a list of tools to deny for this sub-agent, applied on top of inherited permissions. Useful for locking down agents that shouldn't touch certain capabilities (e.g. deny `WebSearch` for a local-only code formatter).
- **`claude_background`** — set to `true` to run the sub-agent as a background task in Claude Code, freeing up your main session.
- **`claude_mcp_servers`** — MCP servers scoped to *this sub-agent only*, declared in the Claude Code frontmatter (not merged into workspace config). Useful when an agent needs a private integration that other agents shouldn't see.

The agent wizard's **Output & Context** step now includes UI controls for all five fields: effort and permission mode as dropdowns, background as a toggle, disallowed tools as a chip input, and sub-agent MCP servers as a dedicated collapsible section.

## Claude Code frontmatter overhaul

The generated Claude Code agent files (`.claude/agents/*.md`) now use a dedicated frontmatter mapper that produces cleaner, more precise output:

- **`name`** is now the agent `id` (slug) instead of the display name — this is what Claude Code uses for sub-agent routing.
- **`tools:`** line maps VS Code tool names to their Claude equivalents (e.g. `search` → `Grep, Glob`, `execute` → `Bash`, `web` → `WebSearch`). MCP tools and Copilot-only tools are filtered out. When no explicit tools are present, the line is omitted entirely (Claude inherits all).
- **`disallowedTools:`**, **`skills:`**, and **`mcpServers:`** are emitted only when populated.
- The old hardcoded `effort: low` for routers / `effort: high` for orchestrators is replaced by the explicit `claude_effort` field.

## Lean agent body for Claude Code, Copilot, and OpenCode

The agent prompt body synced to Claude Code, Copilot, and OpenCode targets has been completely restructured for clarity and token efficiency:

- **Persona line** → **Role** (expertise or scope topics) → **Constraints** (only if defined) → **Approach** (workflow steps with Engram session lifecycle condensed) → **Delegates to** (only if handoffs exist) → **Output Format** (mapped from template ID)
- No metadata tables, no scope section, no MCP server tables — everything that isn't execution-relevant is omitted.
- Engram session steps (`mem_session_start`, `mem_context`, `mem_save`, `mem_session_end`) are auto-injected as first/last approach steps — agents using Engram don't need to declare them in their `workflow[]`.
- Orchestrator delegation steps are automatically reconstructed: the dispatch tool reference is injected after the "Assign" step based on the target platform (Claude uses `dispatch_task`, Copilot uses `agent-teams-handoff` / `agent-teams-dispatch-parallel`).

## Claude Code context file: AGENTS.md → CLAUDE.md

The Claude Code sync target now writes its context file as `CLAUDE.md` at the project root instead of `AGENTS.md`. This aligns with Claude Code's convention for context files and prevents conflicts when both Claude Code and Codex/OpenAI targets are enabled — each target writes its own file.

> **No migration needed.** Existing `AGENTS.md` files from previous syncs are untouched. The next sync writes `CLAUDE.md` alongside them. If you only use the Claude target, you can safely delete the old `AGENTS.md`.

## Bundled agents materialized as Claude Code slash commands and OpenCode agents

When the extension activates, bundled agents (`@agent-designer`, `@project-configurator`, `@consultant`) are automatically compiled into:

- **Claude Code slash commands** at `.claude/commands/{agent-id}.md` — invoke via `/agent-designer` or `/project-configurator` directly in Claude Code
- **OpenCode agents** at `.opencode/agents/{agent-id}.md` — invoke via `@agent-designer` or `@project-configurator` directly in OpenCode

Each command/agent file includes:
- Proper frontmatter (`description`, `allowed-tools` for Claude Code; `mode`, `permissions`, `model` for OpenCode)
- Inlined skills (with YAML frontmatter stripped — only the instructional body is included)
- Workflow steps with VS Code-only tools filtered out
- Constraints from the agent spec

Files are regenerated on every activation and when the dashboard opens (file-existence-gated, so it's a no-op when up to date). OpenCode detection is automatic — bundled agents are materialized only if the OpenCode CLI is installed.

## OpenCode sync target support

Agent Teams now fully supports OpenCode as a sync target with per-agent file generation:

- **Agent files** at `.opencode/agents/{agent-id}.md` with OpenCode-specific frontmatter
- **Frontmatter fields**: `mode` (mapped from role: `router` → `route`, `orchestrator` → `orchestrate`, `worker` → `work`), `permissions` (based on agent capabilities), `model` (from `claude_effort` or role defaults)
- **Tool mapping**: VS Code tools are mapped to their OpenCode equivalents (e.g., `search` → `grep/glob`, `execute` → `bash`)
- **MCP servers**: automatically synced to `.opencode/mcp.json` with proper configuration
- **Context packs**: inlined by priority in the agent body following the same budget rules as other targets
- **Bundled agents**: automatically materialized as OpenCode agents when the OpenCode CLI is detected

The OpenCode target appears alongside Claude Code, Codex, GitHub Copilot, Gemini, and OpenAI in the Profile Editor sync targets section.

## Bundled skills auto-materialization

Bundled skills referenced by your agents are now automatically copied into your workspace at `.agent-teams/skills/{id}/` so they're available to the LLM at runtime — even without the extension installed:

- **On dashboard open**: when you open the Agent Teams dashboard, the extension checks which bundled skills are referenced by agents in `.agent-teams/agents/` and copies any that are missing from `.agent-teams/skills/`.
- **During team sync**: the sync step now accepts a `bundledSkillsDir` option and copies referenced skills before generating output files.
- **Via LM tool**: a new `agent-teams-copy-bundled-skills` language model tool is available so that bundled agents like `@project-configurator` can trigger the copy programmatically after writing agent specs.

Skills that already exist in the workspace are never overwritten — your local version always wins.

## @agent-designer: workflow enforcement and Engram hygiene

The `@agent-designer` bundled agent now enforces stricter rules on generated specs:

- **`workflow[]` is required** — every agent must have at least 5 workflow steps specific to its purpose. Generic placeholders are rejected during the self-check phase.
- **No Engram session steps in `workflow[]`** — `mem_session_start`, `mem_context`, `mem_save`, `mem_suggest_topic_key`, `mem_search`, `mem_session_end` are automatically injected by the sync engine based on role. Adding them manually causes duplication.
- **YAML block scalars for colons** — workflow strings containing a colon must use `>` or `|` to avoid being parsed as YAML mappings.
- **`claude_effort` guidance** — the design checklist now includes a column for effort level, with recommendations per agent type.

## @project-configurator: skill copy step

The `@project-configurator` bundled agent now calls `agent-teams-copy-bundled-skills` after writing the project profile, before triggering context file sync. This ensures that any skills referenced by the generated agent specs are immediately available in `.agent-teams/skills/` without requiring a manual sync from the UI.

## Router agents no longer require intents

The composer validation now allows router agents to have an empty `intents` array. Routers match by domain and keywords rather than by specific intent patterns, so the field was unnecessarily restrictive.

## Workflow section is now optional in generated agent files

The agent template only renders the `## Workflow` section when the agent actually has workflow steps defined. Agents without a custom workflow (relying on role base defaults) no longer produce an empty "Workflow" heading in their generated markdown.

## Tool collection: standard tools per role

The Copilot frontmatter tool list now includes standard tools automatically based on role:

- **All roles**: `read`, `search`
- **Workers**: `edit` (added)
- **Orchestrators**: `todo` (added)
- **Engram users**: `engram/*` (always present when agent uses Engram)
- **Router/orchestrator with handoffs**: `agent-teams-handoff`, `agent-teams-dispatch-parallel`
- **Workers receiving dispatched tasks**: `agent-teams-complete-subtask`

This means you no longer need to manually add basic tools in the wizard — the sync engine fills in the essentials.

## Agent targets filtering fix

A bug where agents with a non-array `targets` field (e.g. from a YAML parsing edge case) would be silently excluded from sync output is now fixed. The filter now uses `Array.isArray()` before checking `.length`, ensuring agents with any valid targets configuration are included correctly.

## Extended Playwright E2E test coverage

New test specs have been added covering:

- MCP server environment variable validation in the agent wizard
- Role-based step visibility (router hides scope/skills, orchestrator hides subdomain)
- Save button disabled state and tooltip feedback
- Scope step glob input and exclusion fields
- Team creation summary preview
- Dashboard orphan notification card
- Edit agent basic fields and logic
- Profile editor context packs budget and sync targets
