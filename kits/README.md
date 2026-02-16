# Agent Kits

Kits are reusable agent bundles that can be imported into any project. Each kit provides pre-configured agents with placeholders that are resolved using project-specific configuration.

## Structure

```
kits/
├── testing-vitest/
│   ├── kit.yml                    # Kit manifest
│   ├── agents/
│   │   ├── vitest-worker.yml      # Agent specs with placeholders
│   │   └── test-orchestrator.yml
│   └── context-packs/
│       ├── testing-patterns.md
│       └── vitest-best-practices.md
└── [other-kits]/
```

## Kit Manifest (kit.yml)

Every kit must include a `kit.yml` manifest:

```yaml
id: testing-vitest
name: Vitest Testing Kit
version: 1.0.0
author: Your Name
license: MIT

# Technical requirements
requires:
  technologies: [vitest, typescript]
  min_core_version: 1.0.0

# Agent IDs this kit provides
provides:
  agents:
    - vitest-worker
    - test-orchestrator
  skills:
    - run_tests
    - analyze_coverage
  context_packs:
    - testing-patterns
    - vitest-best-practices

# Default values for agent configuration
defaults:
  output_mode: short+diff
  max_files: 8
  max_chars_per_file: 8000

# Placeholders used by this kit
placeholders:
  paths:
    - tests_root      # Path to test directory
    - frontend_root   # Path to frontend code
  commands:
    - test            # Test command
    - test_coverage   # Coverage command
    - test_watch      # Watch mode command
```

## Agent Specs with Placeholders

Kit agents use `{{placeholder}}` syntax:

```yaml
name: Vitest Worker
description: Test execution specialist

path_globs:
  - "{{paths.tests_root}}/**/*.test.ts"
  - "{{paths.frontend_root}}/**/*.tsx"
  - "!**/node_modules/**"

commands:
  - name: Run Tests
    command: "{{commands.test}}"
  - name: Coverage
    command: "{{commands.test_coverage}}"

_metadata:
  context:
    role: worker
    skills: [file_edit, run_terminal, run_tests]
    packs:
      - project:architecture    # Resolved from project
      - kit:testing-patterns    # Resolved from kit
```

## Placeholder Types

### Path Placeholders (`{{paths.*}}`)
- `{{paths.tests_root}}` → `.agent-team/project.profile.yml` → `./tests`
- `{{paths.src}}` → `./src`
- `{{paths.frontend_root}}` → `./src`

### Command Placeholders (`{{commands.*}}`)
- `{{commands.test}}` → `pnpm test`
- `{{commands.build}}` → `pnpm build`
- `{{commands.dev}}` → `pnpm dev`

### Project Placeholders (`{{project.*}}`)
- `{{project.id}}` → `my-web-app`
- `{{project.name}}` → `My Web Application`
- `{{project.version}}` → `1.0.0`

## Context Packs

Context packs provide domain knowledge to agents:

### Kit Context Packs
Located in `kits/{kit-id}/context-packs/`:
- `testing-patterns.md` - Generic testing patterns
- `vitest-best-practices.md` - Tool-specific guidance

Referenced as: `kit:testing-patterns`

### Project Context Packs
Located in `.agent-team/context-packs/`:
- `architecture.md` - Project architecture
- `conventions.md` - Project conventions

Referenced as: `project:architecture`

## Creating a Kit

1. **Create kit directory:**
   ```bash
   mkdir -p kits/my-kit/agents
   mkdir -p kits/my-kit/context-packs
   ```

2. **Create kit.yml:**
   ```yaml
   id: my-kit
   name: My Kit
   version: 1.0.0
   provides:
     agents: [my-agent]
   ```

3. **Create agents with placeholders:**
   ```yaml
   # kits/my-kit/agents/my-agent.yml
   name: My Agent
   path_globs:
     - "{{paths.src}}/**/*.ts"
   ```

4. **Create context packs:**
   ```markdown
   # kits/my-kit/context-packs/my-patterns.md
   # My Patterns
   ...
   ```

## Using Kits in Projects

### 1. Initialize Project Profile
```bash
cd my-project
agent-team profile:init \\
  --id my-app \\
  --name "My Application" \\
  --type frontend
```

### 2. Configure Profile
Edit `.agent-team/project.profile.yml`:
```yaml
paths:
  tests_root: ./tests
  src: ./src

commands:
  test: pnpm test
  build: pnpm build

technologies:
  vitest: true
  typescript: true
```

### 3. Create Team
```bash
agent-team team:create \\
  --id dev-team \\
  --name "Development Team" \\
  --kits testing-vitest,my-kit
```

### 4. Sync Team
```bash
agent-team team:sync --team dev-team
# Generates agents to .github/agents/
```

## Composition Flow

```
Kit Agent Spec (with placeholders)
  ↓
+ Project Profile (placeholder values)
  ↓
= Resolved placeholders
  ↓
+ Kit Defaults (if values missing)
  ↓
+ Project Overrides (project-level customization)
  ↓
+ Team Overrides (team-specific tweaks)
  ↓
= Final Agent Spec (.github/agents/my-agent.yml)
```

## Benefits

✅ **Reusability:** Write once, use across projects
✅ **Maintainability:** Update kit, all projects benefit
✅ **Consistency:** Same agent behavior across teams
✅ **Customization:** Project overrides for specific needs
✅ **Versioning:** Lock kit versions per project
✅ **Discoverability:** Browse available kits and agents

## Available Kits

- **testing-vitest** (v1.0.0) - Vitest testing workers and orchestrator

More kits coming soon! Contribute kits via pull requests.
