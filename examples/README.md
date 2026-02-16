# Agent Examples

This directory contains example agent specifications to help you get started.

## Using Examples

### Option 1: VS Code Extension (Recommended)

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run: **Agent Team: Create New Agent**
3. Follow the interactive wizard

### Option 2: Use Example as Template

1. Copy an example spec to your project's `specs/` directory:
   ```bash
   mkdir specs
   cp examples/test-agent.yml specs/my-agent.yml
   ```

2. Edit the spec with your requirements

3. Generate the agent:
   - Via extension: Right-click on `.yml` → **Agent Team: Generate Agent from Spec**
   - Via CLI: `pnpm agents:create --spec specs/my-agent.yml`

## Example: Test Agent

**File:** [test-agent.yml](test-agent.yml)

A basic testing agent that handles:
- Unit test creation
- Integration test creation
- Test debugging
- Test file modifications

**Configuration Highlights:**
- Role: `worker` (specialized task agent)
- Domain: `testing`
- Intents: `unit_testing`, `integration_testing`, `test_creation`, `test_debugging`
- Path globs: Activates for `*.test.ts`, `*.spec.ts`, `tests/**/*`
- Skills: `file_edit`, `file_create`, `search_codebase`, `run_terminal`
- Context: 8 files, 8K chars per file (~2K tokens)
- Output: `short+diff` mode (concise + code changes)

## Creating Your Own Agents

### Step 1: Define Identity

```yaml
_metadata:
  id: "my-agent"           # Slug identifier (no @)
  role: "worker"           # worker | orchestrator | router
  domain: "backend"        # backend | frontend | testing | devops | docs
```

### Step 2: Configure Routing

```yaml
  intents:                 # For auto-routing
    - "api_design"
    - "endpoint_creation"
  
  path_globs:              # Activate when these files are open
    - "src/api/**/*.ts"
    - "src/controllers/**"
  
  keywords:                # Intent detection keywords
    - "api"
    - "endpoint"
```

### Step 3: Set Limits

```yaml
  context:
    max_files: 8           # How many files to include in context
    max_chars_per_file: 8000  # ~2K tokens per file
  
  output:
    mode_default: "short+diff"  # short+diff | diff | plan | structured
```

### Step 4: Define Skills

```yaml
  skills:
    allowed:
      - "file_edit"        # Edit existing files
      - "file_create"      # Create new files
      - "search_codebase"  # Search workspace
      - "run_terminal"     # Execute commands
```

## Best Practices

### Token Discipline
- **Default:** 8K chars per file = ~2K tokens (safe for most LLMs)
- **Heavy context:** 12K-16K chars if needed (document why)
- **Never:** 100K chars (that's 25K tokens!)

### Routing Configuration
- **Intents:** 4-8 specific intents (avoid generic ones)
- **Path globs:** Use specific patterns, not `**/*`
- **Keywords:** 5-10 domain-specific terms

### Role Selection
- **worker:** 90% of agents (specialized tasks)
- **orchestrator:** Complex multi-step workflows
- **router:** Usually only 1 per project (intent-based routing)

### Output Modes
- **short+diff:** Best default (concise + code)
- **diff:** Code changes only (no explanation)
- **plan:** Planning mode (no code)
- **structured:** Bullet lists (good for documentation)

## Agent Types by Domain

### Backend Agents
- **API Agent:** REST/GraphQL endpoints
- **Database Agent:** Schemas, migrations, queries
- **Auth Agent:** Authentication, authorization

### Frontend Agents
- **Component Agent:** UI components
- **State Agent:** State management
- **Style Agent:** CSS, styling, theming

### Testing Agents
- **Unit Test Agent:** Unit tests
- **Integration Test Agent:** Integration tests
- **E2E Test Agent:** End-to-end tests

### DevOps Agents
- **CI/CD Agent:** GitHub Actions, pipelines
- **Docker Agent:** Dockerfiles, compose
- **Deploy Agent:** Deployment scripts

### Documentation Agents
- **API Docs Agent:** OpenAPI, Swagger
- **README Agent:** Project documentation
- **Tutorial Agent:** Tutorials, guides

## Next Steps

1. **Read:** [Main README](../README.md) for complete documentation
2. **Explore:** [docs/architecture.md](../docs/architecture.md) for system design
3. **Create:** Use the wizard to create your first agent
4. **Iterate:** Test, adjust context limits, refine intents

## Questions?

- **Architecture:** [docs/architecture.md](../docs/architecture.md)
- **Conventions:** [docs/conventions.md](../docs/conventions.md)
- **Routing:** [docs/routing.md](../docs/routing.md)
- **Delegation:** [docs/delegation.md](../docs/delegation.md)
