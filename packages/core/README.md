# @agent-teams/core

Core utilities, types and shared logic for Agent Teams monorepo.

## Purpose

This package provides:
- **Types**: Common TypeScript interfaces for agents, kits, teams, and profiles
- **Schemas**: References to JSON schema files for validation
- **Utils**: Shared utility functions (YAML parsing, object merging, etc.)

## Usage

This is a private workspace package used by:
- `@agent-teams/cli` - Command-line interface
- `@agent-teams/extension` - VS Code extension
- `@agent-teams/webviews` - React webviews UI

Import from other packages:

```typescript
import { Agent, Kit, loadYamlFile, SCHEMA_PATHS } from '@agent-teams/core';
```

## Structure

```
src/
  ├── index.ts           # Main entry point
  ├── types/             # TypeScript types and interfaces
  ├── schemas/           # Schema path references
  └── utils/             # Common utility functions
```

## Build

```bash
pnpm build
```

Compiles TypeScript to `dist/` with type declarations.
