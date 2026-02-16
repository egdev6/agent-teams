/**
 * Tests for AgentLoader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentLoader } from '@extension/agentLoader';
import { Logger } from '@extension/logger';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('AgentLoader', () => {
  let loader: AgentLoader;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLogLevel: vi.fn(),
    } as any;

    loader = new AgentLoader(mockLogger);
    vi.clearAllMocks();
  });

  describe('loadAgents', () => {
    it('should load agents from directory', async () => {
      const mockWorkspaceRoot = '/mock/workspace';
      const mockAgentsPath = '.github/agents';
      const fullPath = path.join(mockWorkspaceRoot, mockAgentsPath);

      // Mock fs.existsSync
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock fs.readdirSync to return agent files
      vi.mocked(fs.readdirSync).mockReturnValue([
        'agent1.agent.md',
        'agent2.agent.md',
        'not-an-agent.txt',
      ] as any);

      // Mock fs.readFileSync to return agent content
      vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
        if (filePath.includes('agent1.agent.md')) {
          return `---
name: Test Agent 1
description: Test description 1
---

<!-- Metadata for agent-team tooling:
- ID: agent1
- Domain: testing
- Role: worker
- Intents: test, debug
-->

Instructions here`;
        }
        if (filePath.includes('agent2.agent.md')) {
          return `---
name: Test Agent 2
description: Test description 2
---

<!-- Metadata for agent-team tooling:
- ID: agent2
- Domain: coordination
- Role: orchestrator
- Intents: coordinate, delegate
-->

Instructions here`;
        }
        return '';
      });

      await loader.loadAgents(mockWorkspaceRoot, mockAgentsPath);

      const agents = loader.getAllAgents();
      expect(agents).toHaveLength(2);
      expect(agents[0]._metadata.id).toBe('agent1');
      expect(agents[1]._metadata.id).toBe('agent2');
    });

    it('should handle missing agents directory', async () => {
      const mockWorkspaceRoot = '/mock/workspace';
      const mockAgentsPath = '.github/agents';

      vi.mocked(fs.existsSync).mockReturnValue(false);

      await loader.loadAgents(mockWorkspaceRoot, mockAgentsPath);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Agents directory not found')
      );
      expect(loader.getAllAgents()).toHaveLength(0);
    });

    it('should skip invalid agent files', async () => {
      const mockWorkspaceRoot = '/mock/workspace';
      const mockAgentsPath = '.github/agents';

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'valid.agent.md',
        'invalid.agent.md',
      ] as any);

      vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
        if (filePath.includes('valid')) {
          return `---
name: Valid Agent
description: Valid
---

<!-- Metadata for agent-team tooling:
- ID: valid
- Domain: test
- Role: worker
- Intents: test
-->

Instructions`;
        }
        // Invalid agent - No frontmatter
        return `No frontmatter here
Just plain text`;
      });

      await loader.loadAgents(mockWorkspaceRoot, mockAgentsPath);

      const agents = loader.getAllAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0]._metadata.id).toBe('valid');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getAgent', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['agent1.agent.md'] as any);
      vi.mocked(fs.readFileSync).mockReturnValue(`---
name: Test Agent
description: Test
---

<!-- Metadata for agent-team tooling:
- ID: agent1
- Domain: testing
- Role: worker
- Intents: test
-->

Instructions`);

      await loader.loadAgents('/mock', '.github/agents');
    });

    it('should return agent by id', () => {
      const agent = loader.getAgent('agent1');
      expect(agent).toBeDefined();
      expect(agent?._metadata.id).toBe('agent1');
    });

    it('should return undefined for non-existent agent', () => {
      const agent = loader.getAgent('non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('getAgentsByRole', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'worker.agent.md',
        'orchestrator.agent.md',
        'router.agent.md',
      ] as any);

      vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
        if (filePath.includes('worker')) {
          return `---
name: Worker
description: Test
---

<!-- Metadata for agent-team tooling:
- ID: worker
- Domain: test
- Role: worker
- Intents: test
-->
Instructions`;
        }
        if (filePath.includes('orchestrator')) {
          return `---
name: Orchestrator
description: Test
---

<!-- Metadata for agent-team tooling:
- ID: orchestrator
- Domain: test
- Role: orchestrator
- Intents: test
-->
Instructions`;
        }
        return `---
name: Router
description: Test
---

<!-- Metadata for agent-team tooling:
- ID: router
- Domain: test
- Role: router
- Intents: test
-->
Instructions`;
      });

      await loader.loadAgents('/mock', '.github/agents');
    });

    it('should return agents by role', () => {
      const workers = loader.getAgentsByRole('worker');
      expect(workers).toHaveLength(1);
      expect(workers[0]._metadata.role).toBe('worker');

      const orchestrators = loader.getAgentsByRole('orchestrator');
      expect(orchestrators).toHaveLength(1);
      expect(orchestrators[0]._metadata.role).toBe('orchestrator');
    });
  });

  describe('getAgentsByDomain', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'testing.agent.md',
        'backend.agent.md',
      ] as any);

      vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
        if (filePath.includes('testing')) {
          return `---
name: Testing Agent
description: Test
---

<!-- Metadata for agent-team tooling:
- ID: testing
- Domain: testing
- Role: worker
- Intents: test
-->
Instructions`;
        }
        return `---
name: Backend Agent
description: Test
---

<!-- Metadata for agent-team tooling:
- ID: backend
- Domain: backend
- Role: worker
- Intents: api
-->
Instructions`;
      });

      await loader.loadAgents('/mock', '.github/agents');
    });

    it('should return agents by domain', () => {
      const testingAgents = loader.getAgentsByDomain('testing');
      expect(testingAgents).toHaveLength(1);
      expect(testingAgents[0]._metadata.domain).toBe('testing');

      const backendAgents = loader.getAgentsByDomain('backend');
      expect(backendAgents).toHaveLength(1);
      expect(backendAgents[0]._metadata.domain).toBe('backend');
    });
  });
});
