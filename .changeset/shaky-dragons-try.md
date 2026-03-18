---
"agent-teams": patch
"@agent-teams/webviews": patch
"@agent-teams/core": patch
"@agent-teams/cli": patch
---

### Fix: editing an agent now loads all its settings correctly

Opening an agent for editing from the Manage Agents page now correctly pre-fills every field — role, domain, intents, skills, context packs, targets, scope, and workflow steps. Previously those would appear empty or reset to defaults, forcing users to re-enter their configuration from scratch.

This also covers agents that were imported from the registry rather than created locally: the wizard now loads their data from the catalog and, on save, creates a local spec file automatically so edits are persisted.

### Fix: agent cards in Manage Agents now show description, intents, and teams

Agent cards were showing only the agent name and role. Description, intent tags, and team membership badges are now visible immediately when the page loads, without needing to open the agent first.

The dashboard footer also now shows the actual installed extension version instead of a hardcoded placeholder.

### Fix: workflow steps are now editable for all agent types

The "Workflow Steps" editor in the wizard was only shown for orchestrator and router agents. Worker agents use workflow steps too (they are included in the generated prompt), but the section was hidden. All roles can now view and edit their workflow steps.

### Permissions and tools stay in sync automatically

The wizard now keeps permissions and tools consistent as you configure an agent:

- Enabling **can edit files** or **can create files** automatically adds the `edit/editFiles` tool. Disabling both removes it.
- The **Delegates to** field is now greyed out when `can_delegate` is off, making it clear it has no effect.
- Workers and routers have their key permissions locked on by default since removing them would break core functionality.

### Improved empty state for the Skills section

When an agent has no skills assigned yet, both the Create and Edit agent pages now show a proper empty state with an icon, a short description, and a **Browse registry** button, instead of a plain text hint.

### MCP Servers section in the agent wizard

A new collapsible **MCP Servers** section in the Workflow & Tools step lets you declare which MCP servers an agent depends on (id, command, args, and env vars). On sync, those servers are automatically merged into your workspace MCP config file and listed in the generated agent prompt.

### Smaller VSIX and faster webview load times

- The packaged extension is lighter: source maps are only generated during development, and pre-compressed asset files that VS Code cannot serve are no longer produced.
- The webview now splits its JavaScript into separate vendor chunks (React, Radix UI, icons), so the browser can cache dependencies independently and pages load faster after the first visit.

### Fix: agent version is preserved when editing

Saving an edited agent no longer resets the `version` field to `1.0.0`. The wizard now loads the existing version from the spec and writes it back unchanged.

### Fix: deleting an agent now waits for confirmation before navigating

Clicking **Delete Agent** previously sent the delete request and immediately navigated back to the agent list, so if the user cancelled the confirmation dialog they were left on the list with no feedback. The UI now waits for the extension to confirm (or cancel) before navigating, and shows any deletion error inline.

### Fix: Save button explains why it is disabled

When the **Save Changes** (or **Create Agent**) button is greyed out, hovering it now shows a concise tooltip explaining which field needs to be filled — e.g. _"Add at least one workflow step"_. This is especially noticeable when editing agents imported from the registry that arrive without workflow steps.

### Fix: editing an imported agent pre-fills default tools when none are declared

Opening an agent imported from the registry that has no `tools` entries now pre-populates the Tools section with the role-appropriate defaults (the same ones the Create wizard would add), so users start from a sensible baseline instead of a blank list.

### Fix: invalid MCP server env JSON is caught before saving

Entering malformed JSON in the **Env** field of an MCP server entry and clicking Save used to silently discard the value. It now shows an inline error and blocks the save until the JSON is corrected.


