# Plan: MCP Servers per-agent configuration

## Context & problem

Each agent spec can declare `tools[]` with a `name` and a `when` condition. The `name` is injected into the `.agent.md` frontmatter so Copilot/Claude can invoke it, and the `when` becomes an instructional prose table in the body. However:

1. There is no way to declare **which MCP server** provides a given tool — the server must already be globally configured by the user in `.vscode/mcp.json` or at the OS level.
2. No mechanism exists to auto-provision a server's config file when an agent that needs it is synced into the project.
3. There are no per-step tool bindings in the workflow — tool use is entirely LLM-inferred from prose.

## Proposed solution

Add an optional `mcpServers[]` property to the agent spec. During `syncTeam()` the extension merges those server entries into the appropriate MCP config file for each target (`copilot` → `.vscode/mcp.json`, `claude` → `.mcp.json` at project root), without overwriting existing entries.

The UI exposes this as a collapsible section inside the existing **Workflow & Tools** wizard step (step 3 of 6).

---

## Implementation plan

### Phase 1 — Schema & Types (`packages/core`)

**1.** Add `mcpServers` property to `packages/core/schemas/agent.schema.json`:

```json
"mcpServers": {
  "type": "array",
  "description": "MCP servers this agent requires. Merged into .vscode/mcp.json (copilot) or .mcp.json (claude) during sync.",
  "items": {
    "type": "object",
    "required": ["id", "command"],
    "additionalProperties": false,
    "properties": {
      "id":      { "type": "string", "description": "Unique server key (e.g. github, linear)" },
      "command": { "type": "string", "description": "Executable to launch (e.g. npx, uvx, node)" },
      "args":    { "type": "array", "items": { "type": "string" }, "default": [] },
      "env":     { "type": "object", "additionalProperties": { "type": "string" }, "description": "Environment variables passed to the server process" }
    }
  },
  "default": []
}
```

**2.** Add `AgentMcpServer` interface to `packages/core/src/types/index.ts`:

```ts
export interface AgentMcpServer {
  id: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
```

**3.** Add `mcpServers?: AgentMcpServer[]` to the `AgentSpec` interface in the same file.

---

### Phase 2 — TeamManager sync (`packages/extension/src/teamManager.ts`)

_Depends on Phase 1._

**4.** New private method `syncMcpServers(agents: ComposedAgentSpec[], projectRoot: string, target: SyncTarget)`:

- Collect all `mcpServers` entries across all composed agents, deduped by `id` (first occurrence wins).
- For `copilot` target: merge into `.vscode/mcp.json` under the `servers` key — same merge pattern as `SetupEngramCommand.setupMcpJson()`.
- For `claude` target: merge into `.mcp.json` at the project root under the `mcpServers` key (Claude Code format: `{ "mcpServers": { "<id>": { "command": ..., "args": [...], "env": {...} } } }`).
- Never overwrite an existing entry that already has the same `id`.
- No-op when `dryRun` is true.

Call `syncMcpServers()` at the end of `syncTargetChanges()` (inside the `!dryRun` block, after `writeAgentsForTarget`).

**5.** In `mdWorkflowAndTools()`: add a `## MCP Servers` section after the `## Tools` table when `agent.mcpServers?.length`:

```markdown
## MCP Servers

| Server | Command |
|--------|---------|
| github | npx -y @modelcontextprotocol/server-github |
```

---

### Phase 3 — Dashboard bridge (`packages/extension/src/dashboardPanel.ts`)

_Parallel with Phase 2._

**6.** Changes in `dashboardPanel.ts`:

- `AgentWizardPayload` interface (line ~23): add `mcpServers?: Array<{ id: string; command: string; args?: string[]; env?: Record<string, string> }>`.
- `_toAgentDataMessage()` (line ~2186): add `mcpServers: this._ensureArray(spec.mcpServers)` to the returned object.
- `_addOptionalAgentFieldsForCreate()` (line ~2278): add `if (message.mcpServers?.length) spec.mcpServers = message.mcpServers`.
- `_addOptionalAgentFields()` (line ~2467): same pattern with `else delete updated.mcpServers` to clear when removed.

---

### Phase 4 — Webview model & payload (`packages/webviews`)

_Parallel with Phases 2 + 3._

**7.** `packages/webviews/src/models/pages/agent-wizard.ts`:

```ts
// New type — env stored as free-text JSON string in the UI, serialized to object on send
export type AgentMcpServerForm = {
  id: string;
  command: string;
  args: string;   // textarea, one arg per line
  env: string;    // textarea, free JSON: { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
};
```

Add `mcpServers: AgentMcpServerForm[]` to `AgentWizardFormState`.  
Add `mcpServers?: AgentMcpServer[]` (core type) to `AgentWizardMessagePayload`.

**8.** `packages/webviews/src/pages/agent-wizard/payload.ts` — in `buildAgentWizardPayload()`:

```ts
mcpServers: state.mcpServers.length > 0
  ? state.mcpServers.map(s => ({
      id: s.id.trim(),
      command: s.command.trim(),
      args: s.args.split('\n').map(a => a.trim()).filter(Boolean),
      env: s.env.trim() ? JSON.parse(s.env) : undefined,
    })).filter(s => s.id && s.command)
  : undefined,
```

