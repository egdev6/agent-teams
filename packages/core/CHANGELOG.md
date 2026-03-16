# @agent-teams/core

## 1.1.1

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

## 1.1.0

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

## 1.0.9

### Patch Changes

- 4eae697: Fix error in rules when import agent from yml
  Detects not sincronized team/agent in the project show notification to import
  Fix catalog agents list in manage agents
  Add total teams in catalog stats in dashboard
  Fix total agents in catalog stats in dashboard
  Add version notes to releases page
  Agents roles empty list in tabs

## 1.0.8

### Patch Changes

- d6b4d18: Add gitignore option by target in profile
  Fix biome rule with important
  Fix total agents stats error

## 1.0.7

### Patch Changes

- Extension preview updated
  Add gitignore .agent-temns folder in profile

## 1.0.6

### Patch Changes

- c999597: - Error in sync
  - Sync modal fixed

## 1.0.5

### Patch Changes

- - Fix error in agent skills panel
  - Changeset wizard improvement
  - Fixed project skills list
  - Add reset catalog in import/export view

## 1.0.4

## 1.0.3

## 1.0.2

## 1.0.1
