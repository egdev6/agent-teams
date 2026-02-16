/**
 * Tests for AgentRouter
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AgentRouter } from '@extension/router';
import { AgentLoader } from '@extension/agentLoader';
import { Logger } from '@extension/logger';
import { AgentSpec } from '@extension/types';

describe('AgentRouter', () => {
  let router: AgentRouter;
  let mockLoader: AgentLoader;
  let mockLogger: Logger;

  const createMockAgent = (
    id: string,
    domain: string,
    intents: string[],
    keywords: string[] = [],
    pathGlobs: string[] = []
  ): AgentSpec => ({
    name: `${id} Agent`,
    description: `Test agent for ${domain}`,
    _metadata: {
      id,
      role: 'worker' as const,
      domain,
      intents,
      keywords,
      path_globs: pathGlobs,
    },
  });

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLogLevel: vi.fn(),
    } as any;

    mockLoader = {
      getAllAgents: vi.fn(),
      getAgent: vi.fn(),
      getAgentsByRole: vi.fn(),
      getAgentsByDomain: vi.fn(),
    } as any;

    router = new AgentRouter(mockLoader, mockLogger);
  });

  describe('route', () => {
    it('should route by intent matching', async () => {
      const testAgent = createMockAgent('tester', 'testing', ['testing', 'bug_fix']);
      const backendAgent = createMockAgent('backend', 'backend', ['api_design', 'db_migration']);

      vi.mocked(mockLoader.getAllAgents).mockReturnValue([testAgent, backendAgent]);
      (mockLoader.getAgent as Mock).mockImplementation((id: string) => {
        if (id === 'tester') return testAgent;
        if (id === 'backend') return backendAgent;
        return null;
      });

      // Prompt contains keywords that match testing intent
      const result = await router.route('Run tests and fix the bug');

      expect(result).toBeDefined();
      expect(result?._metadata.id).toBe('tester');
    });

    it('should route by keyword matching', async () => {
      const testAgent = createMockAgent('tester', 'testing', ['testing'], ['vitest', 'jest',  'testing']);
      const backendAgent = createMockAgent('backend', 'backend', ['api_design'], ['express', 'fastify']);

      vi.mocked(mockLoader.getAllAgents).mockReturnValue([testAgent, backendAgent]);
      (mockLoader.getAgent as Mock).mockImplementation((id: string) => {
        if (id === 'tester') return testAgent;
        if (id === 'backend') return backendAgent;
        return null;
      });

      const result = await router.route('Fix the vitest configuration');

      expect(result).toBeDefined();
      expect(result?._metadata.id).toBe('tester');
    });

    it('should route by path matching', async () => {
      const frontendAgent = createMockAgent(
        'frontend',
        'frontend',
        ['component_creation'],
        [],
        ['src/components/**']
      );
      const backendAgent = createMockAgent(
        'backend',
        'backend',
        ['api_design'],
        [],
        ['src/api/**']
      );

      vi.mocked(mockLoader.getAllAgents).mockReturnValue([frontendAgent, backendAgent]);
      (mockLoader.getAgent as Mock).mockImplementation((id: string) => {
        if (id === 'frontend') return frontendAgent;
        if (id === 'backend') return backendAgent;
        return null;
      });

      const result = await router.route(
        'Create a new component',
        'src/components/Button.tsx'
      );

      expect(result).toBeDefined();
      expect(result?._metadata.id).toBe('frontend');
    });

    it('should return null when no agents match', async () => {
      const testAgent = createMockAgent('tester', 'testing', ['testing']);

      vi.mocked(mockLoader.getAllAgents).mockReturnValue([testAgent]);

      const result = await router.route('Something completely unrelated');

      expect(result).toBeNull();
    });

    it('should prefer exact domain match', async () => {
      const specificAgent = createMockAgent('specific', 'frontend', ['component_creation']);
      const globalAgent = createMockAgent('global', 'global', ['component_creation']);

      vi.mocked(mockLoader.getAllAgents).mockReturnValue([specificAgent, globalAgent]);
      (mockLoader.getAgent as Mock).mockImplementation((id: string) => {
        if (id === 'specific') return specificAgent;
        if (id === 'global') return globalAgent;
        return null;
      });

      const result = await router.route('Create a component');

      expect(result).toBeDefined();
      expect(result?._metadata.id).toBe('specific');
      expect(result?._metadata.domain).not.toBe('global');
    });
  });

  describe('getSuggestions', () => {
    it('should return top scoring agents', async () => {
      const agents = [
        createMockAgent('tester', 'testing', ['testing', 'bug_fix']),
        createMockAgent('backend', 'backend', ['api_design']),
        createMockAgent('frontend', 'frontend', ['component_creation']),
      ];

      vi.mocked(mockLoader.getAllAgents).mockReturnValue(agents);

      const suggestions = await router.getSuggestions('Run tests and fix bugs');

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].score).toBeGreaterThan(0);
      // First suggestion should be the tester (best match)
      expect(suggestions[0].agentId).toBe('tester');
    });

    it('should return at most 5 suggestions', async () => {
      const agents = Array.from({ length: 10 }, (_, i) =>
        createMockAgent(`agent${i}`, 'generic', ['testing'])
      );

      vi.mocked(mockLoader.getAllAgents).mockReturnValue(agents);

      const suggestions = await router.getSuggestions('test something');

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should filter out zero-score agents', async () => {
      const agents = [
        createMockAgent('relevant', 'testing', ['testing']),
        createMockAgent('irrelevant', 'other', ['something']),
      ];

      vi.mocked(mockLoader.getAllAgents).mockReturnValue(agents);

      const suggestions = await router.getSuggestions('run tests');

      // Should only include agents with score > 0
      expect(suggestions.every((s: any) => s.score > 0)).toBe(true);
    });
  });
});
