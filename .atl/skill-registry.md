# Skill Registry

**Project**: agent-teams
**Generated**: 2026-03-31
**Sources**: `~/.config/opencode/skills/` (user-level)

---

## User Skills

### issue-creation
- **Trigger**: When creating a GitHub issue, reporting a bug, or requesting a feature
- **Location**: `~/.config/opencode/skills/issue-creation/SKILL.md`
- **Description**: Issue creation workflow following the issue-first enforcement system

### branch-pr
- **Trigger**: When creating a pull request, opening a PR, or preparing changes for review
- **Location**: `~/.config/opencode/skills/branch-pr/SKILL.md`
- **Description**: PR creation workflow following the issue-first enforcement system

### skill-creator
- **Trigger**: When user asks to create a new skill, add agent instructions, or document patterns for AI
- **Location**: `~/.config/opencode/skills/skill-creator/SKILL.md`
- **Description**: Creates new AI agent skills following the Agent Skills spec

### go-testing
- **Trigger**: When writing Go tests, using teatest, or adding test coverage
- **Location**: `~/.config/opencode/skills/go-testing/SKILL.md`
- **Description**: Go testing patterns including Bubbletea TUI testing

### judgment-day
- **Trigger**: When user says "judgment day", "review adversarial", "dual review", "juzgar"
- **Location**: `~/.config/opencode/skills/judgment-day/SKILL.md`
- **Description**: Parallel adversarial review protocol with two blind judge sub-agents

---

## Project Conventions

### Agent Config
- **File**: `AGENTS.md` (project root)
- **Content**: Agent Teams Protocol, AgentSpec schema, delegation via Engram, composition pipeline, workflow resolution, MCP server merge behaviour

### Agent Definitions
- **Directory**: `.agent-teams/` — agents/, teams/, context-packs/, project.profile.yml, bindings.yml
- **Claude Agents**: `.claude/agents/agent-designer.md` (worker)

### Skills Registry (native)
- **File**: `skills.registry.yml` — defines file operations, code analysis, execution, browser, database, documentation, git, deployment, specialized skills

---

## Compact Rules

### PR & Issue Workflow
- Issues MUST be created before PRs (issue-first enforcement)
- PRs require linked issues
- Conventional Commits format enforced by commitlint

### Code Standards
- Biome for linting + formatting (2-space indent, single quotes, semicolons, 100 line width)
- TypeScript strict mode, `tsc --noEmit` required
- `noUnusedVariables: error`, `noUnusedImports: error`, `useImportType: error`

### Testing
- vitest for unit tests (core, extension packages)
- @playwright/test for E2E (webviews package)
- Run `pnpm test` for unit, `pnpm test:e2e` for E2E

### Git Hooks (Lefthook)
- Pre-commit: biome check (auto-fix) + typecheck
- Pre-push: full build
- Commit-msg: conventional commits validation
