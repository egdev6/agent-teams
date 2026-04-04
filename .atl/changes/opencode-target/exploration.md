# Exploration: opencode sync target

## Current State

The plugin currently supports 5 sync targets: `github_copilot`, `claude_code`, `codex`, `gemini`, `openai`.

- **`claude_code`** → generates `.claude/agents/{id}.md` (one markdown file per agent, with YAML frontmatter)
- **`github_copilot`** → generates `.github/agents/{id}.agent.md`
- **`codex`, `gemini`, `openai`** → generate a single root-level context file (`AGENTS.md` or `GEMINI.md`), no per-agent files (`skipAgents: true`)

The `SyncTarget` type, all schemas, the UI, and `teamManager.ts` all need updating to add `opencode`.

---

## Affected Areas

### Core types and schemas
- `packages/core/src/types/index.ts` — `SyncTarget` union + `AgentSpec` interface (add `opencode_*` fields)
- `packages/core/schemas/agent.schema.json` — add `opencode` to `targets` enum + add `opencode_*` fields schema
- `packages/core/schemas/project.profile.schema.json` — add `opencode` to `sync_targets` enum
- `packages/core/src/utils/index.ts` — `normalizeProfileSyncTarget()` needs `opencode` case

### Extension (backend)
- `packages/extension/src/types.ts` — `ProjectProfile` hardcoded union; `SyncTarget` re-export
- `packages/extension/src/teamManager.ts` — multiple methods need `opencode` branches:
  - `resolveTargetPaths()` — new case: `{ dir: '.opencode/agents', ext: '.md' }`
  - `generateAgentMarkdown()` — lean body (same as claude_code)
  - `mdFrontmatter()` — dispatch to `collectOpencodeFrontmatter()`
  - `collectOpencodeFrontmatter()` — new function (maps `opencode_*` fields → frontmatter)
  - `resolveSyncTargets()` — add `opencode` to the allowed Set
  - `syncMcpServers()` — opencode may want MCP sync to `.opencode/mcp.json` (TBD, lower priority)

### Webviews (frontend UI)
- `packages/webviews/src/pages/profile-editor/types.ts` — add `opencode` to local `SyncTarget`
- `packages/webviews/src/pages/profile-editor/components/SyncTargetsCard.tsx` — add `opencode` entry to `SYNC_TARGETS` array + optional UI grouping (agents vs context-only)
- `packages/webviews/src/pages/agent-wizard/components/steps/OutputContextStep.tsx` — add `opencode` to the local `SYNC_TARGETS` constant + opencode wizard block
- `packages/webviews/src/pages/agent-wizard/AgentWizardCard.tsx` — add opencode-specific props to wizard state
- `packages/webviews/src/pages/agent-wizard/payload.ts` — serialize opencode fields guarded by `state.targets.includes('opencode')`

### Bundled content
- `packages/extension/media/bundled-agents/agent-designer.yml` — add `opencode` to targets
- `packages/extension/media/bundled-agents/project-configurator.yml` — add `opencode` to targets
- `packages/extension/media/bundled-agents/consultant.yml` — add `opencode` to targets
- `packages/extension/media/bundled-skills/agent-spec-authoring/SKILL.md` — document opencode fields

---

## Approaches

### 1. **Markdown-file approach** (recommended — matches existing `claude_code` pattern)
Generates `.opencode/agents/{id}.md` with YAML frontmatter per agent. Agent file name = agent ID in opencode.

**Frontmatter fields** (from official opencode docs):
```yaml
---
description: "..."        # required — used for @ autocomplete
mode: subagent             # primary | subagent | all (default: all)
model: anthropic/claude-sonnet-4-20250514   # provider/model-id
temperature: 0.3           # float 0.0–1.0
steps: 10                  # integer — max agentic iterations
permission:
  edit: ask                # ask | allow | deny
  bash: ask
  webfetch: ask
hidden: false              # hides from @ autocomplete (subagents only)
---
```
Body of the file becomes the agent's system prompt.

- **Pros**: One file per agent (clean, version-controllable, project-scoped), perfect parallel to `claude_code`, no JSON parsing/merging needed, opencode's own `opencode agent create` does the same
- **Cons**: Doesn't touch the global `~/.config/opencode/opencode.json` — agents are project-local only (but this is correct behavior for a project-level sync)
- **Effort**: Low-Medium

### 2. **JSON approach** (rejected)
Modifies `~/.config/opencode/opencode.json` global config, merging an `agent` block.

- **Pros**: Global availability across all opencode sessions
- **Cons**: Mutates a global user config file (dangerous, out of scope for a workspace sync), requires JSON read/merge/write cycle, fragile across concurrent edits
- **Effort**: High

---

## Recommendation

**Use Approach 1 (markdown files)**. It's the exact same pattern as `claude_code`, it's what opencode's own tooling generates, it's project-scoped and version-controllable, and it requires zero new infrastructure — just adding new branches to existing switch/if chains.

**opencode-specific AgentSpec fields to add:**
| Field | Maps to frontmatter | Type | Notes |
|-------|---------------------|------|-------|
| `opencode_model` | `model` | string | Free-form `provider/model-id` |
| `opencode_mode` | `mode` | enum `primary\|subagent\|all` | Default: `all` |
| `opencode_temperature` | `temperature` | number | 0.0–1.0 |
| `opencode_steps` | `steps` | integer | Max agentic iterations |
| `opencode_permission_edit` | `permission.edit` | enum `ask\|allow\|deny` | |
| `opencode_permission_bash` | `permission.bash` | enum `ask\|allow\|deny` | |
| `opencode_permission_webfetch` | `permission.webfetch` | enum `ask\|allow\|deny` | |
| `opencode_hidden` | `hidden` | boolean | Subagent only |

---

## Risks

- **MCP sync**: opencode uses `.opencode/mcp.json` for project-level MCP servers — if users want MCP servers synced to opencode, a `syncMcpServers()` branch will be needed. This can be deferred to a follow-up.
- **Model validation**: `opencode_model` is a free string (no enum) — no client-side validation of whether the model ID is valid. Can optionally fetch from `opencode models` CLI but this is optional UX polish.
- **`description` required in opencode**: opencode docs say `description` is required. The existing `description` field in `AgentSpec` maps cleanly to this — no new field needed.
- **`skipAgents` pattern**: opencode is NOT a `skipAgents` target — it generates per-agent files like `claude_code` and `github_copilot`.

---

## Ready for Proposal

**Yes.** The approach is clear, the affected areas are fully mapped, and there are no architectural blockers. The next phase can write a proposal defining the full scope.
