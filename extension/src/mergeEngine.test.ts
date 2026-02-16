/**
 * Tests for MergeEngine - Advanced composition with conflict resolution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MergeEngine } from './mergeEngine';
import { Logger } from './logger';
import { AgentMetadata, AgentOverride } from './types';

describe('MergeEngine', () => {
  let mergeEngine: MergeEngine;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    } as any;
    mergeEngine = new MergeEngine(mockLogger);
  });

  describe('mergeAgentMetadata', () => {
    it('should merge with team-priority strategy', () => {
      const kitMetadata: AgentMetadata = {
        id: 'test-agent',
        role: 'worker',
        domain: 'testing',
        intents: ['test_creation'],
        context: {
          max_files: 5,
          max_chars_per_file: 5000
        }
      };

      const profileOverrides: AgentOverride = {
        context: {
          max_files: 8
        }
      };

      const teamOverrides: AgentOverride = {
        context: {
          max_files: 10,
          max_chars_per_file: 8000
        }
      };

      const result = mergeEngine.mergeAgentMetadata(
        kitMetadata,
        profileOverrides,
        teamOverrides,
        { strategy: 'team-priority' }
      );

      expect(result.value.context?.max_files).toBe(10);
      expect(result.value.context?.max_chars_per_file).toBe(8000);
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should merge with kit-priority strategy', () => {
      const kitMetadata: AgentMetadata = {
        id: 'test-agent',
        role: 'worker',
        domain: 'testing',
        intents: ['test_creation'],
        context: {
          max_files: 5
        }
      };

      const teamOverrides: AgentOverride = {
        context: {
          max_files: 10
        }
      };

      const result = mergeEngine.mergeAgentMetadata(
        kitMetadata,
        undefined,
        teamOverrides,
        { strategy: 'kit-priority' }
      );

      // Kit values should win
      expect(result.value.context?.max_files).toBe(5);
    });

    it('should merge arrays with union strategy', () => {
      const kitMetadata: AgentMetadata = {
        id: 'test-agent',
        role: 'worker',
        domain: 'testing',
        intents: ['test_creation', 'test_debugging'],
        keywords: ['test', 'vitest']
      };

      const teamOverrides: AgentOverride = {
        intents: ['test_creation', 'mock_setup'],
        keywords: ['test', 'mock']
      };

      const result = mergeEngine.mergeAgentMetadata(
        kitMetadata,
        undefined,
        teamOverrides,
        { 
          strategy: 'team-priority',
          arrayMergeStrategy: 'union'
        }
      );

      // Arrays should be unioned
      expect(result.value.intents).toContain('test_creation');
      expect(result.value.intents).toContain('test_debugging');
      expect(result.value.intents).toContain('mock_setup');
    });

    it('should merge nested objects deeply', () => {
      const kitMetadata: AgentMetadata = {
        id: 'test-agent',
        role: 'orchestrator',
        domain: 'testing',
        intents: ['coordination'],
        delegation: {
          strategy: 'agent_handoff',
          max_handoffs: 3,
          allowed_subagents: ['worker-1']
        }
      };

      const teamOverrides: AgentOverride = {
        delegation: {
          max_handoffs: 5,
          allowed_subagents: ['worker-1', 'worker-2']
        }
      };

      const result = mergeEngine.mergeAgentMetadata(
        kitMetadata,
        undefined,
        teamOverrides,
        { strategy: 'team-priority' }
      );

      expect(result.value.delegation?.strategy).toBe('agent_handoff');
      expect(result.value.delegation?.max_handoffs).toBe(5);
      expect(result.value.delegation?.allowed_subagents).toContain('worker-2');
    });

    it('should handle undefined overrides gracefully', () => {
      const kitMetadata: AgentMetadata = {
        id: 'test-agent',
        role: 'worker',
        domain: 'testing',
        intents: ['test_creation']
      };

      const result = mergeEngine.mergeAgentMetadata(
        kitMetadata,
        undefined,
        undefined
      );

      expect(result.value).toEqual(kitMetadata);
      expect(result.conflicts.length).toBe(0);
    });

    it('should track all applied changes', () => {
      const kitMetadata: AgentMetadata = {
        id: 'test-agent',
        role: 'worker',
        domain: 'testing',
        intents: ['test_creation'],
        context: { max_files: 5 },
        output: { mode_default: 'short+diff' }
      };

      const teamOverrides: AgentOverride = {
        context: { max_files: 10 },
        output: { mode_default: 'diff', max_bullets: 5 }
      };

      const result = mergeEngine.mergeAgentMetadata(
        kitMetadata,
        undefined,
        teamOverrides,
        { strategy: 'team-priority' }
      );

      expect(result.applied.length).toBeGreaterThan(0);
      expect(result.applied).toContain('context.max_files');
      expect(result.applied).toContain('output.mode_default');
    });
  });

  describe('createDiff', () => {
    it('should detect added properties', () => {
      const before = { id: 'test' };
      const after = { id: 'test', name: 'Test Agent' };

      const diffs = mergeEngine.createDiff(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].action).toBe('added');
      expect(diffs[0].path).toBe('name');
    });

    it('should detect removed properties', () => {
      const before = { id: 'test', name: 'Test Agent' };
      const after = { id: 'test' };

      const diffs = mergeEngine.createDiff(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].action).toBe('removed');
      expect(diffs[0].path).toBe('name');
    });

    it('should detect changed properties', () => {
      const before = { id: 'test', value: 5 };
      const after = { id: 'test', value: 10 };

      const diffs = mergeEngine.createDiff(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].action).toBe('changed');
      expect(diffs[0].path).toBe('value');
      expect(diffs[0].before).toBe(5);
      expect(diffs[0].after).toBe(10);
    });

    it('should detect nested changes', () => {
      const before = {
        id: 'test',
        context: { max_files: 5 }
      };
      const after = {
        id: 'test',
        context: { max_files: 10 }
      };

      const diffs = mergeEngine.createDiff(before, after);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].path).toBe('context.max_files');
      expect(diffs[0].action).toBe('changed');
    });

    it('should return empty array when no changes', () => {
      const obj = { id: 'test', value: 5 };

      const diffs = mergeEngine.createDiff(obj, obj);

      expect(diffs).toHaveLength(0);
    });
  });

  describe('formatDiff', () => {
    it('should format added properties', () => {
      const diffs = [
        { path: 'name', before: undefined, after: 'Test', action: 'added' as const }
      ];

      const formatted = mergeEngine.formatDiff(diffs);

      expect(formatted).toContain('+ name');
      expect(formatted).toContain('Test');
    });

    it('should format removed properties', () => {
      const diffs = [
        { path: 'name', before: 'Test', after: undefined, action: 'removed' as const }
      ];

      const formatted = mergeEngine.formatDiff(diffs);

      expect(formatted).toContain('- name');
      expect(formatted).toContain('Test');
    });

    it('should format changed properties', () => {
      const diffs = [
        { path: 'value', before: 5, after: 10, action: 'changed' as const }
      ];

      const formatted = mergeEngine.formatDiff(diffs);

      expect(formatted).toContain('~ value');
      expect(formatted).toContain('Before:');
      expect(formatted).toContain('After:');
    });

    it('should return "No changes" for empty diffs', () => {
      const formatted = mergeEngine.formatDiff([]);

      expect(formatted).toBe('No changes');
    });

    it('should show summary header', () => {
      const diffs = [
        { path: 'name', before: undefined, after: 'Test', action: 'added' as const },
        { path: 'value', before: 5, after: 10, action: 'changed' as const }
      ];

      const formatted = mergeEngine.formatDiff(diffs);

      expect(formatted).toContain('CHANGES (2 total)');
    });
  });

  describe('conflict resolution', () => {
    it('should resolve type conflicts correctly', () => {
      const kitMetadata: AgentMetadata = {
        id: 'test',
        role: 'worker',
        domain: 'testing',
        intents: ['test'],
        context: {
          max_files: 5  // number
        }
      };

      const teamOverrides: AgentOverride = {
        context: {
          max_files: '10' as any  // string (wrong type)
        }
      };

      const result = mergeEngine.mergeAgentMetadata(
        kitMetadata,
        undefined,
        teamOverrides,
        { strategy: 'team-priority' }
      );

      // Team should win despite type mismatch
      expect(result.value.context?.max_files).toBe('10');
      expect(result.conflicts.length).toBeGreaterThan(0);
    });

    it('should call onConflict callback for each conflict', () => {
      const conflicts: any[] = [];
      
      const kitMetadata: AgentMetadata = {
        id: 'test',
        role: 'worker',
        domain: 'testing',
        intents: ['test']
      };

      const teamOverrides: AgentOverride = {
        intents: ['test', 'mock']
      };

      mergeEngine.mergeAgentMetadata(
        kitMetadata,
        undefined,
        teamOverrides,
        { 
          strategy: 'team-priority',
          onConflict: (c) => conflicts.push(c)
        }
      );

      expect(conflicts.length).toBeGreaterThan(0);
    });
  });
});
