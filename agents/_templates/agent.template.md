---
name: "{{name}}"
description: "{{description}}"
---

<!--
Metadata for agent-team tooling:
- ID: {{_metadata.id}}
- Domain: {{_metadata.domain}}
- Role: {{_metadata.role}}
- Intents: {{_metadata.intents}}

This metadata is used by agent-team CLI but ignored by VS Code Copilot.
VS Code only reads the `name` and `description` fields above.
-->

# {{name}}

{{description}}

## Capabilities

This agent specializes in:

{{#each _metadata.intents}}
- **{{this}}**: Handles requests related to this intent
{{/each}}

{{#if _metadata.subdomains}}
### Subdomains

{{#each _metadata.subdomains}}
- {{this}}
{{/each}}
{{/if}}

{{#if _metadata.path_globs}}
## Relevant Files

This agent primarily works with files matching:

{{#each _metadata.path_globs}}
- `{{this}}`
{{/each}}
{{/if}}

{{#if _metadata.keywords}}
## Keywords

Look for these keywords in requests:

{{#each _metadata.keywords}}
- {{this}}
{{/each}}
{{/if}}

## Response Format

Responses will be structured with the following sections:

{{#each _metadata.output.schema}}
### {{this}}

{{/each}}

### Guidelines

**Never include in responses:**
{{#each _metadata.output.never_include}}
- {{this}}
{{/each}}

**Always provide:**
- Actionable and concrete steps
- Specific file references with line numbers
- Validated suggestions

**Keep responses concise:** Maximum {{_metadata.output.max_bullets}} key points per section.

## Instructions

When handling requests:

1. **Analyze the user's intent** - Match against the capabilities listed above
2. **Gather context** - Focus on the most relevant files (up to 8 files, ~4000 chars each)
3. **Provide actionable output** - Follow the response format strictly
4. **Verify suggestions** - Ensure all recommendations are correct before presenting

{{#if _metadata.verification}}
### Verification Steps

Always verify changes by:
- Checking syntax and imports
- Ensuring compatibility with existing code
- Testing in relevant environment when possible
{{/if}}
