# Agent Teams CLI

Command-line interface for managing Agent Teams.

## Installation

```bash
# From monorepo root
pnpm install

# Build CLI
pnpm build:cli
```

## Usage

```bash
# Run from monorepo root
pnpm agents [command]

# Or directly
cd packages/cli
pnpm start [command]
```

## Commands

- `init` - Initialize Agent Teams in your project
- `create` - Create a new agent
- `validate` - Validate agent specifications
- `sync` - Sync agents to .github/ folder
- `watch` - Watch for agent changes and auto-sync

## Development

```bash
# Watch mode
pnpm dev

# Build
pnpm build
```

## Migration Note

This package was extracted from the root `tools/` directory to provide better separation between CLI and VSCode Extension functionality.

Legacy tools will be moved here incrementally:
- ✅ CLI structure created
- ⏳ Migrate cli.ts
- ⏳ Migrate create-agent.ts
- ⏳ Migrate validate-agent.ts
- ⏳ Migrate sync-agents.ts
- ⏳ Migrate watch-agents.ts
