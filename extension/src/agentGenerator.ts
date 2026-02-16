import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import YAML from 'yaml';
import Ajv, { ValidateFunction } from 'ajv';
import { AgentSpec, AgentMetadata } from './types';
import { Logger } from './logger';
import { SkillsRegistry, AgentRole } from './skillsRegistry';

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
    // Load schema
    const schemaPath = path.join(workspaceRoot, 'schemas', 'agent.schema.json');
    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent);
      const ajv = new Ajv({ allErrors: true });
      this.validator = ajv.compile(schema);
      this.logger.info('Schema loaded for validation');
    }

    // Load template
    const templatePath = path.join(workspaceRoot, 'agents', '_templates', 'agent.template.md');
    if (fs.existsSync(templatePath)) {
      this.templateContent = fs.readFileSync(templatePath, 'utf-8');
      this.logger.info('Template loaded');
    } else {
      // Fallback to embedded template
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
      this.logger.warn('Skills registry not found at: ' + registryPath);
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
      const errors = this.validator.errors.map(err => {
        return `${err.instancePath || 'root'} ${err.message}`;
      });
      return { valid: false, errors };
    }

    return { valid: true };
  }

  /**
   * Create a new agent from spec
   */
  async createAgent(
    specPath: string,
    outputDir: string,
    workspaceRoot: string
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
          message: `Validation failed:\n${validation.errors?.join('\n')}`
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
        agentPath
      };

    } catch (error) {
      this.logger.error('Failed to create agent:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Sync agents to .github/agents directory
   */
  async syncAgents(
    sourceDir: string,
    targetDir: string,
    options: { clean?: boolean } = {}
  ): Promise<{ success: boolean; message: string; synced: number }> {
    try {
      let synced = 0;

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Clean if requested
      if (options.clean) {
        const existing = fs.readdirSync(targetDir)
          .filter((f: string) => f.endsWith('.agent.md'));
        
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
          synced: 0
        };
      }

      const files = fs.readdirSync(sourceDir)
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
        synced
      };

    } catch (error) {
      this.logger.error('Failed to sync agents:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        synced: 0
      };
    }
  }

  /**
   * Get preset configuration based on domain and subdomain
   */
  private getDomainPreset(domain: string, subdomain?: string): {
    intents: string[];
    paths: string[];
    keywords: string[];
    skills: string[];
  } {
    const presets: Record<string, any> = {
      'backend:api': {
        intents: ['api_contract', 'endpoint_add', 'endpoint_modify', 'auth_implementation', 'api_validation', 'api_testing'],
        paths: ['src/api/**/*.ts', 'src/controllers/**/*.ts', 'src/routes/**/*.ts'],
        keywords: ['endpoint', 'handler', 'middleware', 'router', 'controller', 'route'],
        skills: ['file_edit', 'file_create', 'search_codebase']
      },
      'backend:database': {
        intents: ['schema_design', 'migration', 'query_optimization', 'orm_setup'],
        paths: ['prisma/**/*.prisma', 'migrations/**/*', 'src/models/**/*.ts', '**/*.sql'],
        keywords: ['schema', 'migration', 'query', 'database', 'orm', 'prisma'],
        skills: ['file_edit', 'file_create', 'run_terminal']
      },
      'backend': {
        intents: ['api_design', 'db_migration', 'auth_implementation', 'error_handling', 'performance_optimization'],
        paths: ['src/api/**/*.ts', 'src/controllers/**/*.ts', 'src/services/**/*.ts'],
        keywords: ['api', 'endpoint', 'server', 'database', 'authentication', 'middleware'],
        skills: ['file_edit', 'file_create', 'search_codebase', 'run_terminal']
      },
      'frontend:components': {
        intents: ['component_creation', 'component_modification', 'props_interface', 'style_implementation'],
        paths: ['src/components/**/*.tsx', 'components/**/*.tsx', 'src/components/**/*.vue'],
        keywords: ['component', 'props', 'jsx', 'tsx', 'react', 'vue'],
        skills: ['file_edit', 'file_create']
      },
      'frontend': {
        intents: ['component_creation', 'ui_styling', 'state_management', 'responsive_design', 'accessibility'],
        paths: ['src/components/**/*.tsx', 'src/pages/**/*.tsx', 'src/styles/**/*.css'],
        keywords: ['component', 'ui', 'style', 'react', 'state', 'css'],
        skills: ['file_edit', 'file_create', 'browser_preview']
      },
      'testing': {
        intents: ['unit_testing', 'integration_testing', 'e2e_testing', 'test_automation', 'mocking'],
        paths: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*', 'e2e/**/*'],
        keywords: ['test', 'spec', 'mock', 'assert', 'expect', 'jest'],
        skills: ['file_edit', 'file_create', 'run_terminal']
      },
      'devops': {
        intents: ['ci_cd', 'deployment', 'docker_setup', 'kubernetes_config', 'monitoring'],
        paths: ['Dockerfile', '.github/workflows/**', 'docker-compose.yml', 'k8s/**/*'],
        keywords: ['deploy', 'docker', 'kubernetes', 'ci', 'cd', 'pipeline'],
        skills: ['file_edit', 'file_create', 'run_terminal']
      },
      'documentation': {
        intents: ['api_docs', 'readme', 'tutorial', 'architecture_docs', 'inline_comments'],
        paths: ['docs/**/*.md', 'README.md', '*.md'],
        keywords: ['documentation', 'readme', 'guide', 'tutorial', 'docs'],
        skills: ['file_edit', 'file_create', 'search_codebase']
      },
      'router': {
        intents: ['routing', 'intent_detection', 'agent_selection', 'request_delegation'],
        paths: [], // Routers don't work on specific files
        keywords: ['route', 'delegate', 'intent', 'agent'],
        skills: ['search_codebase'] // NO file_edit/file_create - routers only analyze and route
      }
    };

    // Try subdomain-specific preset first
    const key = subdomain ? `${domain}:${subdomain}` : domain;
    return presets[key] || presets[domain] || {
      intents: [],
      paths: [],
      keywords: [],
      skills: ['file_edit', 'file_create']
    };
  }

  /**
   * Get suggested intents based on domain (legacy)
   */
  private getSuggestedIntents(domain: string): string[] {
    const preset = this.getDomainPreset(domain);
    return preset.intents;
  }

  /**
   * Get suggested path globs based on domain
   */
  private getSuggestedPathGlobs(domain: string): string[] {
    const suggestions: Record<string, string[]> = {
      backend: ['src/api/**/*.ts', 'src/controllers/**/*.ts', 'src/services/**/*.ts', 'src/middleware/**/*.ts'],
      frontend: ['src/components/**/*.tsx', 'src/pages/**/*.tsx', 'src/styles/**/*.css', 'components/**/*.vue'],
      testing: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*', 'e2e/**/*'],
      devops: ['Dockerfile', '.github/workflows/**', 'docker-compose.yml', 'k8s/**/*'],
      documentation: ['docs/**/*.md', 'README.md', '*.md']
    };
    return suggestions[domain] || [];
  }

  /**
   * Create a new spec file interactively (role-aware wizard)
   */
  async createSpecInteractive(): Promise<AgentSpec | null> {
    // Steps 1-3: Name, Description, Role (common to all)
    const basicInfo = await this.getBasicInfo();
    if (!basicInfo) return null;

    // Role-specific wizards
    switch (basicInfo.role) {
      case 'router':
        return await this.createRouterSpec(basicInfo);
      case 'orchestrator':
        return await this.createOrchestratorSpec(basicInfo);
      case 'worker':
        return await this.createWorkerSpec(basicInfo);
      default:
        return null;
    }
  }

  /**
   * Get basic agent information (Steps 1-3: common to all roles)
   */
  private async getBasicInfo(): Promise<{ name: string; description: string; role: string } | null> {
    // Step 1: Name
    const name = await vscode.window.showInputBox({
      prompt: '(1/3) Agent Name',
      placeHolder: 'e.g., Backend Specialist, Test Manager, Request Router',
      validateInput: (value) => {
        return value.trim() ? null : 'Name is required';
      }
    });

    if (!name) return null;

    // Step 2: Description
    const description = await vscode.window.showInputBox({
      prompt: '(2/3) Agent Description',
      placeHolder: 'e.g., Expert in server-side development with Node.js and Express',
      validateInput: (value) => {
        return value.trim() ? null : 'Description is required';
      }
    });

    if (!description) return null;

    // Step 3: Role (with explanation)
    const roleItems = [
      {
        label: 'worker',
        description: '🔧 Specialized agent for specific tasks (MOST COMMON)',
        detail: 'Executes domain-specific work. Has skills, can edit files, run tests, etc.'
      },
      {
        label: 'orchestrator',
        description: '🎭 Coordinates multiple agents for complex workflows',
        detail: 'Breaks down tasks and delegates to workers. No direct skills, only coordination.'
      },
      {
        label: 'router',
        description: '🎯 Routes requests to appropriate agents based on intent',
        detail: 'Analyzes requests and selects best agent. No skills, only routing. Usually 1 per project.'
      }
    ];

    const roleSelection = await vscode.window.showQuickPick(roleItems, {
      placeHolder: '(3/3) Select agent role - Next steps will adapt to your choice',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!roleSelection) return null;
    const role = roleSelection.label;

    return { name, description, role };
  }

  /**
   * Router-specific wizard (simplified flow)
   * Routers only need: intents for detection, keywords, no skills, forced delegation
   */
  private async createRouterSpec(basicInfo: { name: string; description: string; role: string }): Promise<AgentSpec | null> {
    const { name, description, role } = basicInfo;

    // Generate ID
    const id = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    vscode.window.showInformationMessage(
      '🎯 Router Configuration: Routers analyze requests and delegate. No file editing, only routing.'
    );

    // Step 1: Domain (usually 'global' for routers)
    const domainItems = [
      { label: 'global', description: 'Cross-cutting routing (recommended for routers)' },
      { label: 'backend', description: 'Backend-specific routing' },
      { label: 'frontend', description: 'Frontend-specific routing' },
      { label: 'testing', description: 'Testing-specific routing' },
      { label: 'other', description: 'Custom domain' }
    ];

    const domainSelection = await vscode.window.showQuickPick(domainItems, {
      placeHolder: '(4/6) Domain - Routers usually use "global"'
    });

    if (!domainSelection) return null;
    const domain = domainSelection.label;

    // Step 2: Intents (routing patterns to detect)
    const intentsHelp = 'Examples: routing, intent_detection, agent_selection, request_delegation';

    const intentsInput = await vscode.window.showInputBox({
      prompt: `(5/6) Routing Intents (comma-separated)\n${intentsHelp}`,
      placeHolder: 'e.g., routing, intent_detection, agent_selection',
      value: 'routing, intent_detection, agent_selection',
      validateInput: (value) => {
        if (!value.trim()) return '⚠️ Intents are required';
        return null;
      }
    });

    if (!intentsInput) return null;
    const intents = intentsInput.split(',').map(s => s.trim()).filter(Boolean);

    // Step 3: Keywords (for intent detection)
    const keywordsInput = await vscode.window.showInputBox({
      prompt: '(6/6) Keywords (comma-separated) - Used to recognize routing requests',
      placeHolder: 'e.g., route, delegate, which agent, who should',
      value: 'route, delegate, intent, agent'
    });

    const keywords = keywordsInput
      ? keywordsInput.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Show summary
    const summary = `
📋 Router Agent Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${name}
ID: ${id}
Role: router 🎯
Domain: ${domain}

🎯 Routing Configuration:
Intents: ${intents.join(', ')}
Keywords: ${keywords.join(', ')}

⚙️ Fixed Configuration:
Skills: search_codebase (only, no file editing)
Delegation: router_split, max 1 handoff
Output: short+diff
Context: 8 files, 8000 chars/file

✅ Invoke: @${id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    const confirm = await vscode.window.showQuickPick(
      ['✅ Create Router', '❌ Cancel'],
      { placeHolder: 'Review and confirm', title: summary }
    );

    if (confirm !== '✅ Create Router') return null;

    const spec: AgentSpec = {
      name,
      description,
      _metadata: {
        id,
        role: 'router',
        domain,
        intents,
        keywords: keywords.length > 0 ? keywords : undefined,
        invocation: {
          aliases: [`@${id}`],
          entrypoint: `agent:${id}`
        },
        context: {
          max_files: 8,
          max_chars_per_file: 8000
        },
        output: {
          mode_default: 'short+diff',
          never_include: ['disclaimers', 'placeholders', 'apologies']
        },
        delegation: {
          strategy: 'router_split',
          max_handoffs: 1
        },
        skills: {
          allowed: ['search_codebase']
        }
      }
    };

    return spec;
  }

  /**
   * Orchestrator-specific wizard (delegation-focused)
   * Orchestrators need: delegation config, subagents, no direct skills
   */
  private async createOrchestratorSpec(basicInfo: { name: string; description: string; role: string }): Promise<AgentSpec | null> {
    const { name, description, role } = basicInfo;

    const id = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    vscode.window.showInformationMessage(
      '🎭 Orchestrator Configuration: Orchestrators coordinate workers. They delegate tasks, not execute them.'
    );

    // Step 1: Domain
    const domainItems = [
      { label: 'backend', description: 'Server-side orchestration' },
      { label: 'frontend', description: 'UI/UX orchestration' },
      { label: 'testing', description: 'Test workflow orchestration' },
      { label: 'devops', description: 'Deployment orchestration' },
      { label: 'fullstack', description: 'Full-stack orchestration' },
      { label: 'global', description: 'Cross-cutting orchestration' }
    ];

    const domainSelection = await vscode.window.showQuickPick(domainItems, {
      placeHolder: '(4/8) Primary domain for orchestration'
    });

    if (!domainSelection) return null;
    const domain = domainSelection.label;

    // Step 2: Subdomains (optional)
    const subdomainsInput = await vscode.window.showInputBox({
      prompt: '(5/8) Subdomains (comma-separated, optional)',
      placeHolder: 'e.g., api, database, auth',
      value: ''
    });

    const subdomains = subdomainsInput
      ? subdomainsInput.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Step 3: Intents (coordination patterns)
    const intentsHelp = 'Examples: feature_implementation, bug_fix_workflow, test_suite_creation';

    const intentsInput = await vscode.window.showInputBox({
      prompt: `(6/8) Coordination Intents (comma-separated)\n${intentsHelp}`,
      placeHolder: 'e.g., feature_implementation, refactoring_workflow, deployment_pipeline',
      validateInput: (value) => {
        if (!value.trim()) return '⚠️ Intents are required';
        return null;
      }
    });

    if (!intentsInput) return null;
    const intents = intentsInput.split(',').map(s => s.trim()).filter(Boolean);

    // Step 4: Path globs (optional)
    const pathGlobsInput = await vscode.window.showInputBox({
      prompt: '(7/8) Path Globs (comma-separated, optional)',
      placeHolder: 'e.g., src/**/*.ts, tests/**/*',
      value: ''
    });

    const path_globs = pathGlobsInput
      ? pathGlobsInput.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Step 5: Keywords
    const keywordsInput = await vscode.window.showInputBox({
      prompt: '(8/8) Keywords (comma-separated)',
      placeHolder: 'e.g., implement, refactor, workflow, pipeline',
      value: ''
    });

    const keywords = keywordsInput
      ? keywordsInput.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Delegation configuration (mandatory for orchestrators)
    vscode.window.showInformationMessage(
      '🔀 Delegation Setup: Orchestrators must delegate. Configure handoff limits and subagents.'
    );

    const maxHandoffsInput = await vscode.window.showInputBox({
      prompt: 'Max handoffs per request (1-3, recommended: 2)',
      value: '2',
      validateInput: (v) => {
        const n = Number(v);
        return !isNaN(n) && n >= 1 && n <= 3 ? null : 'Must be between 1 and 3';
      }
    });

    const maxHandoffs = Number(maxHandoffsInput) || 2;

    const allowedSubagentsInput = await vscode.window.showInputBox({
      prompt: 'Allowed subagents (comma-separated IDs, or leave empty for all)',
      placeHolder: 'e.g., backend-api, frontend-ui, test-runner (or empty = all)',
      value: ''
    });

    const allowedSubagents = allowedSubagentsInput
      ? allowedSubagentsInput.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    // Show summary
    const summary = `
📋 Orchestrator Agent Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${name}
ID: ${id}
Role: orchestrator 🎭
Domain: ${domain}${subdomains.length > 0 ? `
Subdomains: ${subdomains.join(', ')}` : ''}

🎯 Coordination Configuration:
Intents: ${intents.join(', ')}${path_globs.length > 0 ? `
Paths: ${path_globs.join(', ')}` : ''}${keywords.length > 0 ? `
Keywords: ${keywords.join(', ')}` : ''}

🔀 Delegation:
Strategy: router_split
Max handoffs: ${maxHandoffs}${allowedSubagents ? `
Allowed subagents: ${allowedSubagents.join(', ')}` : `
Allowed subagents: all`}

⚙️ Fixed Configuration:
Skills: none (orchestrators delegate, not execute)
Output: short+diff
Context: 8 files, 8000 chars/file

✅ Invoke: @${id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    const confirm = await vscode.window.showQuickPick(
      ['✅ Create Orchestrator', '❌ Cancel'],
      { placeHolder: 'Review and confirm', title: summary }
    );

    if (confirm !== '✅ Create Orchestrator') return null;

    const spec: AgentSpec = {
      name,
      description,
      _metadata: {
        id,
        role: 'orchestrator',
        domain,
        subdomains: subdomains.length > 0 ? subdomains : undefined,
        intents,
        path_globs: path_globs.length > 0 ? path_globs : undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        invocation: {
          aliases: [`@${id}`],
          entrypoint: `agent:${id}`
        },
        context: {
          max_files: 8,
          max_chars_per_file: 8000
        },
        output: {
          mode_default: 'short+diff',
          never_include: ['disclaimers', 'placeholders', 'apologies']
        },
        delegation: {
          strategy: 'router_split',
          max_handoffs: maxHandoffs,
          allowed_subagents: allowedSubagents
        },
        skills: {
          allowed: []  // Orchestrators don't execute, they delegate
        }
      }
    };

    return spec;
  }

  /**
   * Worker-specific wizard (full-featured)
   * Workers need: domain config, skills, optional delegation
   */
  private async createWorkerSpec(basicInfo: { name: string; description: string; role: string }): Promise<AgentSpec | null> {
    const { name, description, role } = basicInfo;

    const id = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    vscode.window.showInformationMessage(
      '🔧 Worker Configuration: Workers execute specific tasks. They have skills and can edit files, run commands, etc.'
    );

    // Step 1: Domain
    const domainItems = [
      { label: 'backend', description: 'Server-side development, APIs, databases' },
      { label: 'frontend', description: 'UI/UX, components, client-side logic' },
      { label: 'testing', description: 'Unit, integration, E2E testing' },
      { label: 'devops', description: 'CI/CD, deployment, infrastructure' },
      { label: 'documentation', description: 'Docs, READMEs, tutorials' },
      { label: 'other', description: 'Custom domain' }
    ];

    const domainSelection = await vscode.window.showQuickPick(domainItems, {
      placeHolder: '(4/9) Select primary domain'
    });

    if (!domainSelection) return null;
    const domain = domainSelection.label;

    // Step 2: Subdomains (optional)
    const subdomainsInput = await vscode.window.showInputBox({
      prompt: '(5/9) Subdomains (comma-separated, optional)',
      placeHolder: domain === 'backend' ? 'e.g., api, database, auth' : 
                   domain === 'frontend' ? 'e.g., components, state, routing' : 
                   'e.g., unit, integration, e2e',
      value: ''
    });

    const subdomains = subdomainsInput
      ? subdomainsInput.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Get preset for suggestions
    const preset = this.getDomainPreset(domain, subdomains[0]);

    // Step 3: Intents (with suggestions)
    const suggestedIntents = preset.intents;
    const intentsHelp = suggestedIntents.length > 0
      ? `\nSuggested: ${suggestedIntents.slice(0, 5).join(', ')}`
      : '';

    const intentsInput = await vscode.window.showInputBox({
      prompt: `(6/9) Intents (comma-separated) - Tasks this worker handles${intentsHelp}`,
      placeHolder: 'e.g., api_design, db_migration, auth_implementation',
      value: suggestedIntents.slice(0, 3).join(', '),
      validateInput: (value) => {
        if (!value.trim()) return '⚠️ Intents are required for routing';
        return null;
      }
    });

    if (!intentsInput) return null;
    const intents = intentsInput.split(',').map(s => s.trim()).filter(Boolean);

    // Step 4: Path Globs (with suggestions)
    const suggestedPaths = preset.paths;
    const pathsHelp = suggestedPaths.length > 0
      ? `\nSuggested: ${suggestedPaths.slice(0, 3).join(', ')}`
      : '';

    const pathGlobsInput = await vscode.window.showInputBox({
      prompt: `(7/9) Path Globs (comma-separated, optional) - Agent activates for these files${pathsHelp}`,
      placeHolder: 'e.g., src/api/**/*.ts, src/controllers/**',
      value: suggestedPaths[0] || ''
    });

    const path_globs = pathGlobsInput
      ? pathGlobsInput.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Step 5: Keywords (with suggestions)
    const suggestedKeywords = preset.keywords;
    const keywordsHelp = suggestedKeywords.length > 0
      ? `\nSuggested: ${suggestedKeywords.slice(0, 5).join(', ')}`
      : '';

    const keywordsInput = await vscode.window.showInputBox({
      prompt: `(8/9) Keywords (comma-separated, optional) - For intent detection${keywordsHelp}`,
      placeHolder: 'e.g., authentication, middleware, database',
      value: suggestedKeywords.slice(0, 3).join(', ')
    });

    const keywords = keywordsInput
      ? keywordsInput.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    // Step 6: Skills (CRITICAL for workers)
    vscode.window.showInformationMessage(
      '🛠️ Skills Selection: Choose what this worker can do. Workers execute tasks with these capabilities.'
    );

    // Get skills from registry (fallback to defaults if registry not loaded)
    let skillsOptions: { label: string; description: string; detail?: string; picked: boolean }[] = [];
    let recommendedSkillIds: string[] = [];

    if (this.skillsRegistry.isLoaded()) {
      // Get all skills valid for worker role
      const availableSkills = this.skillsRegistry.getByRole('worker' as AgentRole);

      // Get recommendations based on domain
      const recommendations = this.skillsRegistry.getRecommendations(domain, 'worker' as AgentRole);
      recommendedSkillIds = recommendations.map(r => r.skill_id);

      // Build skills options
      skillsOptions = availableSkills.map(skill => {
        const isRecommended = recommendedSkillIds.includes(skill.id);
        const isPreset = preset.skills.includes(skill.id);
        
        // Security indicator
        const securityIcon = 
          skill.security_level === 'critical' ? '🔴' :
          skill.security_level === 'elevated' ? '🟡' :
          skill.security_level === 'moderate' ? '🟢' : '';

        // Deprecated indicator
        const deprecatedIcon = skill.deprecated ? '⚠️ ' : '';

        return {
          label: skill.id,
          description: `${securityIcon} ${skill.name}`,
          detail: `${deprecatedIcon}${skill.description}`,
          picked: isRecommended || isPreset
        };
      });

      // Sort: recommended first, then by name
      skillsOptions.sort((a, b) => {
        const aPicked = a.picked ? 0 : 1;
        const bPicked = b.picked ? 0 : 1;
        if (aPicked !== bPicked) return aPicked - bPicked;
        return a.label.localeCompare(b.label);
      });
    } else {
      // Fallback to hardcoded list
      this.logger.warn('Skills registry not loaded, using fallback skills list');
      skillsOptions = [
        { label: 'file_edit', description: '✏️ Edit existing files', picked: preset.skills.includes('file_edit') },
        { label: 'file_create', description: '➕ Create new files', picked: preset.skills.includes('file_create') },
        { label: 'file_delete', description: '🗑️ Delete files', picked: false },
        { label: 'search_codebase', description: '🔍 Search across codebase', picked: preset.skills.includes('search_codebase') },
        { label: 'run_terminal', description: '⚡ Execute terminal commands', picked: preset.skills.includes('run_terminal') },
        { label: 'browser_preview', description: '🌐 Open browser previews', picked: false },
        { label: 'database_query', description: '🗄️ Execute database queries', picked: false }
      ];
    }

    const selectedSkillsResult = await vscode.window.showQuickPick(
      skillsOptions,
      {
        placeHolder: '(9/9) Select allowed skills - Use Space to select multiple',
        canPickMany: true,
        title: '🛠️ Worker Skills (Recommended skills are pre-selected)'
      }
    );

    if (!selectedSkillsResult) return null;
    const allowedSkills = selectedSkillsResult.map(s => s.label);

    if (allowedSkills.length === 0) {
      vscode.window.showWarningMessage('⚠️ No skills selected. Worker will have limited capabilities.');
    }

    // Validate skills with registry
    if (this.skillsRegistry.isLoaded()) {
      const validation = this.skillsRegistry.validateSkills(allowedSkills, 'worker' as AgentRole);
      
      if (!validation.valid) {
        vscode.window.showErrorMessage(
          `⛔ Skill validation failed:\n${validation.errors.join('\n')}`
        );
        return null;
      }

      if (validation.warnings.length > 0) {
        const warningMsg = validation.warnings.join('\n');
        const proceed = await vscode.window.showWarningMessage(
          `⚠️ Skill warnings:\n${warningMsg}\n\nProceed anyway?`,
          'Yes', 'No'
        );
        if (proceed !== 'Yes') return null;
      }

      // Check for and add implied skills
      const impliedSkills = this.skillsRegistry.getImpliedSkills(allowedSkills);
      if (impliedSkills.length > 0) {
        const impliedList = impliedSkills.join(', ');
        const addImplied = await vscode.window.showInformationMessage(
          `ℹ️ Selected skills imply: ${impliedList}\n\nAdd these automatically?`,
          'Yes', 'No'
        );
        if (addImplied === 'Yes') {
          allowedSkills.push(...impliedSkills);
        }
      }
    }

    // Advanced Settings (optional)
    const advancedChoice = await vscode.window.showQuickPick(
      ['Skip (use defaults)', 'Configure output mode & context limits', 'Enable delegation (advanced)'],
      {
        placeHolder: 'Advanced configuration?',
        title: '⚙️ Advanced Settings (Optional)'
      }
    );

    let outputMode: 'short+diff' | 'diff' | 'plan' | 'structured' = 'short+diff';
    let maxFiles = 8;
    let maxCharsPerFile = 8000;
    let enableDelegation = false;
    let maxHandoffs = 2;
    let allowedSubagents: string[] | undefined = undefined;

    if (advancedChoice === 'Configure output mode & context limits') {
      // Output mode
      const outputModeChoice = await vscode.window.showQuickPick([
        { label: 'short+diff', description: '✅ Brief + diffs (recommended, token-efficient)' },
        { label: 'diff', description: 'Only diffs, minimal text' },
        { label: 'structured', description: 'Full structured responses with steps' },
        { label: 'plan', description: 'High-level plan without implementation' }
      ], {
        placeHolder: 'Select default output mode'
      });
      outputMode = (outputModeChoice?.label || 'short+diff') as any;

      // Context limits
      const maxFilesInput = await vscode.window.showInputBox({
        prompt: 'Maximum files in context (default: 8)',
        value: '8',
        validateInput: (v) => !isNaN(Number(v)) && Number(v) > 0 ? null : 'Must be positive number'
      });
      maxFiles = Number(maxFilesInput) || 8;

      const maxCharsInput = await vscode.window.showInputBox({
        prompt: 'Max characters per file (default: 8000 ≈ 2K tokens)',
        value: '8000',
        validateInput: (v) => !isNaN(Number(v)) && Number(v) > 0 ? null : 'Must be positive number'
      });
      maxCharsPerFile = Number(maxCharsInput) || 8000;
    } else if (advancedChoice === 'Enable delegation (advanced)') {
      vscode.window.showInformationMessage(
        '⚠️ Advanced: Workers usually don\'t delegate. Only enable if this worker needs to coordinate sub-tasks.'
      );

      enableDelegation = true;

      const handoffsInput = await vscode.window.showInputBox({
        prompt: 'Max handoffs per request (1-2, default: 2)',
        value: '2',
        validateInput: (v) => {
          const n = Number(v);
          return !isNaN(n) && n >= 1 && n <= 3 ? null : 'Must be between 1 and 3';
        }
      });
      maxHandoffs = Number(handoffsInput) || 2;

      const subagentsInput = await vscode.window.showInputBox({
        prompt: 'Allowed subagents (comma-separated IDs, or empty = all)',
        placeHolder: 'e.g., test-runner, code-reviewer',
        value: ''
      });

      allowedSubagents = subagentsInput
        ? subagentsInput.split(',').map(s => s.trim()).filter(Boolean)
        : undefined;
    }

    // Show summary
    const advancedSummary = advancedChoice !== 'Skip (use defaults)' ? `

⚙️ Advanced Configuration:
Output: ${outputMode} | Context: ${maxFiles} files, ${maxCharsPerFile} chars/file${enableDelegation ? `
Delegation: Yes (max ${maxHandoffs} handoffs)${allowedSubagents ? `
Allowed subagents: ${allowedSubagents.join(', ')}` : ''}` : ''}` : '';

    const summary = `
📋 Worker Agent Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${name}
ID: ${id}
Role: worker 🔧
Domain: ${domain}${subdomains.length > 0 ? `
Subdomains: ${subdomains.join(', ')}` : ''}

🎯 Task Configuration:
Intents: ${intents.join(', ')}${path_globs.length > 0 ? `
Paths: ${path_globs.join(', ')}` : ''}${keywords.length > 0 ? `
Keywords: ${keywords.join(', ')}` : ''}

🛠️ Skills:
${allowedSkills.join(', ')}${advancedSummary}

✅ Invoke: @${id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    const confirm = await vscode.window.showQuickPick(
      ['✅ Create Worker', '❌ Cancel'],
      { placeHolder: 'Review and confirm', title: summary }
    );

    if (confirm !== '✅ Create Worker') return null;

    const spec: AgentSpec = {
      name,
      description,
      _metadata: {
        id,
        role: 'worker',
        domain,
        subdomains: subdomains.length > 0 ? subdomains : undefined,
        intents,
        path_globs: path_globs.length > 0 ? path_globs : undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        invocation: {
          aliases: [`@${id}`],
          entrypoint: `agent:${id}`
        },
        context: {
          max_files: maxFiles,
          max_chars_per_file: maxCharsPerFile
        },
        output: {
          mode_default: outputMode,
          max_bullets: outputMode === 'structured' ? 10 : undefined,
          schema: outputMode === 'structured' ? ['steps', 'code', 'explanation'] : undefined,
          never_include: ['disclaimers', 'placeholders', 'apologies']
        },
        delegation: enableDelegation ? {
          strategy: 'router_split',
          max_handoffs: maxHandoffs,
          allowed_subagents: allowedSubagents
        } : undefined,
        skills: {
          allowed: allowedSkills
        }
      }
    };

    return spec;
  }

  /**
   * Save spec to file
   */
  async saveSpec(spec: AgentSpec, specsDir: string): Promise<string> {
    const fileName = `${spec._metadata.id}.yml`;
    const filePath = path.join(specsDir, fileName);

    // Ensure specs directory exists
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }

    const yamlContent = YAML.stringify(spec, { indent: 2 });
    fs.writeFileSync(filePath, yamlContent, 'utf-8');

    this.logger.info(`Saved spec: ${filePath}`);
    return filePath;
  }

  /**
   * Normalize spec (same logic as CLI)
   */
  private normalizeSpec(spec: any): AgentSpec {
    const meta = spec._metadata || {};
    
    // Auto-generate ID if not provided
    if (!meta.id && spec.name) {
      meta.id = spec.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    return {
      name: spec.name || 'Unnamed Agent',
      description: spec.description || '',
      _metadata: {
        id: meta.id || 'unknown-agent',
        role: meta.role || 'worker',
        domain: meta.domain || 'general',
        subdomains: meta.subdomains || [],
        intents: meta.intents || [],
        path_globs: meta.path_globs,
        keywords: meta.keywords,
        output: meta.output,
        verification: meta.verification
      },
      instructions: spec.instructions
    };
  }

  /**
   * Render template with spec data
   */
  private renderTemplate(spec: AgentSpec): string {
    let content = this.templateContent;
    const meta = spec._metadata;

    // Add DO NOT EDIT banner
    const banner = `<!--
⚠️  WARNING: DO NOT EDIT THIS FILE MANUALLY

This file is auto-generated from: specs/${meta.id}.yml
To modify this agent, edit the spec file and run:
- Agent Team: Generate Agent from Spec
- Agent Team: Sync Agents to .github/

Manual edits will be overwritten on next sync.
-->

`;

    // Replace frontmatter
    const frontmatter = `---
name: "${spec.name}"
description: "${spec.description}"
---`;
    
    content = content.replace(/^---\n[\s\S]*?\n---/, frontmatter);

    // Add banner after frontmatter
    content = content.replace(frontmatter, frontmatter + '\n\n' + banner);

    // Replace metadata placeholders
    content = content.replace(/{{_metadata\.id}}/g, meta.id);
    content = content.replace(/{{_metadata\.domain}}/g, meta.domain);
    content = content.replace(/{{_metadata\.role}}/g, meta.role);
    content = content.replace(/{{_metadata\.intents}}/g, meta.intents.join(', '));

    // Add invocation info
    const invocationInfo = meta.invocation
      ? `\n- Aliases: ${meta.invocation.aliases.join(', ')}\n- Entrypoint: ${meta.invocation.entrypoint}`
      : '';

    // Add context limits
    const contextInfo = meta.context
      ? `\n\n## Context Limits\n- Max files: ${meta.context.max_files}\n- Max chars per file: ${meta.context.max_chars_per_file}`
      : '';

    // Add output config
    const outputInfo = meta.output
      ? `\n\n## Output Configuration\n- Mode: ${meta.output.mode_default}\n- Never include: ${meta.output.never_include?.join(', ') || 'none'}`
      : '';

    // Add delegation (for orchestrators)
    const delegationInfo = meta.delegation
      ? `\n\n## Delegation Rules\n- Strategy: ${meta.delegation.strategy}\n- Max handoffs: ${meta.delegation.max_handoffs}\n\n### Handoff Request Format\n\`\`\`json\n{\n  "action": "delegate",\n  "target_agent": "agent-id",\n  "subtask": "Specific task description",\n  "context": {"key": "value"}\n}\n\`\`\`\n`
      : '';

    // Add skills whitelist
    const skillsInfo = meta.skills?.allowed
      ? `\n\n## Allowed Skills\n${meta.skills.allowed.map(s => `- ${s}`).join('\n')}`
      : '';

    // Handle conditional blocks
    if (meta.subdomains && meta.subdomains.length > 0) {
      const subdomainsText = meta.subdomains.map(s => `  - ${s}`).join('\n');
      content = content.replace(
        /{{#if _metadata\.subdomains}}[\s\S]*?{{\/if}}/g,
        `- Subdomains:\n${subdomainsText}`
      );
    } else {
      content = content.replace(/{{#if _metadata\.subdomains}}[\s\S]*?{{\/if}}/g, '');
    }

    // Inject additional sections before guidelines
    content = content.replace(
      /# Guidelines/,
      `${invocationInfo}${contextInfo}${outputInfo}${delegationInfo}${skillsInfo}\n\n# Guidelines`
    );

    // Remove remaining template syntax
    content = content.replace(/{{[^}]+}}/g, '');
    content = content.replace(/{{#if[^}]+}}[\s\S]*?{{\/if}}/g, '');
    content = content.replace(/{{#each[^}]+}}[\s\S]*?{{\/each}}/g, '');

    return content;
  }

  /**
   * Get default embedded template
   */
  private getDefaultTemplate(): string {
    return `---
name: "Agent Name"
description: "Agent description"
---

<!--
Metadata for agent-teams tooling:
- ID: {{_metadata.id}}
- Domain: {{_metadata.domain}}
- Role: {{_metadata.role}}
- Intents: {{_metadata.intents}}
-->

# Capabilities

This agent specializes in {{_metadata.domain}} tasks.

## Supported Intents
{{#each _metadata.intents}}
- {{this}}
{{/each}}

# Response Format

Provide clear, actionable responses with:
- Step-by-step instructions
- Code examples when relevant
- Best practices

# Guidelines

- Be concise but thorough
- Use domain-specific terminology
- Provide working code examples
`;
  }
}
