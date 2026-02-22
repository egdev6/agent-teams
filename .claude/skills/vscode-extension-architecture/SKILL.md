---
name: vscode-extension-architecture
description: Architect and refactor VS Code extensions with safe command registration, activation events, disposables, panel lifecycle, webview security, and packaging. Use when changing packages/extension entrypoints, commands, panels, router, or manifest contributions.
---

# VS Code Extension Architecture

Use this skill for structural changes in `packages/extension`.

## Workflow

1. Validate extension entrypoint and activation assumptions in `packages/extension/src/extension.ts` and `packages/extension/package.json`.
2. Enforce one-time command registration and correct disposal ownership.
3. Confirm panel lifecycle behavior (create/reveal/dispose) and avoid leaked listeners.
4. Validate webview security basics: least privileges, sanitized message handling, conservative resource exposure.
5. Verify build/package scripts still produce `dist/extension.js`.

## Guardrails

- Keep command IDs stable unless explicitly migrating all call sites.
- Fail fast with explicit user-facing errors for invalid command state.
- Prefer explicit typed boundaries between command handlers and service modules.
- Keep routing logic centralized in `src/router.ts` or one clear owner.

