---
"agent-teams": minor
"@agent-teams/core": minor
"@agent-teams/webviews": minor
"@agent-teams/cli": minor
---

> Requires Engram ≥ 1.9.9 · VS Code ≥ 1.112.0

## Built-in agents: @agent-designer and @team-builder

Two agents are now bundled with the extension and available immediately without any workspace setup:

- **`@agent-designer`** — generates a valid `AgentSpec` YAML from a natural-language description. Uses the `agent-spec-authoring` skill and the project context to produce specs coherent with the existing team. Also supports importing an existing agent definition from another format (Claude Code `.md`, Copilot `.agent.md`, plain markdown) and converting it to an `AgentSpec` YAML.
- **`@team-builder`** — analyzes your project and designs the optimal agent team composition. It proposes agent explanation cards for review, then fans out to `@agent-designer` workers via Engram to generate all specs in parallel.

When no teams exist, the dashboard now shows a **"Design your first team"** card that opens the `@team-builder` chat directly.

Workspace agents always take precedence — if you already have an agent with the same `id`, your local version wins.

The `agent-spec-authoring` skill is now bundled with the extension. It is injected automatically into `@agent-designer` sessions — no workspace setup or manual skill installation required. A skill installed locally in `.agent-teams/skills/agent-spec-authoring/` still takes precedence over the bundled version.

## New sync targets: Gemini CLI and OpenAI Agents SDK

You can now sync your agent teams to two new platforms directly from the Profile Editor:

- **Gemini CLI** — generates a `GEMINI.md` file at your project root. Context packs are inlined by priority (essential packs always, standard packs up to your budget, reference packs listed as links). No per-agent files, no MCP config needed.
- **OpenAI Agents SDK** — generates an `AGENTS.md` file at your project root using the same priority-aware approach.

Both appear as checkboxes in the Profile Editor alongside Claude Code, Codex, and GitHub Copilot.

## AI-guided onboarding: @project-configurator and @consultant

Two new bundled agents complete the AI-assisted setup flow:

- **`@project-configurator`** — performs an exhaustive, technology-agnostic analysis of any project to auto-generate a complete `project.profile.yml` and atomized context packs with real codebase-derived content. Works with any build system or language (Android/Kotlin, .NET/C#, Rust, Go, Python, Swift/iOS, Flutter, monorepos with mixed stacks, etc.) — no technology is assumed until found in actual files. Detects build manifests, extracts verbatim commands, maps paths, and proposes context packs by functional domain. Requires explicit user confirmation before writing any file.
- **`@consultant`** — read-only advisory agent that analyses your active team's coverage gaps, responsibility overlaps, broken handoff references, and circular delegation chains. Recommends new agents, MCP integrations, skill assignments, and context pack allocations, grounded in the project profile and existing agent specs. Always defers execution to `@agent-designer` or `@team-builder`.

## Dashboard: AI-first onboarding flow

The dashboard now surfaces the right AI agent at each step of the setup journey:

- **No profile configured** — the "Configure Your Project" card now shows two options: **"Auto-configure with AI"** (opens `@project-configurator`, primary action) and **"Configure manually"** (opens the Profile Editor form, secondary action).
- **Profile configured + active team** — the Team Agents card header and empty state now show **"Design with AI"** (opens `@agent-designer`, primary action) alongside **"Create manually"** (previous behaviour, secondary action).
- **Full setup complete** (profile + active team + at least one agent) — a new **Consultant** card appears above the Team Agents card with a "Consult your team" CTA that opens `@consultant`.

## @team-builder improvements

- **Profile shortcut** — if a valid `project.profile.yml` already exists, team-builder now loads `technologies`, `paths`, `commands`, and `context_packs` directly from it and skips its own stack-detection phase.
- **Context pack assignment** — when proposing agents, team-builder now maps the available packs in `.agent-teams/context-packs/` to agents by domain, rather than listing all packs for all agents.

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

## "Design with AI" shortcuts on manager pages

The **Design a new agent with AI** shortcut is now available directly in the Agent Manager page header, and a **Design a new team with AI** shortcut is available in the Team Manager page header. Both open the corresponding AI chat (`@agent-designer` / `@team-builder`) in one click, without having to return to the Dashboard first.

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

