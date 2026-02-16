/**
 * Tests for SkillsRegistry
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SkillsRegistry, SkillDefinition, AgentRole } from '@extension/skillsRegistry';
import { Logger } from '@extension/logger';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('fs');
vi.mock('path');

describe('SkillsRegistry', () => {
  let registry: SkillsRegistry;
  let mockLogger: Logger;

  const mockRegistryData = {
    version: '1.0.0',
    skills: {
      file_edit: {
        id: 'file_edit',
        name: 'File Edit',
        description: 'Edit existing files',
        category: 'file_operations' as const,
        requires_role: ['worker' as AgentRole],
        security_level: 'moderate' as const,
        examples: ['Update function'],
      },
      run_tests: {
        id: 'run_tests',
        name: 'Run Tests',
        description: 'Execute test suite',
        category: 'testing' as const,
        requires_role: ['worker' as AgentRole],
        requires_technologies: ['vitest', 'jest'],
        security_level: 'moderate' as const,
        conflicts_with: ['run_terminal'],
        implies: ['analyze_coverage'],
        examples: ['Run unit tests'],
      },
      analyze_coverage: {
        id: 'analyze_coverage',
        name: 'Analyze Coverage',
        description: 'Analyze test coverage',
        category: 'testing' as const,
        requires_role: ['worker' as AgentRole, 'orchestrator' as AgentRole],
        security_level: 'safe' as const,
      },
      run_terminal: {
        id: 'run_terminal',
        name: 'Run Terminal',
        description: 'Execute terminal commands',
        category: 'execution' as const,
        requires_role: ['worker' as AgentRole],
        security_level: 'critical' as const,
      },
      search_codebase: {
        id: 'search_codebase',
        name: 'Search Codebase',
        description: 'Search code',
        category: 'code_analysis' as const,
        requires_role: ['worker' as AgentRole, 'orchestrator' as AgentRole, 'router' as AgentRole],
        security_level: 'safe' as const,
      },
      deprecated_skill: {
        id: 'deprecated_skill',
        name: 'Deprecated Skill',
        description: 'Old skill',
        category: 'file_operations' as const,
        security_level: 'safe' as const,
        deprecated: true,
        deprecated_by: 'file_edit',
      },
    },
  };

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLogLevel: vi.fn(),
    } as any;

    registry = new SkillsRegistry(mockLogger);
    vi.clearAllMocks();
  });

  describe('load', () => {
    it('should load skills registry from file', async () => {
      const mockPath = '/mock/skills.registry.yml';

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockRegistryData)
      );
      vi.mocked(path.join).mockReturnValue('/mock/schemas/skills.registry.schema.json');
      vi.mocked(path.dirname).mockReturnValue('/mock');

      await registry.load(mockPath);

      expect(registry.isLoaded()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Loaded 6 skills')
      );
    });

    it('should throw error if registry file not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(registry.load('/mock/nonexistent.yml')).rejects.toThrow(
        'Skills registry not found'
      );
    });
  });

  describe('getSkill', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockRegistryData)
      );
      vi.mocked(path.join).mockReturnValue('/mock/schemas/skills.registry.schema.json');
      vi.mocked(path.dirname).mockReturnValue('/mock');

      await registry.load('/mock/skills.registry.yml');
    });

    it('should return skill definition by ID', () => {
      const skill = registry.getSkill('file_edit');

      expect(skill).toBeDefined();
      expect(skill?.id).toBe('file_edit');
      expect(skill?.name).toBe('File Edit');
    });

    it('should return undefined for non-existent skill', () => {
      const skill = registry.getSkill('non_existent');
      expect(skill).toBeUndefined();
    });
  });

  describe('getAllSkills', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockRegistryData)
      );
      vi.mocked(path.join).mockReturnValue('/mock/schemas/skills.registry.schema.json');
      vi.mocked(path.dirname).mockReturnValue('/mock');

      await registry.load('/mock/skills.registry.yml');
    });

    it('should return all skills', () => {
      const skills = registry.getAllSkills();

      expect(skills).toHaveLength(6);
      expect(skills.map((s: SkillDefinition) => s.id)).toContain('file_edit');
      expect(skills.map((s: SkillDefinition) => s.id)).toContain('run_tests');
    });
  });

  describe('getByCategory', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockRegistryData)
      );
      vi.mocked(path.join).mockReturnValue('/mock/schemas/skills.registry.schema.json');
      vi.mocked(path.dirname).mockReturnValue('/mock');

      await registry.load('/mock/skills.registry.yml');
    });

    it('should return skills by category', () => {
      const testingSkills = registry.getByCategory('testing');

      expect(testingSkills).toHaveLength(2);
      expect(testingSkills.map((s: SkillDefinition) => s.id)).toContain('run_tests');
      expect(testingSkills.map((s: SkillDefinition) => s.id)).toContain('analyze_coverage');
    });
  });

  describe('getByRole', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockRegistryData)
      );
      vi.mocked(path.join).mockReturnValue('/mock/schemas/skills.registry.schema.json');
      vi.mocked(path.dirname).mockReturnValue('/mock');

      await registry.load('/mock/skills.registry.yml');
    });

    it('should return skills available for role', () => {
      const workerSkills = registry.getByRole('worker');

      expect(workerSkills.length).toBeGreaterThan(0);
      expect(workerSkills.every(
        (s: SkillDefinition) => !s.requires_role || s.requires_role.includes('worker')
      )).toBe(true);
    });

    it('should include skills without role restrictions', () => {
      const routerSkills = registry.getByRole('router');

      expect(routerSkills.map((s: SkillDefinition) => s.id)).toContain('search_codebase');
    });
  });

  describe('getDeprecated', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockRegistryData)
      );
      vi.mocked(path.join).mockReturnValue('/mock/schemas/skills.registry.schema.json');
      vi.mocked(path.dirname).mockReturnValue('/mock');

      await registry.load('/mock/skills.registry.yml');
    });

    it('should return deprecated skills', () => {
      const deprecated = registry.getDeprecated();

      expect(deprecated).toHaveLength(1);
      expect(deprecated[0].id).toBe('deprecated_skill');
    });
  });

  describe('validateSkills', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockRegistryData)
      );
      vi.mocked(path.join).mockReturnValue('/mock/schemas/skills.registry.schema.json');
      vi.mocked(path.dirname).mockReturnValue('/mock');

      await registry.load('/mock/skills.registry.yml');
    });

    it('should validate valid skills', () => {
      const result = registry.validateSkills(
        ['file_edit', 'search_codebase'],
        'worker'
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unknown skills', () => {
      const result = registry.validateSkills(
        ['unknown_skill'],
        'worker'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown skill: unknown_skill');
    });

    it('should detect role mismatches', () => {
      // run_tests requires worker role
      const result = registry.validateSkills(
        ['run_tests'],
        'router'
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('requires role'))).toBe(true);
    });

    it('should detect missing technologies', () => {
      const result = registry.validateSkills(
        ['run_tests'],
        'worker',
        [] // No technologies provided
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('requires technologies'))).toBe(true);
    });

    it('should warn about deprecated skills', () => {
      const result = registry.validateSkills(
        ['deprecated_skill'],
        'worker'
      );

      expect(result.warnings.some((w: string) => w.includes('deprecated'))).toBe(true);
    });

    it('should warn about critical security level', () => {
      const result = registry.validateSkills(
        ['run_terminal'],
        'worker'
      );

      expect(result.warnings.some((w: string) => w.includes('critical security level'))).toBe(true);
    });
  });

  describe('detectConflicts', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockRegistryData)
      );
      vi.mocked(path.join).mockReturnValue('/mock/schemas/skills.registry.schema.json');
      vi.mocked(path.dirname).mockReturnValue('/mock');

      await registry.load('/mock/skills.registry.yml');
    });

    it('should detect conflicting skills', () => {
      const conflicts = registry.detectConflicts(['run_tests', 'run_terminal']);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toContain('conflicts with');
    });

    it('should return empty array when no conflicts', () => {
      const conflicts = registry.detectConflicts(['file_edit', 'search_codebase']);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getImpliedSkills', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockRegistryData)
      );
      vi.mocked(path.join).mockReturnValue('/mock/schemas/skills.registry.schema.json');
      vi.mocked(path.dirname).mockReturnValue('/mock');

      await registry.load('/mock/skills.registry.yml');
    });

    it('should return implied skills', () => {
      const implied = registry.getImpliedSkills(['run_tests']);

      expect(implied).toContain('analyze_coverage');
    });

    it('should not include already selected skills', () => {
      const implied = registry.getImpliedSkills(['run_tests', 'analyze_coverage']);

      expect(implied).not.toContain('analyze_coverage');
    });

    it('should return empty array when no implied skills', () => {
      const implied = registry.getImpliedSkills(['file_edit']);

      expect(implied).toHaveLength(0);
    });
  });

  describe('getRecommendations', () => {
    beforeEach(async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(mockRegistryData)
      );
      vi.mocked(path.join).mockReturnValue('/mock/schemas/skills.registry.schema.json');
      vi.mocked(path.dirname).mockReturnValue('/mock');

      await registry.load('/mock/skills.registry.yml');
    });

    it('should recommend testing skills for testing domain', () => {
      const recommendations = registry.getRecommendations('testing', 'worker', ['vitest']);

      expect(recommendations.some((r: any) => r.skill_id === 'run_tests')).toBe(true);
      expect(recommendations.some((r: any) => r.priority === 'high')).toBe(true);
    });

    it('should filter by technology requirements', () => {
      const recommendations = registry.getRecommendations('testing', 'worker', ['vitest']);

      const runTests = recommendations.find((r: any) => r.skill_id === 'run_tests');
      expect(runTests).toBeDefined();
    });

    it('should not recommend skills incompatible with role', () => {
      const recommendations = registry.getRecommendations('testing', 'router');

      // run_tests requires worker role, shouldn't be recommended for router
      const hasWorkerOnlySkill = recommendations.some(
        (r: any) => r.skill_id === 'run_tests'
      );
      expect(hasWorkerOnlySkill).toBe(false);
    });
  });
});
