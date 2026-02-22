---
name: release-and-publish-vscode
description: Prepare and validate VS Code extension release and publish readiness. Use when updating publisher metadata, icon/assets, package version, changelog, prepublish checks, and vsce packaging.
---

# Release And Publish VS Code

Use this skill during release preparation for `packages/extension`.

## Workflow

1. Validate manifest metadata (`publisher`, `version`, `icon`, engines, categories).
2. Ensure build and prepublish scripts are reproducible from clean state.
3. Verify packaged output contains expected extension and webview artifacts.
4. Confirm changelog/version alignment and commit policy compliance.
5. Run a final packaging check before publish actions.

## Guardrails

- Treat missing release assets as blockers.
- Do not publish with placeholder metadata.
- Keep release steps scripted and repeatable.

