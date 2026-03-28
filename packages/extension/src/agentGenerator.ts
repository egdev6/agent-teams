import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentSpec } from '@agent-teams/core';
import {
  resolveOutputStructure,
  resolveWorkflow,
  SCHEMA_PATHS,
  TEMPLATE_PATHS,
} from '@agent-teams/core';
import Ajv, { type ValidateFunction } from 'ajv';
import YAML from 'yaml';
import type { Logger } from './logger';

export class AgentGenerator {
  private logger: Logger;
  private validator: ValidateFunction | null = null;
  private templateContent: string = '';

  constructor(logger: Logger) {
    this.logger = logger;
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
      this.logger.warn('Agent template not found — MD generation will be skipped');
    }
  }

  /**
   * Validate a spec against the JSON schema
   */
  validateSpec(spec: unknown): { valid: boolean; errors?: string[] } {
    if (!this.validator) {
      return { valid: true };
    }
    const valid = this.validator(spec);
    if (!valid && this.validator.errors) {
      const errors = this.validator.errors.map(
        (err) => `${err.instancePath || 'root'} ${err.message}`,
      );
      return { valid: false, errors };
    }
    return { valid: true };
  }

  /**
   * Persist a spec object as a YAML file and return its path
   */
  saveSpec(spec: AgentSpec, specsDir: string): string {
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }
    const specPath = path.join(specsDir, `${spec.id}.yml`);
    fs.writeFileSync(specPath, YAML.stringify(spec), 'utf-8');
    this.logger.info(`Saved spec: ${specPath}`);
    return specPath;
  }

  /**
   * Create an agent MD from a spec YAML file
   */
  async createAgent(
    specPath: string,
    outputDir: string,
    _workspaceRoot: string,
  ): Promise<{ success: boolean; message: string; agentPath?: string }> {
    try {
      if (!fs.existsSync(specPath)) {
        return { success: false, message: `Spec file not found: ${specPath}` };
      }

      const spec: AgentSpec = YAML.parse(fs.readFileSync(specPath, 'utf-8'));

      const validation = this.validateSpec(spec);
      if (!validation.valid) {
        return {
          success: false,
          message: `Validation failed:\n${validation.errors?.join('\n')}`,
        };
      }

      const normalized = this.normalizeSpec(spec);
      const agentContent = this.renderTemplate(normalized);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const agentPath = path.join(outputDir, `${normalized.id}.md`);
      fs.writeFileSync(agentPath, agentContent, 'utf-8');

      this.logger.info(`Created agent: ${agentPath}`);
      return {
        success: true,
        message: `Agent created successfully: ${normalized.id}.md`,
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
   * Sync agents from source dir to target dir (renames *.md → *.agent.md)
   */
  async syncAgents(
    sourceDir: string,
    targetDir: string,
    options: { clean?: boolean } = {},
  ): Promise<{ success: boolean; message: string; synced: number }> {
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      if (options.clean) {
        const existing = fs.readdirSync(targetDir).filter((f: string) => f.endsWith('.agent.md'));
        for (const file of existing) {
          fs.unlinkSync(path.join(targetDir, file));
        }
        this.logger.info(`Cleaned ${existing.length} existing agent(s)`);
      }

      if (!fs.existsSync(sourceDir)) {
        return { success: false, message: `Source directory not found: ${sourceDir}`, synced: 0 };
      }

      const files = fs
        .readdirSync(sourceDir)
        .filter((f: string) => f.endsWith('.md') && !f.startsWith('_'));

      let synced = 0;
      for (const file of files) {
        const targetName = file.replace(/\.md$/, '.agent.md');
        fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, targetName));
        this.logger.info(`Synced: ${file} → ${targetName}`);
        synced++;
      }

      return { success: true, message: `Synced ${synced} agent(s) successfully`, synced };
    } catch (error) {
      this.logger.error('Failed to sync agents:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        synced: 0,
      };
    }
  }

  // ── private ──────────────────────────────────────────────────────────────

  private normalizeSpec(spec: AgentSpec): AgentSpec {
    return {
      targets: ['github_copilot', 'claude_code'],
      ...spec,
      output: {
        template: 'diff',
        mode: 'short',
        ...spec.output,
      },
    };
  }

  private renderTemplate(spec: AgentSpec): string {
    if (!this.templateContent) {
      return this.buildFallbackMd(spec);
    }

    const sections = this.buildSectionFlags(spec);
    const values = this.buildTemplateValues(spec);

    let content = this.templateContent;

    // Process {{#flag}} ... {{/flag}} conditional blocks
    for (const [flag, show] of Object.entries(sections)) {
      const blockRe = new RegExp(`\\{\\{#${flag}\\}\\}([\\s\\S]*?)\\{\\{/${flag}\\}\\}`, 'g');
      content = content.replace(blockRe, show ? '$1' : '');
    }

    // Replace {{key}} values
    for (const [key, val] of Object.entries(values)) {
      content = content.replaceAll(`{{${key}}}`, val);
    }

    return content;
  }

  private buildSectionFlags(spec: AgentSpec): Record<string, boolean> {
    return {
      expertise: (spec.expertise ?? []).length > 0,
      intents: (spec.intents ?? []).length > 0,
      scope_topics: (spec.scope?.topics ?? []).length > 0,
      scope_globs: (spec.scope?.path_globs ?? []).length > 0,
      scope_excludes: (spec.scope?.excludes ?? []).length > 0,
      tools: (spec.tools ?? []).length > 0,
      skills: (spec.skills ?? []).length > 0,
      constraints_always: (spec.constraints?.always ?? []).length > 0,
      constraints_never: (spec.constraints?.never ?? []).length > 0,
      constraints_escalate: (spec.constraints?.escalate ?? []).length > 0,
      receives_from: (spec.handoffs?.receives_from ?? []).length > 0,
      delegates_to: (spec.handoffs?.delegates_to ?? []).length > 0,
      escalates_to: (spec.handoffs?.escalates_to ?? []).length > 0,
      subdomain: !!spec.subdomain,
      domain: !!spec.domain,
      output_mode: !!spec.output?.mode,
    };
  }

  private buildTemplateValues(spec: AgentSpec): Record<string, string> {
    const workflow = resolveWorkflow(spec.role, spec.workflow, {
      receivesFrom: spec.handoffs?.receives_from,
      delegatesTo: spec.handoffs?.delegates_to,
      scopeTopics: spec.scope?.topics,
      escalatesTo: spec.handoffs?.escalates_to,
      output: spec.output,
    });
    const workflowSteps = workflow.map((s, i) => `${i + 1}. ${s}`).join('\n');

    const expertise = spec.expertise ?? [];
    const intents = spec.intents ?? [];
    const tools = spec.tools ?? [];
    const skills = spec.skills ?? [];
    const constraints = spec.constraints ?? {};
    const handoffs = spec.handoffs ?? {};
    const scope = spec.scope ?? {};
    const out = spec.output ?? {};

    const scopeGlobs = (scope.path_globs ?? []).map((g) => {
      if (typeof g === 'string') return `- \`${g}\``;
      const pri = g.priority ? ` *(${g.priority} priority)*` : '';
      return `- \`${g.pattern}\`${pri}`;
    });

    const toolsRows = tools.map((t) => `| \`${t.name}\` | ${t.when ?? '—'} |`).join('\n');
    const skillsRows = skills.map((s) => `| \`${s.id}\` | ${s.when ?? '—'} |`).join('\n');

    const outputStructure = resolveOutputStructure({
      template: out.template ?? 'diff',
      format_instructions: out.format_instructions,
    });

    return {
      ...this.buildBasicValues(spec),
      ...this.buildListValues(
        expertise,
        intents,
        scope,
        scopeGlobs,
        constraints,
        handoffs,
        workflowSteps,
        toolsRows,
        skillsRows,
      ),
      ...this.buildOutputValues(out, outputStructure),
    };
  }

  private buildBasicValues(spec: AgentSpec): Record<string, string> {
    return {
      id: spec.id,
      name: spec.name,
      role: spec.role,
      domain: spec.domain ?? 'general',
      subdomain: spec.subdomain ?? '',
      version: spec.version ?? '1.0.0',
      description: spec.description,
    };
  }

  private buildListValues(
    expertise: string[],
    intents: string[],
    scope: any,
    scopeGlobs: string[],
    constraints: any,
    handoffs: any,
    workflowSteps: string,
    toolsRows: string,
    skillsRows: string,
  ): Record<string, string> {
    return {
      expertise_inline: expertise.join(', '),
      intents_inline: intents.map((i) => `\`${i}\``).join(' '),
      scope_topics_list: (scope.topics ?? []).map((t: any) => `- ${t}`).join('\n'),
      scope_globs_list: scopeGlobs.join('\n'),
      scope_excludes_list: (scope.excludes ?? []).map((e: any) => `- \`${e}\``).join('\n'),
      workflow_steps: workflowSteps,
      tools_rows: toolsRows,
      skills_rows: skillsRows,
      constraints_always_list: (constraints.always ?? []).map((c: any) => `- ${c}`).join('\n'),
      constraints_never_list: (constraints.never ?? []).map((c: any) => `- ${c}`).join('\n'),
      constraints_escalate_list: (constraints.escalate ?? []).map((c: any) => `- ${c}`).join('\n'),
      receives_from_inline: (handoffs.receives_from ?? []).map((a: any) => `\`${a}\``).join(', '),
      delegates_to_inline: (handoffs.delegates_to ?? []).map((a: any) => `\`${a}\``).join(', '),
      escalates_to_inline: (handoffs.escalates_to ?? []).map((a: any) => `\`${a}\``).join(', '),
    };
  }

  private buildOutputValues(out: any, outputStructure: string): Record<string, string> {
    return {
      output_template: out.template ?? 'diff',
      output_mode: out.mode ?? '',
      output_structure: outputStructure,
    };
  }

  private buildFallbackMd(spec: AgentSpec): string {
    const workflow = resolveWorkflow(spec.role, spec.workflow, {
      receivesFrom: spec.handoffs?.receives_from,
      delegatesTo: spec.handoffs?.delegates_to,
      scopeTopics: spec.scope?.topics,
      escalatesTo: spec.handoffs?.escalates_to,
      output: spec.output,
    });
    const steps = workflow.map((s, i) => `${i + 1}. ${s}`).join('\n');
    return `---\nid: ${spec.id}\nname: ${spec.name}\nrole: ${spec.role}\n---\n\n# ${spec.name}\n\n${spec.description}\n\n## Workflow\n\n${steps}\n`;
  }
}
