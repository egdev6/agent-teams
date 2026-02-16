/**
 * Tests for ProfileLoader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileLoader } from '@extension/profileLoader';
import { ProjectProfile } from '@extension/types';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('fs');
vi.mock('path');

describe('ProfileLoader', () => {
  let loader: ProfileLoader;

  const mockProfile: ProjectProfile = {
    project: {
      id: 'test-project',
      name: 'Test Project',
      version: '1.0.0',
      type: 'fullstack',
      description: 'A test project',
    },
    technologies: {
      typescript: true,
      react: true,
      node: true,
      vitest: true,
      disabled_tech: false,
    },
    paths: {
      src_root: 'src',
      test_root: 'src/__tests__',
      components: 'src/components',
    },
    commands: {
      test: 'pnpm test',
      dev: 'pnpm dev',
      build: 'pnpm build',
    },
    context_packs: [
      'project:architecture',
      'kit:testing-vitest',
    ],
    overrides: {
      max_agents: 3,
      auto_route: true,
    },
  };

  beforeEach(() => {
    loader = new ProfileLoader();
    loader.clearCache();
    vi.clearAllMocks();
  });

  describe('load', () => {
    it('should load profile from project root', async () => {
      const profilePath = '/mock/project/.agent-team/project.profile.yml';
      const schemaPath = '/mock/schema/project.profile.schema.json';
      
      vi.mocked(path.join).mockImplementation(((...args: string[]) => {
        const joined = args.join('/');
        if (joined.includes('project.profile.schema.json')) {
          return schemaPath;
        }
        return profilePath;
      }) as any);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      
      vi.mocked(fs.readFileSync).mockImplementation(((filePath: any) => {
        if (filePath.includes('schema.json')) {
          // Return minimal valid JSON schema
          return JSON.stringify({
            type: 'object',
            properties: {
              project: { type: 'object' },
            },
          });
        }
        // Return YAML profile
        return `
project:
  id: test-project
  name: Test Project
  version: 1.0.0
  type: fullstack
technologies:
  typescript: true
  react: true
paths:
  src_root: src
commands:
  test: pnpm test
`;
      }) as any);

      const profile = await loader.load('/mock/project');

      expect(profile).toBeDefined();
      expect(profile.project.id).toBe('test-project');
      expect(profile.project.name).toBe('Test Project');
    });

    it('should throw error if profile not found', async () => {
      vi.mocked(path.join).mockReturnValue('/mock/project/.agent-team/project.profile.yml');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(loader.load('/mock/project')).rejects.toThrow('Project profile not found');
    });

    it('should throw error for invalid YAML', async () => {
      vi.mocked(path.join).mockReturnValue('/mock/project/.agent-team/project.profile.yml');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid: yaml: [[[');

      await expect(loader.load('/mock/project')).rejects.toThrow('Failed to parse project profile');
    });

    it('should cache loaded profiles', async () => {
      const profilePath = '/mock/project/.agent-team/project.profile.yml';
      const schemaPath = '/mock/schema/project.profile.schema.json';
      
      vi.mocked(path.join).mockImplementation(((...args: string[]) => {
        const joined = args.join('/');
        if (joined.includes('schema.json')) {
          return schemaPath;
        }
        return profilePath;
      }) as any);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      
      vi.mocked(fs.readFileSync).mockImplementation(((filePath: any) => {
        if (filePath.includes('schema.json')) {
          return JSON.stringify({ type: 'object', properties: { project: { type: 'object' } } });
        }
        return `
project:
  id: test-project
  name: Test Project
  version: 1.0.0
technologies:
  typescript: true
`;
      }) as any);

      // First load
      await loader.load('/mock/project');
      
      // Second load (should use cache)
      await loader.load('/mock/project');

      // readFileSync for YAML should only be called once due to caching
      // (schema is read each time but profile is cached)
      const yamlReads = vi.mocked(fs.readFileSync).mock.calls.filter(
        call => !String(call[0]).includes('schema.json')
      );
      expect(yamlReads.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getPlaceholderContext', () => {
    it('should extract placeholder context from profile', () => {
      const context = loader.getPlaceholderContext(mockProfile);

      expect(context.project.id).toBe('test-project');
      expect(context.project.name).toBe('Test Project');
      expect(context.paths.src_root).toBe('src');
      expect(context.commands.test).toBe('pnpm test');
      expect(context.technologies.typescript).toBe(true);
    });

    it('should handle missing optional fields', () => {
      const minimalProfile: ProjectProfile = {
        project: {
          id: 'minimal',
          name: 'Minimal Project',
          version: '1.0.0',
        },
        paths: {},
        commands: {},
      };

      const context = loader.getPlaceholderContext(minimalProfile);

      expect(context.project.type).toBe('unknown');
      expect(context.project.description).toBe('');
      expect(context.technologies).toEqual({});
    });
  });

  describe('getContextPacks', () => {
    it('should return context packs from profile', () => {
      const packs = loader.getContextPacks(mockProfile);

      expect(packs).toHaveLength(2);
      expect(packs).toContain('project:architecture');
      expect(packs).toContain('kit:testing-vitest');
    });

    it('should return empty array if no context packs', () => {
      const minimalProfile: ProjectProfile = {
        project: {
          id: 'minimal',
          name: 'Minimal',
          version: '1.0.0',
        },
        paths: {},
        commands: {},
      };

      const packs = loader.getContextPacks(minimalProfile);

      expect(packs).toEqual([]);
    });
  });

  describe('getOverrides', () => {
    it('should return overrides from profile', () => {
      const overrides = loader.getOverrides(mockProfile);

      expect(overrides.max_agents).toBe(3);
      expect(overrides.auto_route).toBe(true);
    });

    it('should return empty object if no overrides', () => {
      const minimalProfile: ProjectProfile = {
        project: {
          id: 'minimal',
          name: 'Minimal',
          version: '1.0.0',
        },
        paths: {},
        commands: {},
      };

      const overrides = loader.getOverrides(minimalProfile);

      expect(overrides).toEqual({});
    });
  });

  describe('isTechnologyEnabled', () => {
    it('should return true for enabled technologies', () => {
      expect(loader.isTechnologyEnabled(mockProfile, 'typescript')).toBe(true);
      expect(loader.isTechnologyEnabled(mockProfile, 'react')).toBe(true);
    });

    it('should return false for disabled technologies', () => {
      expect(loader.isTechnologyEnabled(mockProfile, 'disabled_tech')).toBe(false);
    });

    it('should return false for unlisted technologies', () => {
      expect(loader.isTechnologyEnabled(mockProfile, 'unknown_tech')).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear the profile cache', async () => {
      const profilePath = '/mock/project/.agent-team/project.profile.yml';
      const schemaPath = '/mock/schema/project.profile.schema.json';
      
      vi.mocked(path.join).mockImplementation(((...args: string[]) => {
        const joined = args.join('/');
        if (joined.includes('schema.json')) {
          return schemaPath;
        }
        return profilePath;
      }) as any);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      
      vi.mocked(fs.readFileSync).mockImplementation(((filePath: any) => {
        if (filePath.includes('schema.json')) {
          return JSON.stringify({ type: 'object', properties: { project: { type: 'object' } } });
        }
        return `
project:
  id: test-project
  name: Test Project
  version: 1.0.0
`;
      }) as any);

      // Load profile (caches it)
      await loader.load('/mock/project');
      
      // Clear mocks to count fresh calls
      vi.mocked(fs.readFileSync).mockClear();
      
      // Clear cache
      loader.clearCache();
      
      // Load again (should read from file again)
      await loader.load('/mock/project');

      //readFileSync should be called again for the YAML file (cache was cleared)
      const yamlReads = vi.mocked(fs.readFileSync).mock.calls.filter(
        call => !String(call[0]).includes('schema.json')
      );
      expect(yamlReads.length).toBeGreaterThan(0);
    });
  });
});
