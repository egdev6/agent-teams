---
name: agent-spec-authoring
description: >
  Specialized knowledge for generating valid AgentSpec YAML files for the agent-teams
  system. Includes full schema reference, cost-optimization rules, role restrictions,
  tool selection, and workspace-aware generation guidelines.
metadata:
  version: 1.0.0
  tags: tooling, agent-design, yaml-generation
---

# Agent Spec Authoring

## Purpose

Authoritative schema and generation rules for producing valid `AgentSpec` YAML files at
`.agent-teams/agents/{id}.yml`. Used by `agent-designer` (`when: always`).

> **IMPORTANT — wrong skill guard:** Do NOT load VS Code's built-in `agent-customization`
> skill. It describes `.agent.md` files in `.github/agents/` — a completely different format.
> This skill is the only authoritative source for `.agent-teams/agents/{id}.yml`.

---

## 1. Cost & Optimization Rules ← Apply BEFORE setting any field

> Every agent must justify its existence: if it does not reduce interactions, prompt
> complexity, or context size — do not create it.

### Agent justification (check before designing)
- Does it reduce number of requests/turns?
- Does it simplify prompts for the caller?
- Does it isolate a real, non-duplicated responsibility?

If all three answers are no → do not create the agent.

### Structural minimalism
- Smallest possible set of agents — prefer consolidation over fragmentation
- Allowed baseline: 1 router (optional) + 1 orchestrator (if multi-step) + N workers
- Max 2–3 handoffs per flow; no recursive or circular delegation
- Anti-pattern: `User → Router → Orchestrator → Worker → Worker → Worker`
- Patterns: Simple `User → Worker` | Medium `User → Orch → Workers` | Complex `User → Router → Orch → Workers`

### Single responsibility
- One clearly defined purpose, explainable in one sentence
- Good names: `component-creator`, `api-endpoint-generator`
- Bad names: `helper`, `manager`, `processor` — generic = undefined responsibility

### Scope minimization (`scope` field)
- Define `path_globs` with the minimum required paths — never full-repo context by default
- `excludes` must list everything the agent must not touch
- Do not share context between agents if avoidable

### Output fields — minimum defaults (override schema defaults)
| Field | Override default | When to change |
|---|---|---|
| `output.mode` | `short` | `detailed` only if multi-section structure is strictly needed |
| `output.max_items` | `3` | Increase only if domain requires more items |
| `output.never_include` | `[disclaimers, apologies, placeholders]` | Never remove |
| `output.template` | `diff` | Use table below to select the right one |

Avoid `template: custom` with long `format_instructions` — prefer a standard template.

### Claude Code model and turns — always set explicitly
| Scenario | `claude_model` | `claude_max_turns` |
|---|---|---|
| Router, validator, formatter, deterministic task | `haiku` | 3–5 |
| Standard worker or orchestrator | `sonnet` | 8–15 (worker) / 15–30 (orch) |
| Deep architectural analysis, high-stakes planning | `opus` | 15–20 |
| Always called from parent session, model consistency needed | `inherit` | per context |

### Workflow lean
- Only define `workflow` if the role base is inadequate for this agent's needs
- If defined: minimum steps that produce concrete output — no "preliminary review" or reflection overhead
- Each extra step = extra tokens on every invocation

### Minimum privilege for tools
- Declare only tools the agent actually invokes
- Extra tool declarations increase context and may induce unnecessary use

### Reuse over creation
- Check existing agents in `.agent-teams/agents/` first
- Prefer extending (new intents, config) over creating a new agent

---

## 2. Schema Reference

### Required fields
| Field | Type | Constraints |
|---|---|---|
| `id` | string | `^[a-z0-9-]+$`, unique slug |
| `name` | string | 3–80 chars, human-readable |
| `role` | enum | `worker` \| `orchestrator` \| `router` |
| `description` | string | 10–600 chars, 1–3 sentences |

