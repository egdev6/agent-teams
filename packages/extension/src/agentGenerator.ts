import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SkillUseDefinition } from '@agent-teams/core';
import { SCHEMA_PATHS, TEMPLATE_PATHS } from '@agent-teams/core';
import Ajv, { type ValidateFunction } from 'ajv';
import YAML from 'yaml';
import type { Logger } from './logger';
import { SkillsRegistry } from './skillsRegistry';
import type { AgentMetadata, AgentSpec } from './types';

export interface AgentSpecTemplate {
  name: string;
  description: string;
  _metadata: Partial<AgentMetadata>;
}

export class AgentGenerator {
  private logger: Logger;
  private validator: ValidateFunction | null = null;
  private templateContent: string = '';
  private skillsRegistry: SkillsRegistry;

  constructor(logger: Logger) {
    this.logger = logger;
    this.skillsRegistry = new SkillsRegistry(logger);
  }

  /**
   * Initialize generator by loading schema and template
   */
  async initialize(workspaceRoot: string): Promise<void> {
    // Load schema: user workspace first, then core package
    const userSchemaPath = path.join(workspaceRoot, 'schemas', 'agent.schema.json');
    const schemaPath = fs.existsSync(userSchemaPath) ? userSchemaPath : SCHEMA_PATHS.agent;
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent);
      const ajv = new Ajv({ allErrors: true });
      this.validator = ajv.compile(schema);
      this.logger.info('Schema loaded for validation');
    }

    // Load template: user workspace first, then core package
    const userTemplatePath = path.join(workspaceRoot, 'agents', '_templates', 'agent.template.md');
    const templatePath = fs.existsSync(userTemplatePath) ? userTemplatePath : TEMPLATE_PATHS.agent;
    if (fs.existsSync(templatePath)) {
      this.templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.logger.info('Template loaded');
    } else {
      // Final fallback to embedded template
      this.templateContent = this.getDefaultTemplate();
      this.logger.warn('Using embedded default template');
    }

    // Load skills registry
    const registryPath = path.join(workspaceRoot, 'skills.registry.yml');
    if (fs.existsSync(registryPath)) {
      try {
        await this.skillsRegistry.load(registryPath);
        this.logger.info('Skills registry loaded successfully');
      } catch (error) {
        this.logger.error('Failed to load skills registry', error);
      }
    } else {
      this.logger.warn(`Skills registry not found at: ${registryPath}`);
    }
  }

  /**
   * Validate a spec against schema
   */
  validateSpec(spec: any): { valid: boolean; errors?: string[] } {
    if (!this.validator) {
      return { valid: true }; // No schema, skip validation
    }

    const valid = this.validator(spec);
    if (!valid && this.validator.errors) {
      const errors = this.validator.errors.map((err) => {
        return `${err.instancePath || 'root'} ${err.message}`;
      });
      return { valid: false, errors };
    }

    return { valid: true };
  }

  /**
   * Save a spec object as a YAML file and return its path
   */
  saveSpec(spec: any, specsDir: string): string {
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }
    const specId = spec._metadata?.id || 'spec';
    const specPath = path.join(specsDir, `${specId}.yml`);
    fs.writeFileSync(specPath, YAML.stringify(spec), 'utf-8');
    this.logger.info(`Saved spec: ${specPath}`);
    return specPath;
  }

  /**
   * Create a new agent from spec
   */
  async createAgent(
    specPath: string,
    outputDir: string,
    _workspaceRoot: string,
  ): Promise<{ success: boolean; message: string; agentPath?: string }> {
    try {
      // Read spec
      if (!fs.existsSync(specPath)) {
        return { success: false, message: `Spec file not found: ${specPath}` };
      }

      const specContent = fs.readFileSync(specPath, 'utf-8');
      const spec = YAML.parse(specContent);

      // Validate
      const validation = this.validateSpec(spec);
      if (!validation.valid) {
        return {
          success: false,
          message: `Validation failed:\n${validation.errors?.join('\n')}`,
        };
      }

      // Normalize metadata
      const normalized = this.normalizeSpec(spec);

      // Generate agent content
      const agentContent = this.renderTemplate(normalized);

      // Write agent file
      const agentId = normalized._metadata.id || 'unknown';
      const agentFileName = `${agentId}.md`;
      const agentPath = path.join(outputDir, agentFileName);

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(agentPath, agentContent, 'utf-8');

      this.logger.info(`Created agent: ${agentPath}`);
      return {
        success: true,
        message: `Agent created successfully: ${agentFileName}`,
        agentPath,
      };
    } catch (error) {
      this.logger.error('Failed to create agent:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Sync agents to .github/agents directory
   */
  async syncAgents(
    sourceDir: string,
    targetDir: string,
    options: { clean?: boolean } = {},
  ): Promise<{ success: boolean; message: string; synced: number }> {
    try {
      let synced = 0;

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Clean if requested
      if (options.clean) {
        const existing = fs.readdirSync(targetDir).filter((f: string) => f.endsWith('.agent.md'));

        for (const file of existing) {
          fs.unlinkSync(path.join(targetDir, file));
        }
        this.logger.info(`Cleaned ${existing.length} existing agent(s)`);
      }

      // Read source agents
      if (!fs.existsSync(sourceDir)) {
        return {
          success: false,
          message: `Source directory not found: ${sourceDir}`,
          synced: 0,
        };
      }

      const files = fs
        .readdirSync(sourceDir)
        .filter((f: string) => f.endsWith('.md') && !f.startsWith('_'));

      // Copy each agent
      for (const file of files) {
        const sourcePath = path.join(sourceDir, file);
        const targetName = file.replace(/\.md$/, '.agent.md');
        const targetPath = path.join(targetDir, targetName);

        fs.copyFileSync(sourcePath, targetPath);
        this.logger.info(`Synced: ${file} → ${targetName}`);
        synced++;
      }

      return {
        success: true,
        message: `Synced ${synced} agent(s) successfully`,
        synced,
      };
    } catch (error) {
      this.logger.error('Failed to sync agents:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        synced: 0,
      };
    }
  }

  /**
   * Normalize agent spec with defaults
   */
  private normalizeSpec(spec: AgentSpec): AgentSpec {
    const id =
      spec._metadata?.id ||
      spec.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    return {
      ...spec,
      _metadata: {
        ...spec._metadata,
        id,
        role: spec._metadata?.role || 'worker',
        domain: spec._metadata?.domain || 'general',
        intents: spec._metadata?.intents || [],
        invocation: spec._metadata?.invocation || {
          aliases: [`@${id}`],
          entrypoint: `agent:${id}`,
        },
        context: spec._metadata?.context || {
          max_files: 8,
          max_chars_per_file: 8000,
        },
        output: spec._metadata?.output || {
          mode_default: 'short+diff',
          never_include: ['disclaimers', 'placeholders', 'apologies'],
        },
      },
    };
  }

  /**
   * Render agent content from template
   */
  private renderTemplate(spec: AgentSpec): string {
    if (!this.templateContent) {
      return this.getDefaultTemplate();
    }

    let content = this.templateContent;

    const usesEntries = spec._metadata.skills?.uses ?? [];
    const skillsSection = usesEntries.length > 0 ? this.renderSkillUses(usesEntries) : '(none)';

    const replacements: Record<string, string> = {
      '{{name}}': spec.name,
      '{{description}}': spec.description,
      '{{id}}': spec._metadata.id,
      '{{role}}': spec._metadata.role,
      '{{domain}}': spec._metadata.domain,
      '{{intents}}': (spec._metadata.intents || []).join(', '),
      '{{keywords}}': (spec._metadata.keywords || []).join(', '),
      '{{path_globs}}': (spec._metadata.path_globs || []).join(', '),
      '{{skills}}': skillsSection,
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replaceAll(placeholder, value);
    }

    if (!content.startsWith('---')) {
      const frontmatter = `---\nname: ${spec.name}\ndescription: ${spec.description}\n---\n\n`;
      return frontmatter + content;
    }

    return content;
  }

  /**
   * Render skills.uses[] as a YAML-style block for agent markdown
   */
  private renderSkillUses(uses: SkillUseDefinition[]): string {
    return uses
      .map((use) => {
        const lines = [`- id: ${use.id}`];
        if (use.when) lines.push(`  when: ${use.when}`);
        if (use.tags && use.tags.length > 0) lines.push(`  tags: [${use.tags.join(', ')}]`);
        if (use.autoload === false) lines.push('  autoload: false');
        return lines.join('\n');
      })
      .join('\n');
  }

  /**
   * Get default embedded agent template
   */
  private getDefaultTemplate(): string {
    return `---
name: {{name}}
description: {{description}}
---

# {{name}}

{{description}}

## Role

**{{role}}** agent for the **{{domain}}** domain.

## Intents

{{intents}}

## Skills

{{skills}}

## Instructions

You are a specialized **{{role}}** agent focused on **{{domain}}** tasks.

- Handle intents: {{intents}}
- Use configured skills: {{skills}}
- Keep responses concise and diff-focused
- Never include disclaimers, placeholders, or apologies`;
  }
}
