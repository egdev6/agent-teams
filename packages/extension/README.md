# Agent Team Extension

Multi-agent system with intelligent routing and orchestration for GitHub Copilot in VS Code.

## Features

### ✨ Intelligent Agent Routing

- **Intent Detection**: Automatically detects user intent from natural language
- **Path-Based Activation**: Routes based on current file and workspace context  
- **Keyword Matching**: Identifies relevant agents by domain-specific keywords
- **Smart Scoring**: Ranks agents by relevance to your request

### 🎯 Multiple Invocation Methods

1. **Automatic Routing** (`@router`):
   ```
   @router create a REST API endpoint for users
   ```
   The router analyzes your request and delegates to the best agent.

2. **Direct Invocation**:
   ```
   @backend-agent implement authentication middleware
   @frontend-agent create a responsive navbar component
   ```

3. **Manual Selection** (Command Palette):
   - `Agent Team: Select Agent Manually`

### 🔀 Orchestration Support

- Parallel task delegation
- Multi-agent coordination
- Response aggregation

## Getting Started

### Installation

1. Install the extension from the VS Code marketplace
2. Ensure your workspace has agents in `.github/agents/`
3. Reload VS Code

### Configuration

```json
{
  "agentTeams.agentsPath": ".github/agents",
  "agentTeams.enableAutoRouting": true,
  "agentTeams.enablePathMatching": true,
  "agentTeams.logLevel": "info"
}
```

### Usage Examples

**Automatic routing:**
```
@router optimize database queries in the user service
```

**Backend tasks:**
```
@backend-agent add validation to the signup endpoint
```

**Frontend tasks:**
```
@frontend-agent implement dark mode toggle
```

## Commands

- `Agent Team: Reload Agents` - Reload agents from workspace
- `Agent Team: Select Agent Manually` - Pick an agent from a list

## Requirements

- VS Code 1.85.0 or later
- GitHub Copilot extension

## Agent Format

Agents must follow this format:

```markdown
---
name: "Agent Name"
description: "What this agent does"
---

<!--
Metadata for agent-team tooling:
- ID: agent-id
- Domain: domain-name
- Role: worker
- Intents: intent1, intent2
-->

# Instructions

Your agent instructions here...
```

## Troubleshooting

**Agents not loading?**
- Check the Output panel (Agent Team) for errors
- Verify agents exist in `.github/agents/`
- Run `Agent Team: Reload Agents` command

**Routing not working?**
- Enable auto-routing in settings
- Check detected intents in output panel (set log level to debug)

## License

MIT