---

### Phase 5 — UI: WorkflowToolsStep (`packages/webviews`)

_Depends on Phase 4._

**9.** `packages/webviews/src/pages/agent-wizard/components/steps/WorkflowToolsStep.tsx`:

- Add props: `mcpServers: AgentMcpServerForm[]`, `setMcpServers: (v: AgentMcpServerForm[]) => void`.
- Add a shadcn `Collapsible` section below the Tools section titled **"MCP Servers"** (collapsed by default).
- Each server entry shows: `id` Input, `command` Input, `args` Textarea (one per line), `env` Textarea (free JSON). Add / remove entries.
- **Badge suggestion**: when `tool.name` contains `/` (e.g. `github/create_issue`), show a small inline hint below the tool entry: *"Configure 'github' MCP server →"* — clicking pre-fills a new server entry with `id: github` and opens the MCP Servers section.

**10.** `packages/webviews/src/pages/agent-wizard/AgentWizardCard.tsx`:

- Add `mcpServers` / `setMcpServers` to props interface.
- Thread them down to `WorkflowToolsStep`.

---

### Phase 6 — Create / Edit pages (`packages/webviews`)

_Depends on Phase 5._

**11.** `packages/webviews/src/pages/create-agent/useCreateAgentLogic.ts`:
- `const [mcpServers, setMcpServers] = useState<AgentMcpServerForm[]>([])`.
- Include in returned model object and in `buildAgentWizardPayload()` call.

**12.** `packages/webviews/src/pages/create-agent/CreateAgentPage.tsx`:
- Pass `mcpServers={model.mcpServers}` and `setMcpServers={model.setMcpServers}` to `AgentWizardCard`.

**13.** `packages/webviews/src/pages/edit-agent/useEditAgentLogic.ts`:
- Same useState.
- In the `agentData` message handler: populate from `message.mcpServers` mapping each entry to its form shape (join `args` array with `\n`, stringify `env` object).

**14.** `packages/webviews/src/pages/edit-agent/EditAgentPage.tsx`:
- Pass `mcpServers` / `setMcpServers` to `AgentWizardCard`.

---

## File map

| File | Change |
|------|--------|
| `packages/core/schemas/agent.schema.json` | Add `mcpServers` property block |
| `packages/core/src/types/index.ts` | `AgentMcpServer` interface + `AgentSpec.mcpServers` |
| `packages/extension/src/teamManager.ts` | `syncMcpServers()`, `mdWorkflowAndTools()` section |
| `packages/extension/src/dashboardPanel.ts` | Payload interface + `_toAgentDataMessage`, `_addOptionalAgentFields*` |
| `packages/webviews/src/models/pages/agent-wizard.ts` | `AgentMcpServerForm` type, form state + message payload |
| `packages/webviews/src/pages/agent-wizard/payload.ts` | Map + serialize `mcpServers` in `buildAgentWizardPayload()` |
| `packages/webviews/src/pages/agent-wizard/components/steps/WorkflowToolsStep.tsx` | Collapsible MCP Servers section + badge suggestion |
| `packages/webviews/src/pages/agent-wizard/AgentWizardCard.tsx` | Thread `mcpServers` / `setMcpServers` |
| `packages/webviews/src/pages/create-agent/useCreateAgentLogic.ts` | State + model |
| `packages/webviews/src/pages/create-agent/CreateAgentPage.tsx` | Pass props |
| `packages/webviews/src/pages/edit-agent/useEditAgentLogic.ts` | State + populate from agentData |
| `packages/webviews/src/pages/edit-agent/EditAgentPage.tsx` | Pass props |

---

## Design decisions

| Decision | Choice |
|----------|--------|
| `env` UI | Free-text JSON textarea — parse in `payload.ts` before send |
| `args` UI | Textarea, one arg per line → split into array on send |
| Copilot MCP config | `.vscode/mcp.json` → `servers` key |
| Claude MCP config | `.mcp.json` at project root → `mcpServers` key |
| Merge strategy | Same `id` already present → skip (never overwrite) |
| Dry-run | `syncMcpServers` is a no-op when `dryRun: true` |
| Badge suggestion | Nice-to-have, can be deferred from MVP |
| Workflow step binding | Deferred — naming the tool in the step text is sufficient for LLMs today |

---

## Verification checklist

- [ ] Create an agent with 1 MCP server (`github`): saved YAML contains `mcpServers: [{id: github, command: npx, args: [...], env: {...}}]`
- [ ] `syncTeam()` target `copilot`: `.vscode/mcp.json` gains the `github` entry without touching `engram`
- [ ] `syncTeam()` target `claude`: `.mcp.json` at root gains the entry
- [ ] Edit agent: `mcpServers` pre-populate in the wizard correctly
- [ ] Agent without `mcpServers`: no changes to any MCP config file
- [ ] Generated `.agent.md` includes `## MCP Servers` table only when entries are present
- [ ] Duplicate `id` across two agents in the same team → only one entry in the output JSON
