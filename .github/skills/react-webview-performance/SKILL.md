---
name: react-webview-performance
description: Optimize React webviews for VS Code constraints. Use when improving render cost, bundle size, route transitions, message-driven updates, or startup time in packages/webviews.
---

# React Webview Performance

Use this skill for performance-oriented work in `packages/webviews`.

## Workflow

1. Identify hot paths: initial render, route change, and message-triggered re-renders.
2. Reduce unnecessary renders with stable props and clear state ownership.
3. Trim bundle overhead and validate output strategy in `vite.config.ts`.
4. Verify navigation and page boundaries avoid expensive global updates.
5. Re-check behavior in production build output, not only dev mode.

## Guardrails

- Optimize measured bottlenecks first.
- Keep transport/state boundaries explicit to avoid cascading renders.
- Favor simple, maintainable optimizations over premature micro-tuning.

