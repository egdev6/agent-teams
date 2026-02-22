---
name: agent-teams-domain-conventions
description: Apply project-specific conventions for agents, teams, kits, profiles, and sync flows. Use when changing schema validation, generation pipelines, or filesystem sync behavior across core, extension, and cli packages.
---

# Agent Teams Domain Conventions

Use this skill for domain logic changes.

## Workflow

1. Identify affected domain object: agent, team, kit, profile, or sync artifact.
2. Validate schema and serialization expectations in `packages/core`.
3. Align extension orchestration and CLI commands with the same domain rules.
4. Keep naming and path conventions stable for `.github` sync flows.
5. Verify backward compatibility when evolving config shapes.

## Guardrails

- Centralize schema truth in core whenever possible.
- Keep domain terms consistent across package boundaries.
- Avoid silent migrations; surface explicit upgrade/fallback behavior.