### Metadata
| Field | Type | Default |
|---|---|---|
| `version` | semver | `"1.0.0"` |
| `domain` | string | `"general"` (e.g. frontend, backend, testing, tooling) |
| `subdomain` | string | — |
| `targets` | enum[] | `[github_copilot, claude_code]` — also: codex, gemini, openai |

### Expertise & intents
| Field | Type | Notes |
|---|---|---|
| `expertise` | string[] | Knowledge areas; used for team routing/selection |
| `intents` | string[] | `^[a-z0-9_]+$` snake_case; distinct capabilities used by routers |

### Scope
```yaml
scope:
  topics: [string]                     # Responsibility topics (human-readable)
  path_globs:                          # File patterns agent operates on
    - "src/**/*.ts"                    # Simple string
    - pattern: "packages/*/src/**"     # Or with priority: high | medium | low
      priority: high
  excludes: [string]                   # Patterns explicitly out of scope
```

### Workflow, tools, skills
```yaml
workflow: [string]   # Ordered imperative steps — REPLACES role base entirely if set
tools:
  - name: search
    when: "always"   # optional condition
skills:
  - id: skill-id
    when: "when doing X"
```

### Constraints & handoffs
```yaml
constraints:
  always: [string]    # Rules that must always be followed
  never: [string]     # Prohibited actions
  escalate: [string]  # Conditions that trigger escalation
handoffs:
  receives_from: [string]   # Agent IDs that send tasks here
  delegates_to: [string]    # Agent IDs this agent delegates to
  escalates_to: [string]    # Agent IDs for blocked task escalation
```

### Output
```yaml
output:
  template: diff             # See template guide below
  format_instructions: ""    # Only when template: custom
  mode: short                # short | detailed
  max_items: 3               # Max items per section
  never_include: [disclaimers, apologies, placeholders]
```

### Runtime (Claude Code)
```yaml
context_packs: [string]      # ^[a-z0-9:_-]+$ — loaded at runtime, not rendered in MD
claude_model: sonnet         # inherit | haiku | sonnet | opus
claude_max_turns: 10         # Max agentic turns; always set explicitly
mcpServers:                  # Only for non-Engram external integrations (GitHub, Linear, etc.)
  - id: some-integration     # Engram mcpServers entry is auto-injected when engram/* tool is present
    command: some-command
    args: [arg]
    env: {}                  # optional env vars
```

---

## 3. Role Field Rules

| Field | router | orchestrator | worker |
|---|---|---|---|
| `domain` | **`global`** (forced) | free | free |
| `subdomain` | ❌ omit | ❌ omit | ✅ |
| `scope` | ❌ omit entirely | `topics` only | ✅ full |
| `constraints` | ❌ omit | ✅ | ✅ |
| `output.max_items` | ❌ omit | ✅ | ✅ |
| `output.never_include` | ❌ omit | ✅ | ✅ |
| `output.template` | `routing-decision` | free | free |

**Router output block:** include only `template` and optionally `mode` or `format_instructions`.

---

## 4. Tool Selection Rules

Derive tools from role and topology — do not invent; do not omit locked tools.

| Role / Topology | Locked ON | Locked OFF |
|---|---|---|
| Router | `engram/*`, `agent`, `egdev6.agent-teams/agent-teams-handoff`, `egdev6.agent-teams/agent-teams-dispatch-parallel` | — |
| Orchestrator | `search`, `engram/*`, `agent`, `egdev6.agent-teams/agent-teams-handoff`, `egdev6.agent-teams/agent-teams-dispatch-parallel`, `egdev6.agent-teams/agent-teams-complete-subtask` | — |
| Worker — standalone (no `receives_from`) | `search`, `engram/*` | — |
| Worker — orchestrated (`receives_from` set) | `search`, `egdev6.agent-teams/agent-teams-complete-subtask` | `engram/*` (auto-removed) |

> Adding `engram/*` to tools **auto-injects** the required `mcpServers` entry for Engram — do not add it manually. There is no `engram.mode` field.

> When `receives_from` is set on a worker, `engram/*` must be **absent** from tools — the orchestrator owns session memory for the whole flow.

