# Change Log

All notable changes to the "agent-team" extension will be documented in this file.

## [0.1.0] - 2024-01-XX

### Added
- Initial release
- Chat Participants for each agent (@backend-agent, @frontend-agent, etc.)
- Intelligent router participant (@router)
- Intent-based agent selection
- Path-glob matching for context-aware routing
- Keyword matching system
- Agent orchestration capabilities
- Configuration options for routing behavior
- Reload agents command
- Manual agent selection picker
- Debug logging to Output panel

### Features
- Automatic agent loading from `.github/agents/` directory
- Support for agent metadata in HTML comments
- VS Code-compatible agent format (name + description frontmatter)
- Scoring system that ranks agents by relevance
- Parallel delegation for orchestrators
- Response aggregation from multiple agents

### Supported
- Intent detection from natural language
- Path-based agent activation
- Domain-specific keyword matching
- Dynamic participant registration
- Configuration hot-reloading
