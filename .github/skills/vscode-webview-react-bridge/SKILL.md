---
name: vscode-webview-react-bridge
description: Build and maintain robust host-webview integration for VS Code extension + React webviews. Use when changing message contracts, panel-to-webview communication, navigation handoff, or bootstrapping between packages/extension and packages/webviews.
---

# VS Code Webview React Bridge

Use this skill for coordination changes across `packages/extension` and `packages/webviews`.

## Workflow

1. Define or update typed message contracts first (host -> webview, webview -> host).
2. Keep one transport adapter per side; avoid ad-hoc `postMessage` calls scattered in UI code.
3. Validate route initialization behavior in `packages/webviews/src/dashboard.tsx`.
4. Ensure failure handling for unknown message types and malformed payloads.
5. Verify copy/build chain still ships webviews into `packages/extension/dist/webviews`.

## Guardrails

- Version message schemas when introducing breaking payload changes.
- Keep UI state derivation independent from transport details.
- Do not trust payload shape from the opposite side; validate defensively.