Add `edit` to tools if the agent edits or creates files. `read` is optional for workers.
If need to add checklists, add `todo` to tools and include checklist in output instructions.
If agent need to fetch information from the web, add `web` to tools.
If agent needs to execute code or commands, add `execute` to tools and specify allowed commands in constraints.
If agent needs to open and interact with integrated browsers, add `browser` to tools and specify allowed domains in constraints.

---

## 5. Output Template Guide

| Template | Use when |
|---|---|
| `diff` | Code changes, file edits (default for workers) |
| `code-review` | Review findings grouped by severity |
| `planning` | Implementation plan with steps, dependencies, risks |
| `analysis` | Technical analysis: summary, findings, implications, recommendations |
| `step-by-step` | Procedures with explicit verification steps |
| `structured-qa` | Direct Q&A, no narrative |
| `summary` | TL;DR + key points + next action |
| `routing-decision` | Router agents documenting routing outcome |
| `custom` | Free-form — requires `format_instructions` |

---

## 6. Natural Language → YAML Derivation

1. **description** — 1–3 sentences covering: what it does, what it operates on, unique value
2. **role** — routing/dispatching? → `router`. Decomposing/coordinating? → `orchestrator`. Executing a specific task? → `worker`
3. **domain** — primary tech domain mentioned (frontend, backend, testing, tooling, etc.)
4. **expertise** — knowledge areas implied by the description
5. **intents** — distinct actions the agent performs, in snake_case
6. **scope.path_globs** — file patterns the agent operates on; infer from domain if not explicit
7. **scope.excludes** — anything the agent must not touch; always include
8. **constraints** — behavioral rules: `always` for invariants, `never` for hard prohibitions, `escalate` for blockers
9. **handoffs** — derive from team topology: who sends tasks here, who receives delegated tasks
10. **optimization fields** — apply Section 1 rules to set `claude_model`, `claude_max_turns`, `output.*`

---

## 7. Import Protocol

**Sources:** Claude Code `.md` (YAML frontmatter), GitHub Copilot `.agent.md`, plain markdown.

**Rules:**
- Preserve the original agent's intent faithfully — only adapt structure and field names
- For missing required fields: infer from context before inventing arbitrary values
- Map capabilities to the closest AgentSpec construct; note in constraints if no direct mapping
- Collect ALL unresolved ambiguities (role, domain, id collision, unknown skills, missing fields,
  contradictions) → ask the user in a **single grouped message** before emitting any YAML
- **Do NOT use import mode** when invoked via Engram subtask key `task:*:subtask:agent-designer-*` — always use DESIGN path in that case

---

## 8. File Output Rules

- **Path:** `.agent-teams/agents/{id}.yml` — the `{id}` field value is the filename
- **Extension:** `.yml` only — never `.md`, `.agent.md`, or `.yaml`
- **Content:** raw YAML only — no fences, no prose, no frontmatter delimiters (`---`)
- **Delivery:** write directly to disk — do not output YAML content in the chat response
- **Never write to:** `.github/agents/`, `.claude/agents/`, `.codex/agents/`, or the project root
- After writing, confirm with the exact path created

---

## 9. Pre-Write Checklist

- [ ] All 4 required fields present: `id`, `name`, `role`, `description`
- [ ] `id` matches `^[a-z0-9-]+$` and does not collide with existing agents in `.agent-teams/agents/`
- [ ] All `intents` match `^[a-z0-9_]+$` (snake_case)
- [ ] Optimization rules applied: `claude_model`, `claude_max_turns`, `output.mode`, `output.max_items`, `output.never_include`
- [ ] Role field restrictions applied (Section 3)
- [ ] Tools match topology rules (Section 4) — workers and orchestrators include `engram/*`; no `engram.mode` field used
- [ ] `context_packs` IDs verified against available packs; if none available, field omitted
- [ ] All agent IDs referenced in `handoffs` exist in `.agent-teams/agents/` or in the proposed team
- [ ] No circular delegation chains
- [ ] No custom `workflow` unless role base is genuinely inadequate; if set, minimum steps only
