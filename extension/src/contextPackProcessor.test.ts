/**
 * Tests for ContextPackProcessor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextPackProcessor } from '@extension/contextPackProcessor';
import { Logger } from '@extension/logger';

describe('ContextPackProcessor', () => {
  let processor: ContextPackProcessor;
  let mockLogger: Logger;

  const mockContext = {
    project: {
      name: 'Test Project',
      id: 'test-project',
      type: 'frontend',
    },
    technologies: {
      typescript: true,
      react: true,
      vitest: true,
      vue: false,
    },
    paths: {
      src_root: 'src',
      test_root: 'src/__tests__',
    },
    commands: {
      test: 'pnpm test',
      dev: 'pnpm dev',
    },
    env: {
      NODE_ENV: 'development',
    },
    kit: {
      id: 'testing-vitest',
      version: '1.0.0',
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

    processor = new ContextPackProcessor(mockLogger);
    vi.clearAllMocks();
  });

  describe('processString', () => {
    it('should process simple variables', async () => {
      const content = 'Project: {{project:name}}';
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('Project: Test Project');
    });

    it('should process path variables', async () => {
      const content = 'Source: {{path:src_root}}';
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('Source: src');
    });

    it('should process command variables', async () => {
      const content = 'Run: {{command:test}}';
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('Run: pnpm test');
    });

    it('should process conditionals - if true', async () => {
      const content = `{{#if technology:typescript}}
TypeScript is enabled
{{/if}}`;
      const result = await processor.processString(content, mockContext);
      expect(result).toContain('TypeScript is enabled');
    });

    it('should process conditionals - if false', async () => {
      const content = `{{#if technology:vue}}
Vue is enabled
{{/if}}`;
      const result = await processor.processString(content, mockContext);
      expect(result).not.toContain('Vue is enabled');
    });

    it('should process if-else blocks', async () => {
      const content = `{{#if technology:vue}}
Vue is enabled
{{else}}
Vue is not enabled
{{/if}}`;
      const result = await processor.processString(content, mockContext);
      expect(result).toContain('Vue is not enabled');
      expect(result).not.toContain('Vue is enabled');
    });

    it('should process unless conditionals', async () => {
      const content = `{{#unless technology:vue}}
Vue is not enabled
{{/unless}}`;
      const result = await processor.processString(content, mockContext);
      expect(result).toContain('Vue is not enabled');
    });

    it('should process loops over technologies', async () => {
      const content = `Technologies:
{{#each technologies}}
- {{this}}
{{/each}}`;
      const result = await processor.processString(content, mockContext);
      expect(result).toContain('- typescript');
      expect(result).toContain('- react');
      expect(result).toContain('- vitest');
    });

    it('should process loops over paths', async () => {
      const content = `Paths:
{{#each paths}}
- {{key}}: {{value}}
{{/each}}`;
      const result = await processor.processString(content, mockContext);
      expect(result).toContain('- src_root: src');
      expect(result).toContain('- test_root: src/__tests__');
    });

    it('should process filters - uppercase', async () => {
      const content = '{{uppercase:test project}}';
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('TEST PROJECT');
    });

    it('should process filters - lowercase', async () => {
      const content = '{{lowercase:TEST PROJECT}}';
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('test project');
    });

    it('should process filters - capitalize', async () => {
      const content = '{{capitalize:test project}}';
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('Test project');
    });

    it('should process complex nested structures', async () => {
      const content = `# Project: {{project:name}}

## Technologies
{{#each technologies}}
- {{this}}
{{/each}}

## Commands
Test: {{command:test}}
Dev: {{command:dev}}

{{#if technology:typescript}}
## TypeScript Configuration
TypeScript is enabled
{{/if}}`;

      const result = await processor.processString(content, mockContext);
      
      expect(result).toContain('# Project: Test Project');
      expect(result).toContain('- typescript');
      expect(result).toContain('Test: pnpm test');
      expect(result).toContain('TypeScript is enabled');
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate technology conditions', async () => {
      const content = `{{#if technology:typescript}}yes{{/if}}`;
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('yes');
    });

    it('should evaluate project type conditions', async () => {
      const content = `{{#if project:type=frontend}}yes{{/if}}`;
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('yes');
    });

    it('should evaluate env conditions - true', async () => {
      const contextWithEnv = {
        ...mockContext,
        env: { ...mockContext.env, CI: 'true' },
      };
      const content = `{{#if env:CI}}yes{{/if}}`;
      const result = await processor.processString(content, contextWithEnv);
      expect(result).toBe('yes');
    });

    it('should evaluate var conditions for existence', async () => {
      const contextWithVars = {
        ...mockContext,
        vars: { customVar: 'value' },
      };
      const content = `{{#if var:customVar}}yes{{/if}}`;
      const result = await processor.processString(content, contextWithVars);
      expect(result).toBe('yes');
    });
  });

  describe('applyFilter', () => {
    it('should apply uppercase filter', async () => {
      const content = '{{uppercase:hello world}}';
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('HELLO WORLD');
    });

    it('should apply lowercase filter', async () => {
      const content = '{{lowercase:HELLO WORLD}}';
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('hello world');
    });

    it('should apply capitalize filter', async () => {
      const content = '{{capitalize:hello world}}';
      const result = await processor.processString(content, mockContext);
      expect(result).toBe('Hello world');
    });
  });
});
