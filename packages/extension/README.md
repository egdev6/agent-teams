# Agent Teams

**Build, manage and orchestrate AI agent teams for GitHub Copilot — directly inside VS Code.**

Agent Teams lets you define specialized AI agents, group them into reusable kits and teams, and route every Copilot Chat request to the best agent automatically. A fully embedded React dashboard gives you visual control over your entire agent workspace.

---

## Features at a Glance

| | |
|---|---|
| 🤖 **Dynamic Agent Routing** | `@router` classifies intent and delegates to the right agent |
| 🎛️ **Embedded Dashboard** | 12-page React SPA for full visual control |
| 📦 **Kits & Teams System** | Compose reusable agent packs with placeholder templates |
| 🧠 **Context Pack Engine** | Dynamic variable injection into agent instructions |
| 📋 **Skills Registry** | Browse and install community skills from [skills.lc](https://skills.lc) |
| ⚙️ **Merge Engine** | 4 merge strategies, conflict tracking, dry-run diff |
| 💬 **Auto Chat Participants** | Every loaded agent becomes an `@agent-id` participant |

---

## Dashboard

Open the dashboard from the sidebar icon or `Ctrl+Shift+P` → **Agent Teams: Open Dashboard**.

![Dashboard overview](https://agent-teams-docs.netlify.app/img/docs/dashboard-overview.png)

Navigate between pages using the sidebar:

![Dashboard navigation](https://agent-teams-docs.netlify.app/img/docs/dashboard-actions.png)

---

## Quick Start

### 1. Install

Install from the VS Code Marketplace. GitHub Copilot must also be installed.

![Installation step](https://agent-teams-docs.netlify.app/img/docs/installation-vsix.png)

### 2. Initialize your project profile

Open Command Palette → **Agent Teams: Initialize Project Profile**

![Initialize profile](https://agent-teams-docs.netlify.app/img/docs/installation-init-profile.png)

This creates `.agent-teams/project.profile.yml` where you declare your stack, paths, and commands.

### 3. Open the Dashboard

Click the **Agent Teams** icon in the Activity Bar or run **Agent Teams: Open Dashboard**.

![Opening the dashboard](https://agent-teams-docs.netlify.app/img/docs/installation-open-dashboard.png)

### 4. Create your first agent

Dashboard → **Create Agent** — a 6-step wizard guides you through name, domain, intents, skills and rules.

![Agent creation wizard](https://agent-teams-docs.netlify.app/img/docs/agents-forms.png)

---

## Intelligent Routing

Use `@router` in Copilot Chat and let Agent Teams pick the best agent automatically:

```
@router refactor the authentication middleware to use JWT
@router add unit tests for the payment service
@router create a responsive landing page with Tailwind
```

The router scores agents by intent, active file path, keywords, and domain — then delegates the conversation.

You can also call any agent directly:

```
@backend-agent add validation to the signup endpoint
@frontend-agent implement dark mode toggle
@test-orchestrator run the full test suite and summarize failures
```

---

## Kits & Teams

Kits are portable agent packs with placeholder templates. Teams combine kit agents with project-specific overrides.

![Teams overview](https://agent-teams-docs.netlify.app/img/docs/teams-overview.png)

**Create a team:**

```
Command Palette → Agent Teams: Create Team Profile
```

**Sync a team to `.github/agents/`:**

```
Command Palette → Agent Teams: Sync Team to .github/
```

![Teams sync](https://agent-teams-docs.netlify.app/img/docs/teams-sync.png)

---

## Skills Browser

Browse community skills and install them into your project directly from the dashboard.

![Skills browser](https://agent-teams-docs.netlify.app/img/docs/skills-browser-overview.png)

---

## Commands

| Command | Description |
|---|---|
| **Agent Teams: Open Dashboard** | Open the visual control panel |
| **Agent Teams: Initialize Project Profile** | Set up `.agent-teams/project.profile.yml` |
| **Agent Teams: Create Team Profile** | Wizard to create a new team |
| **Agent Teams: Sync Team to .github/** | Push the active team's agents to `.github/agents/` |
| **Agent Teams: Reload Agents** | Reload agents without restarting VS Code |
| **Agent Teams: Select Agent Manually** | Quick-pick from all loaded agents |
| **Agent Teams: Create New Agent** | Open the agent creation wizard |
| **Agent Teams: Generate Agent from Spec** | Generate an agent `.md` from a YAML spec |
| **Agent Teams: Sync Agents to .github/** | Bulk sync all agents to `.github/agents/` |
| **Agent Teams: Open Kit Browser** | Browse and apply available kits |
| **Agent Teams: Capture Workspace into Catalog** | Snapshot workspace into the global catalog |
| **Agent Teams: Export / Import Catalog** | Back up and restore your agent catalog |
| **Agent Teams: Setup Engram Memory** | Configure the Engram memory integration |

You can also right-click any `.yml` file in Explorer → **Agent Teams: Generate Agent from Spec**.

---

## Configuration

```json
{
  // Path to the agents directory (relative to workspace root)
  "agentTeams.agentsPath": ".github/agents",

  // Enable automatic intent-based routing for @router
  "agentTeams.enableAutoRouting": true,

  // Activate agents based on the currently open file path
  "agentTeams.enablePathMatching": true,

  // Extension log level: "debug" | "info" | "warn" | "error"
  "agentTeams.logLevel": "info"
}
```

---

## Agent Format

Every agent is a Markdown file stored in `.github/agents/`:

```markdown
---
name: "Backend API Specialist"
description: "Expert in RESTful API design and implementation"
---

# Instructions

You are a backend specialist. Focus on clean API design,
proper error handling, and RESTful conventions.

## Guidelines
- Use async/await for all async operations
- Always validate request inputs
- Return consistent error shapes
```

Agents can be created manually, via the dashboard wizard, or generated from YAML specs.

---

## Requirements

- VS Code **1.85.0** or later
- **GitHub Copilot** extension

---

## Troubleshooting

**Agents not appearing as chat participants?**
Run **Agent Teams: Reload Agents** from the Command Palette. Check the Output panel (select "Agent Teams") for errors.

**Dashboard not opening?**
Make sure the extension is fully activated. Try running **Agent Teams: Open Dashboard** from the Command Palette.

**Routing not working as expected?**
Set `"agentTeams.logLevel": "debug"` to see routing scores in the Output panel. Ensure agents have descriptive `intents` and `keywords`.

---

## Documentation

Full documentation at **[agent-teams-docs.netlify.app](https://agent-teams-docs.netlify.app)**

- [Installation Guide](https://agent-teams-docs.netlify.app/docs/installation)
- [Dashboard](https://agent-teams-docs.netlify.app/docs/dashboard)
- [Agents](https://agent-teams-docs.netlify.app/docs/agents)
- [Teams](https://agent-teams-docs.netlify.app/docs/teams)
- [Context Packs](https://agent-teams-docs.netlify.app/docs/context-packs)
- [Skills Browser](https://agent-teams-docs.netlify.app/docs/skills-browser)

---

## License

MIT — see [LICENSE](https://github.com/egdev6/agent-teams/blob/main/LICENSE)
