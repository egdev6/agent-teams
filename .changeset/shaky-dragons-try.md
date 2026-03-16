---
"agent-teams": patch
"@agent-teams/webviews": patch
"@agent-teams/core": patch
"@agent-teams/cli": patch
---

### Engram autonomous mode for worker agents

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


