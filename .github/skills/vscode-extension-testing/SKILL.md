---
name: vscode-extension-testing
description: Define and implement testing strategy for VS Code extension, React webviews, and CLI integration points. Use when adding tests for commands, message contracts, routing behavior, and packaging-critical paths.
---

# VS Code Extension Testing

Use this skill when introducing or refactoring tests.

## Workflow

1. Map behaviors by boundary: extension commands, webview contract, CLI orchestration.
2. Prioritize contract tests for host-webview messages and command side effects.
3. Add focused unit tests for pure logic; avoid UI snapshot-heavy suites.
4. Keep fixtures minimal and close to test intent.
5. Ensure test config aligns with current TypeScript and Vitest setup.

## Guardrails

- Test observable behavior, not private implementation details.
- Keep tests deterministic and side-effect isolated.
- Add regression tests for every fixed bug touching routing or messaging.

