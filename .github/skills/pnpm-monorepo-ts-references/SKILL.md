---
name: pnpm-monorepo-ts-references
description: Maintain pnpm workspace and TypeScript project references in a multi-package monorepo. Use when changing build order, package scripts, tsconfig references, path aliases, or cross-package imports.
---

# pnpm Monorepo TS References

Use this skill for cross-package changes.

## Workflow

1. Confirm workspace topology from `pnpm-workspace.yaml` and root `tsconfig.json` references.
2. Update package-level `tsconfig.json` references and aliases consistently.
3. Keep build order valid: core first, then dependent packages.
4. Ensure scripts in root and package manifests stay aligned.
5. Run typecheck/build paths impacted by the changed reference graph.

## Guardrails

- Prefer workspace dependencies (`workspace:*`) for internal packages.
- Avoid introducing circular project references.
- Keep `dist/` outputs isolated per package.

