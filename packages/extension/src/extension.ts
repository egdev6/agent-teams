import * as fs from 'node:fs';
import * as path from 'node:path';
import { setSchemaBasePath } from '@agent-teams/core';
import * as vscode from 'vscode';
import YAML from 'yaml';
import { AgentGenerator } from './agentGenerator';
import { AgentLoader } from './agentLoader';
import { CatalogManager } from './catalogManager';
import {
  CreateAgentCommand,
  CreateTeamCommand,
  DeleteAgentCommand,
  InitProfileCommand,
  ListTeamsCommand,
  OpenDashboardCommand,
  SaveProfileCommand,
  SetupEngramCommand,
  SyncAgentsCommand,
} from './commands';
import { CommandRegistry } from './commands/base/CommandRegistry';
import { TaskCoordinator } from './coordination/TaskCoordinator';
import { Logger } from './logger';
import { AgentRouter } from './router';
import { CompleteSubtaskTool } from './tools/CompleteSubtaskTool';
import { CopyBundledSkillsTool } from './tools/CopyBundledSkillsTool';
import { DispatchParallelTool } from './tools/DispatchParallelTool';
import { FetchCommunitySkillsTool } from './tools/FetchCommunitySkillsTool';
import { HandoffTool } from './tools/HandoffTool';
import { PhasePickerTool } from './tools/PhasePickerTool';
import { ReadWorkspaceFileTool } from './tools/ReadWorkspaceFileTool';
import { SyncContextFilesTool } from './tools/SyncContextFilesTool';
import type { ExtensionConfig } from './types';

// Constants
const DEFAULT_AGENTS_PATH = '.github/agents';
const DEFAULT_LOG_LEVEL = 'info';
const CHAT_PARTICIPANT_PREFIX = 'agent-teams';
const MAX_SUGGESTIONS_DISPLAY = 3;
const SIDEBAR_VIEW_ID = 'agentTeams.sidebar';

// Extension state
let logger: Logger;
let agentLoader: AgentLoader;
let router: AgentRouter;
let generator: AgentGenerator;
let commandRegistry: CommandRegistry;
let catalogManager: CatalogManager;
let taskCoordinator: TaskCoordinator | undefined;
let extensionContext: vscode.ExtensionContext;

class EmptySidebarProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.ProviderResult<vscode.TreeItem[]> {
    return [];
  }
}

/**
 * Activate the Agent Team extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Agent Team extension is activating...');

  // Override schema base path so file-system lookups resolve correctly when
  // the extension is bundled by esbuild (where __dirname points to dist/).
  setSchemaBasePath(path.join(context.extensionPath, 'dist', 'schemas'));

  try {
    extensionContext = context;

    // Initialize logger
    const config = getConfig();
    logger = new Logger(config.logLevel);
    logger.info('Agent Team extension activated');

    // Initialize components
    agentLoader = new AgentLoader(logger);
    router = new AgentRouter(agentLoader, logger);
    generator = new AgentGenerator(logger);
    catalogManager = new CatalogManager(context, logger);

    // Initialize generator
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      await generator.initialize(workspaceFolders[0].uri.fsPath);
    }

    // Load bundled agents eagerly so chat participants can resolve them immediately
    // on first invocation, before the workspace async load completes.
    await _loadBundledAgents();

    // Materialise bundled agents as Claude Code slash commands (.claude/commands/)
    if (workspaceFolders && workspaceFolders.length > 0) {
      try {
        materializeBundledAgentsAsClaudeCommands(workspaceFolders[0].uri.fsPath);
      } catch (error) {
        logger.warn('Failed to materialise bundled agents as Claude commands (non-fatal):', error);
      }
    }

    // Materialise bundled agents as OpenCode agents (.opencode/agents/)
    // Only if OpenCode is installed
    if (workspaceFolders && workspaceFolders.length > 0) {
      try {
        if (_isOpencodeInstalled()) {
          materializeBundledAgentsAsOpencodeAgents(workspaceFolders[0].uri.fsPath);
        }
      } catch (error) {
        logger.warn('Failed to materialise bundled agents as OpenCode agents (non-fatal):', error);
      }
    }

    // Load agents from workspace (may override bundled agents; runs async)
    void loadAgentsFromWorkspace();

    // Setup command registry (must run before anything that could throw)
    setupCommandRegistry(context);
    registerSidebarAutoOpen(context);

    // Register chat participants (non-critical: failure must not break commands)
    try {
      registerChatParticipants(context);
    } catch (error) {
      logger.warn('Chat participant registration failed (non-fatal):', error);
    }

    // Start TaskCoordinator (fan-in observer for parallel dispatches)
    if (workspaceFolders && workspaceFolders.length > 0) {
      taskCoordinator = new TaskCoordinator(workspaceFolders[0].uri.fsPath);
      taskCoordinator.startWatching();
      context.subscriptions.push(taskCoordinator);
    }

    // Register LM tools
    registerLanguageModelTools(context);

    // Register legacy commands (will be migrated gradually)
    registerLegacyCommands(context);

    // Watch for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('agentTeams')) {
          const newConfig = getConfig();
          logger.setLogLevel(newConfig.logLevel);
          logger.info('Configuration updated');

          if (e.affectsConfiguration('agentTeams.agentsPath')) {
            void loadAgentsFromWorkspace();
          }
        }
      }),
    );

    logger.info('Agent Team extension ready');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger?.error('Failed to activate extension:', error);
    void vscode.window.showErrorMessage(`Agent Team extension activation failed: ${errorMessage}`);
    throw error;
  }
}

function registerSidebarAutoOpen(context: vscode.ExtensionContext): void {
  const sidebarView = vscode.window.createTreeView(SIDEBAR_VIEW_ID, {
    treeDataProvider: new EmptySidebarProvider(),
    showCollapseAll: false,
  });

  let openingDashboard = false;
  context.subscriptions.push(
    sidebarView,
    sidebarView.onDidChangeVisibility(async () => {
      if (!sidebarView.visible || openingDashboard) return;

      openingDashboard = true;
      try {
        await vscode.commands.executeCommand('agent-teams.openDashboard');
      } finally {
        openingDashboard = false;
      }
    }),
  );
}

/**
 * Get extension configuration
 */
function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('agentTeams');
  return {
    agentsPath: config.get('agentsPath', DEFAULT_AGENTS_PATH),
    enableAutoRouting: config.get('enableAutoRouting', true),
    enablePathMatching: config.get('enablePathMatching', true),
    logLevel: config.get('logLevel', DEFAULT_LOG_LEVEL),
  };
}

/**
 * Read bundled_resources configuration from project.profile.yml.
 * Returns an object with agent IDs mapped to their enabled state.
 * Defaults to all enabled if profile doesn't exist or field is missing.
 */
function _getBundledResourcesConfig(workspaceRoot: string): {
  agents: Record<string, boolean>;
  skills: Record<string, boolean>;
} {
  const defaults = {
    agents: {
      'agent-designer': true,
      consultant: true,
      'project-configurator': true,
    },
    skills: {
      'agent-spec-authoring': true,
      'project-spec-authoring': true,
    },
  };

  try {
    const profilePath = path.join(workspaceRoot, '.agent-teams', 'project.profile.yml');
    if (!fs.existsSync(profilePath)) {
      return defaults;
    }

    const content = fs.readFileSync(profilePath, 'utf-8');
    const profile = YAML.parse(content);

    if (!profile?.bundled_resources) {
      return defaults;
    }

    return {
      agents: { ...defaults.agents, ...(profile.bundled_resources.agents || {}) },
      skills: { ...defaults.skills, ...(profile.bundled_resources.skills || {}) },
    };
  } catch (error) {
    logger.warn('Failed to read bundled_resources config, using defaults:', error);
    return defaults;
  }
}

/**
 * Load bundled agents (agent-designer) as fallbacks.
 * Only registers an agent if no workspace agent with the same id is already loaded
 * and if the agent is enabled in bundled_resources configuration.
 */
async function _loadBundledAgents(): Promise<void> {
  const bundledDir = path.join(extensionContext.extensionPath, 'dist', 'media', 'bundled-agents');

  if (!fs.existsSync(bundledDir)) {
    return;
  }

  // Get workspace root to read config
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const config =
    workspaceFolders && workspaceFolders.length > 0
      ? _getBundledResourcesConfig(workspaceFolders[0].uri.fsPath)
      : {
          agents: {
            'agent-designer': true,
            consultant: true,
            'project-configurator': true,
          },
          skills: {
            'agent-spec-authoring': true,
            'project-spec-authoring': true,
          },
        };

  const files = fs
    .readdirSync(bundledDir)
    .filter(
      (f: string) =>
        f.endsWith('.yml') || f.endsWith('.yaml') || f.endsWith('.agent.md') || f.endsWith('.md'),
    );

  for (const file of files) {
    try {
      const filePath = path.join(bundledDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(file).toLowerCase();
      let spec: ReturnType<typeof YAML.parse>;

      if (ext === '.yml' || ext === '.yaml') {
        spec = YAML.parse(content);
      } else {
        // .agent.md / .md: extract YAML frontmatter + markdown body as instructions
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
          logger.warn(`No frontmatter in bundled agent ${file} — skipping`);
          continue;
        }
        spec = YAML.parse(frontmatterMatch[1]);
        const body = content.slice(frontmatterMatch[0].length).trim();
        if (body) spec.instructions = body;
      }

      // Check if agent is enabled in config
      if (spec?.id && config.agents[spec.id] === false) {
        logger.info(`Skipping disabled bundled agent: ${spec.id}`);
        continue;
      }

      if (spec?.id && !agentLoader.getAgent(spec.id)) {
        agentLoader.registerAgent(spec);
        logger.info(`Loaded bundled agent: ${spec.id}`);
      }
    } catch (error) {
      logger.warn(`Failed to load bundled agent ${file}:`, error);
    }
  }
}

/**
 * Strip YAML frontmatter from skill content so only the instructional body
 * is included in the compiled command (frontmatter is skill metadata, not
 * instructions for Claude).
 */
function _stripSkillFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

/**
 * Derive the Claude Code `allowed-tools` value from an agent spec's declared tools.
 * Maps AgentSpec tool names to the Claude Code tool identifiers.
 */
function _deriveAllowedTools(specTools: Array<{ name: string } | string> | undefined): string {
  if (!specTools?.length) return 'Read';

  const toolMap: Record<string, string> = {
    read: 'Read',
    edit: 'Edit, Write',
    search: 'Glob, Grep',
    web: 'WebSearch, WebFetch',
    execute: 'Bash',
    todo: 'TodoWrite',
    agent: 'Agent',
  };

  const mapped = new Set<string>(['Read']);
  for (const t of specTools) {
    const name = (typeof t === 'string' ? t : t.name).toLowerCase().split('/').pop() ?? '';
    const resolved = toolMap[name];
    if (resolved) {
      for (const r of resolved.split(', ')) mapped.add(r);
    }
  }
  return [...mapped].join(', ');
}

/**
 * Compile a bundled agent spec into a Claude Code slash command and write it to
 * `.claude/commands/{agent-id}.md` in the workspace root.
 *
 * Files are always overwritten — they are extension-managed and regenerated on
 * each activation to pick up spec updates.
 * Respects bundled_resources configuration from project.profile.yml.
 */
function materializeBundledAgentsAsClaudeCommands(workspaceRoot: string): void {
  const bundledDir = path.join(extensionContext.extensionPath, 'dist', 'media', 'bundled-agents');
  if (!fs.existsSync(bundledDir)) return;

  const commandsDir = path.join(workspaceRoot, '.claude', 'commands');
  fs.mkdirSync(commandsDir, { recursive: true });

  // Read bundled_resources config
  const config = _getBundledResourcesConfig(workspaceRoot);

  const files = fs
    .readdirSync(bundledDir)
    .filter((f: string) => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(bundledDir, file), 'utf-8');
      const spec = YAML.parse(content);
      if (!spec?.id) continue;

      // Skip if agent is disabled
      if (config.agents[spec.id] === false) {
        logger.info(`Skipping disabled bundled agent for Claude Code: ${spec.id}`);
        // Remove command file if it exists
        const commandPath = path.join(commandsDir, `${spec.id}.md`);
        if (fs.existsSync(commandPath)) {
          fs.unlinkSync(commandPath);
          logger.info(`Removed Claude Code command file for disabled agent: ${spec.id}`);
        }
        continue;
      }

      // Inline skills stripping their frontmatter — only the instructional body
      const skillSections = (spec.skills ?? [])
        .map((s: { id: string } | string) => {
          const raw = resolveSkillContent(typeof s === 'string' ? s : s.id, workspaceRoot);
          return raw ? _stripSkillFrontmatter(raw) : null;
        })
        .filter((c: string | null): c is string => c !== null);

      // VS Code LM tool names that don't exist in Claude Code — strip workflow steps and
      // constraint entries that reference them.
      const VSCODE_ONLY_TOOLS = [
        'agent-teams-copy-bundled-skills',
        'agent-teams-sync-context-files',
        'agent-teams-handoff',
        'agent-teams-dispatch-parallel',
        'agent-teams-complete-subtask',
        'agent-teams-phase-picker',
        'fetch-community-skills',
      ];
      const _isVsCodeOnly = (text: string) => VSCODE_ONLY_TOOLS.some((t) => text.includes(t));

      const claudeWorkflow = (spec.workflow ?? []).filter((step: string) => !_isVsCodeOnly(step));

      const filterConstraints = (items: string[] | undefined) =>
        (items ?? []).filter((c: string) => !_isVsCodeOnly(c));

      const constraintParts: string[] = [];
      if (spec.constraints?.always?.length) {
        const filtered = filterConstraints(spec.constraints.always);
        if (filtered.length) {
          constraintParts.push(`## Always\n${filtered.map((c: string) => `- ${c}`).join('\n')}`);
        }
      }
      if (spec.constraints?.never?.length) {
        const filtered = filterConstraints(spec.constraints.never);
        if (filtered.length) {
          constraintParts.push(`## Never\n${filtered.map((c: string) => `- ${c}`).join('\n')}`);
        }
      }

      const bodysections = [
        `You are **${spec.name}**. ${spec.description}`,
        constraintParts.join('\n\n'),
        ...skillSections,
        claudeWorkflow.length
          ? `## Workflow\n${claudeWorkflow.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n\n')}`
          : '',
      ].filter(Boolean);

      const allowedTools = _deriveAllowedTools(spec.tools);
      const frontmatter = [
        '---',
        `description: ${spec.description?.split('\n')[0]?.trim() ?? spec.name}`,
        `allowed-tools: ${allowedTools}`,
        '---',
      ].join('\n');

      const commandContent = [frontmatter, bodysections.join('\n\n')].join('\n\n');

      const outPath = path.join(commandsDir, `${spec.id}.md`);
      fs.writeFileSync(outPath, commandContent, 'utf-8');
      logger.info(`Materialised bundled agent as Claude command: ${spec.id}`);
    } catch (error) {
      logger.warn(`Failed to materialise bundled agent ${file} as Claude command:`, error);
    }
  }
}

/**
 * Compile bundled agent specs into OpenCode agent files and write them to
 * `.opencode/agents/{agent-id}.md` in the workspace root.
 *
 * Similar to materializeBundledAgentsAsClaudeCommands but uses OpenCode frontmatter
 * format (mode, permissions.edit/bash, model) and writes to .opencode/agents/ instead.
 *
 * Non-destructive: only materializes agents with 'opencode' in their targets array.
 * Re-runs each activation to pick up spec updates.
 * Respects bundled_resources configuration from project.profile.yml.
 */
function materializeBundledAgentsAsOpencodeAgents(workspaceRoot: string): void {
  const bundledDir = path.join(extensionContext.extensionPath, 'dist', 'media', 'bundled-agents');
  if (!fs.existsSync(bundledDir)) return;

  const agentsDir = path.join(workspaceRoot, '.opencode', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  // Read bundled_resources config
  const config = _getBundledResourcesConfig(workspaceRoot);

  const files = fs
    .readdirSync(bundledDir)
    .filter((f: string) => f.endsWith('.yml') || f.endsWith('.yaml'));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(bundledDir, file), 'utf-8');
      const spec = YAML.parse(content);
      if (!spec?.id) continue;

      // Only process agents that explicitly target opencode
      if (!spec.targets?.includes('opencode')) continue;

      // Skip if agent is disabled
      if (config.agents[spec.id] === false) {
        logger.info(`Skipping disabled bundled agent for OpenCode: ${spec.id}`);
        // Remove agent file if it exists
        const agentPath = path.join(agentsDir, `${spec.id}.md`);
        if (fs.existsSync(agentPath)) {
          fs.unlinkSync(agentPath);
          logger.info(`Removed OpenCode agent file for disabled agent: ${spec.id}`);
        }
        continue;
      }

      // Inline skills stripping their frontmatter — only the instructional body
      const skillSections = (spec.skills ?? [])
        .map((s: { id: string } | string) => {
          const raw = resolveSkillContent(typeof s === 'string' ? s : s.id, workspaceRoot);
          return raw ? _stripSkillFrontmatter(raw) : null;
        })
        .filter((c: string | null): c is string => c !== null);

      // Derive mode from role and topology
      let mode: string;
      if (spec.role === 'orchestrator') {
        mode = 'primary';
      } else if (spec.role === 'router') {
        mode = 'all';
      } else {
        const receivesFrom = spec.handoffs?.receives_from ?? [];
        mode = receivesFrom.length > 0 ? 'subagent' : 'all';
      }

      // Derive permissions from can_edit_files and can_run_commands
      const perms = spec.permissions ?? {};
      const editPerm =
        perms.can_edit_files === true ? 'allow' : perms.can_edit_files === false ? 'deny' : 'ask';
      const bashPerm =
        perms.can_run_commands === true
          ? 'allow'
          : perms.can_run_commands === false
            ? 'deny'
            : 'ask';

      // Build OpenCode frontmatter
      const frontmatterLines = [
        '---',
        `description: ${spec.description?.split('\n')[0]?.trim() ?? spec.name}`,
        `mode: ${mode}`,
        'permissions:',
        `  edit: ${editPerm}`,
        `  bash: ${bashPerm}`,
      ];

      if (spec.opencode_model) {
        frontmatterLines.push(`model: ${spec.opencode_model}`);
      }

      frontmatterLines.push('---', '');

      // Build body (similar to Claude but cleaner for OpenCode)
      const bodyParts = [`# ${spec.name}`, '', spec.description, '', ...skillSections];

      // Add workflow if exists
      if (spec.workflow?.length) {
        bodyParts.push('', '## Workflow');
        for (let i = 0; i < spec.workflow.length; i++) {
          bodyParts.push(`${i + 1}. ${spec.workflow[i]}`);
        }
      }

      // Add constraints if exist
      if (spec.constraints?.always?.length || spec.constraints?.never?.length) {
        bodyParts.push('', '## Constraints');
        if (spec.constraints.always?.length) {
          bodyParts.push('', '### Always');
          for (const c of spec.constraints.always) {
            bodyParts.push(`- ${c}`);
          }
        }
        if (spec.constraints.never?.length) {
          bodyParts.push('', '### Never');
          for (const c of spec.constraints.never) {
            bodyParts.push(`- ${c}`);
          }
        }
      }

      const agentContent = [...frontmatterLines, ...bodyParts].join('\n');

      const outPath = path.join(agentsDir, `${spec.id}.md`);
      fs.writeFileSync(outPath, agentContent, 'utf-8');
      logger.info(`Materialised bundled agent as OpenCode agent: ${spec.id}`);
    } catch (error) {
      logger.warn(`Failed to materialise bundled agent ${file} as OpenCode agent:`, error);
    }
  }
}

/**
 * Check if OpenCode CLI is installed by running 'opencode --version'
 */
function _isOpencodeInstalled(): boolean {
  try {
    const { execSync } = require('node:child_process');
    execSync('opencode --version', { timeout: 3000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Load agents from workspace
 */
async function loadAgentsFromWorkspace(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    logger.warn('No workspace folder open');
    return;
  }

  const config = getConfig();
  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  try {
    await agentLoader.loadAgents(workspaceRoot, config.agentsPath);

    const agents = agentLoader.getAllAgents();
    if (agents.length > 0) {
      void vscode.window.showInformationMessage(`Agent Team: Loaded ${agents.length} agent(s)`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to load agents:', error);
    void vscode.window.showErrorMessage(`Agent Team: Failed to load agents - ${errorMessage}`);
  }

  // Load bundled agents as fallback (after workspace agents, so workspace overrides bundled)
  await _loadBundledAgents();
}

/**
 * Register chat participants for agents
 */
function registerChatParticipants(context: vscode.ExtensionContext): void {
  if (!vscode.chat?.createChatParticipant) {
    logger.warn('VS Code Chat API not available, skipping chat participant registration');
    return;
  }

  // Register router participant (@router) — declared in package.json contributes.chatParticipants
  const routerHandler: vscode.ChatRequestHandler = async (request, chatContext, stream, token) => {
    return await handleRouterRequest(request, chatContext, stream, token);
  };

  const routerParticipant = vscode.chat.createChatParticipant(
    `${CHAT_PARTICIPANT_PREFIX}.router`,
    routerHandler,
  );
  routerParticipant.iconPath = new vscode.ThemeIcon('organization');
  context.subscriptions.push(routerParticipant);

  // Register agent-designer participant (@agent-designer)
  const agentDesignerHandler: vscode.ChatRequestHandler = async (
    request,
    chatContext,
    stream,
    token,
  ) => {
    return await handleAgentRequest('agent-designer', request, chatContext, stream, token);
  };
  const agentDesignerParticipant = vscode.chat.createChatParticipant(
    `${CHAT_PARTICIPANT_PREFIX}.agent-designer`,
    agentDesignerHandler,
  );
  agentDesignerParticipant.iconPath = new vscode.ThemeIcon('edit');
  context.subscriptions.push(agentDesignerParticipant);

  // Register project-configurator participant (@project-configurator)
  const projectConfiguratorHandler: vscode.ChatRequestHandler = async (
    request,
    chatContext,
    stream,
    token,
  ) => {
    return await handleAgentRequest('project-configurator', request, chatContext, stream, token);
  };
  const projectConfiguratorParticipant = vscode.chat.createChatParticipant(
    `${CHAT_PARTICIPANT_PREFIX}.project-configurator`,
    projectConfiguratorHandler,
  );
  projectConfiguratorParticipant.iconPath = new vscode.ThemeIcon('search');
  context.subscriptions.push(projectConfiguratorParticipant);

  // Register consultant participant (@consultant)
  const consultantHandler: vscode.ChatRequestHandler = async (
    request,
    chatContext,
    stream,
    token,
  ) => {
    return await handleAgentRequest('consultant', request, chatContext, stream, token);
  };
  const consultantParticipant = vscode.chat.createChatParticipant(
    `${CHAT_PARTICIPANT_PREFIX}.consultant`,
    consultantHandler,
  );
  consultantParticipant.iconPath = new vscode.ThemeIcon('lightbulb');
  context.subscriptions.push(consultantParticipant);
}

/**
 * Get appropriate icon for agent domain
 */
function _getIconForDomain(domain: string): string {
  const icons: Record<string, string> = {
    backend: 'server',
    frontend: 'browser',
    database: 'database',
    testing: 'beaker',
    docs: 'book',
    global: 'globe',
  };
  return icons[domain] || 'robot';
}

/**
 * Handle routing requests to appropriate agent
 */
async function handleRouterRequest(
  request: vscode.ChatRequest,
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
): Promise<void> {
  const config = getConfig();

  if (!config.enableAutoRouting) {
    stream.markdown('Auto-routing is disabled. Please invoke a specific agent with @agent-name.');
    return;
  }

  const currentFile = vscode.window.activeTextEditor?.document.fileName;

  stream.progress('Analyzing request and routing to best agent...');

  try {
    const selectedAgent = await router.route(request.prompt, currentFile);

    if (!selectedAgent) {
      stream.markdown('❌ No suitable agent found for this request.\n\n');

      // Show suggestions
      const suggestions = await router.getSuggestions(request.prompt, currentFile);
      if (suggestions.length > 0) {
        stream.markdown('**Suggested agents:**\n');
        for (const suggestion of suggestions.slice(0, MAX_SUGGESTIONS_DISPLAY)) {
          const agent = agentLoader.getAgent(suggestion.agentId);
          stream.markdown(
            `- @${suggestion.agentId} (${agent?.name}) - Score: ${suggestion.score}\n`,
          );
        }
      }
      return;
    }

    stream.markdown(`🎯 **Routing to: ${selectedAgent.name}** (@${selectedAgent.id})\n\n`);

    // Delegate to selected agent
    await handleAgentRequest(selectedAgent.id, request, chatContext, stream, token);
  } catch (error) {
    logger.error('Router error:', error);
    stream.markdown('❌ Routing failed. Please try invoking an agent directly.');
  }
}

/**
 * Handle request for a specific agent
 */
/**
 * Resolve SKILL.md content for a skill ID.
 * Checks the workspace .agent-teams/skills/ directory first, then falls back
 * to the bundled-skills directory shipped with the extension.
 */
function resolveSkillContent(skillId: string, workspaceRoot: string | undefined): string | null {
  // 1. Workspace-local skill takes precedence
  if (workspaceRoot) {
    const workspacePath = path.join(workspaceRoot, '.agent-teams', 'skills', skillId, 'SKILL.md');
    if (fs.existsSync(workspacePath)) {
      return fs.readFileSync(workspacePath, 'utf-8');
    }
  }

  // 2. Bundled skill shipped with the extension
  const bundledPath = path.join(
    extensionContext.extensionPath,
    'dist',
    'media',
    'bundled-skills',
    skillId,
    'SKILL.md',
  );
  if (fs.existsSync(bundledPath)) {
    return fs.readFileSync(bundledPath, 'utf-8');
  }

  return null;
}

async function handleAgentRequest(
  agentId: string,
  request: vscode.ChatRequest,
  chatContext: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
): Promise<void> {
  let agent = agentLoader.getAgent(agentId);

  // Bundled agents can be cleared by a concurrent workspace reload (agentLoader.loadAgents
  // calls agents.clear() synchronously). Re-load them on-demand as a safeguard.
  if (!agent) {
    await _loadBundledAgents();
    agent = agentLoader.getAgent(agentId);
  }

  if (!agent) {
    const bundledDir = path.join(extensionContext.extensionPath, 'dist', 'media', 'bundled-agents');
    const allLoaded = agentLoader.getAllAgents().map((a) => a.id);
    stream.markdown(
      `❌ Agent not found: \`${agentId}\`\n\n` +
        `**Debug info:**\n` +
        `- Bundled agents dir: \`${bundledDir}\`\n` +
        `- Dir exists: \`${fs.existsSync(bundledDir)}\`\n` +
        `- Loaded agents: ${allLoaded.length > 0 ? allLoaded.map((id) => `\`${id}\``).join(', ') : '_(none)_'}\n`,
    );
    return;
  }

  logger.info(`Handling request for agent: ${agentId}`);

  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // Anchor the agent to the workspace root so it does not wander into external directories.
    const workspaceContext = workspaceRoot
      ? `WORKSPACE ROOT: ${workspaceRoot}\nAll file and directory operations MUST be restricted to this workspace root. Do NOT access paths outside this directory.`
      : '';

    // Dynamic assembly from AgentSpec fields.
    const skillSections = (agent.skills ?? [])
      .map((s) => resolveSkillContent(s.id, workspaceRoot))
      .filter((c): c is string => c !== null);

    const constraintParts: string[] = [];
    if (agent.constraints?.always?.length) {
      constraintParts.push(`Always:\n${agent.constraints.always.map((c) => `- ${c}`).join('\n')}`);
    }
    if (agent.constraints?.never?.length) {
      constraintParts.push(`Never:\n${agent.constraints.never.map((c) => `- ${c}`).join('\n')}`);
    }
    const constraintsSection = constraintParts.join('\n\n');

    // Order matters: constraints and skill knowledge come before the workflow so the
    // model reads behavioural rules and format knowledge before executing steps.
    const agentInstructions = [
      `You are ${agent.name}. ${agent.description}`,
      workspaceContext,
      constraintsSection,
      ...skillSections,
      agent.workflow?.length
        ? `Workflow:\n${agent.workflow.map((s, i) => `${i + 1}. ${s}`).join('\n\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    // Build the message list. The agent instructions go first as a system-level
    // user message, followed by the conversation history so multi-turn context is
    // preserved, then the current user prompt.
    const historyMessages: vscode.LanguageModelChatMessage[] = [];
    for (const turn of chatContext.history) {
      if (turn instanceof vscode.ChatRequestTurn) {
        historyMessages.push(vscode.LanguageModelChatMessage.User(turn.prompt));
      } else if (turn instanceof vscode.ChatResponseTurn) {
        const text = turn.response
          .map((part) => (part instanceof vscode.ChatResponseMarkdownPart ? part.value.value : ''))
          .filter(Boolean)
          .join('');
        if (text) {
          historyMessages.push(vscode.LanguageModelChatMessage.Assistant(text));
        }
      }
    }

    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(agentInstructions),
      ...historyMessages,
      vscode.LanguageModelChatMessage.User(request.prompt),
    ];

    // Pass registered VS Code tools when the agent declares tools and the user
    // has granted a tool invocation token (required by the VS Code API).
    // Filter to only the tools whose names overlap with the agent's declared
    // tool list so the model cannot invoke arbitrary tools outside its spec.
    const agentDeclaredTools = agent.tools ?? [];
    const agentDeclaredToolNames = agentDeclaredTools.map((declared) =>
      (typeof declared === 'string' ? declared : (declared.name ?? '')).toLowerCase(),
    );
    const availableTools =
      agentDeclaredTools.length > 0 && request.toolInvocationToken
        ? vscode.lm.tools.filter((t) =>
            agentDeclaredToolNames.some(
              (declaredName) =>
                t.name.toLowerCase().includes(declaredName) ||
                declaredName.includes(t.name.toLowerCase()),
            ),
          )
        : [];

    const requestOptions: vscode.LanguageModelChatRequestOptions =
      availableTools.length > 0
        ? { tools: availableTools, toolMode: vscode.LanguageModelChatToolMode.Auto }
        : {};

    // Tool-call loop: re-send messages with tool results until no further tool
    // calls are requested. A safety cap prevents infinite loops.
    // Team-builder agents can write 10–20+ files in a single session, so the cap
    // must be high enough to accommodate full team generation without truncation.
    const MAX_TOOL_ROUNDS = 50;
    let chatResponse = await request.model.sendRequest(messages, requestOptions, token);
    let roundCapExceeded = false;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const toolCalls: vscode.LanguageModelToolCallPart[] = [];
      const assistantParts: Array<vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart> =
        [];

      for await (const part of chatResponse.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
          stream.markdown(part.value);
          assistantParts.push(part);
        } else if (part instanceof vscode.LanguageModelToolCallPart) {
          toolCalls.push(part);
          assistantParts.push(part);
        }
      }

      if (toolCalls.length === 0) break;

      // Append assistant turn (text + tool calls) and invoke each tool
      messages.push(vscode.LanguageModelChatMessage.Assistant(assistantParts));

      const toolResults = await Promise.all(
        toolCalls.map(async (call) => {
          try {
            const result = await vscode.lm.invokeTool(
              call.name,
              { input: call.input, toolInvocationToken: request.toolInvocationToken },
              token,
            );
            return new vscode.LanguageModelToolResultPart(call.callId, result.content);
          } catch (toolError) {
            logger.error(`Tool invocation error for ${call.name}:`, toolError);
            const toolErrMsg = toolError instanceof Error ? toolError.message : String(toolError);
            return new vscode.LanguageModelToolResultPart(call.callId, [
              new vscode.LanguageModelTextPart(`Tool execution failed: ${toolErrMsg}`),
            ]);
          }
        }),
      );

      messages.push(vscode.LanguageModelChatMessage.User(toolResults));

      if (round === MAX_TOOL_ROUNDS - 1) {
        roundCapExceeded = true;
        break;
      }

      chatResponse = await request.model.sendRequest(messages, requestOptions, token);
    }

    // When the safety cap is hit the final model response was never obtained —
    // send one last request and stream it so the agent can surface its summary.
    if (roundCapExceeded) {
      logger.warn(
        `Agent ${agentId} reached MAX_TOOL_ROUNDS (${MAX_TOOL_ROUNDS}); streaming final response.`,
      );
      const finalResponse = await request.model.sendRequest(messages, requestOptions, token);
      for await (const part of finalResponse.stream) {
        if (part instanceof vscode.LanguageModelTextPart) {
          stream.markdown(part.value);
        }
      }
    }
  } catch (error) {
    logger.error(`Agent ${agentId} error:`, error);
    let errorDetail: string;
    if (error instanceof vscode.LanguageModelError) {
      errorDetail = `${error.message}${error.code ? ` (${error.code})` : ''}`;
    } else if (error instanceof Error) {
      errorDetail = error.message;
    } else {
      errorDetail = String(error);
    }
    stream.markdown(`❌ Error processing request with ${agent.name}\n\n> ${errorDetail}`);
  }
}

/**
 * Setup Command Registry with all modular commands
 */
function setupCommandRegistry(context: vscode.ExtensionContext): void {
  // Initialize registry
  commandRegistry = new CommandRegistry(context.extensionUri, context, logger);

  // Register all commands
  const commands = [
    // Project commands
    new InitProfileCommand(commandRegistry.getContext()),
    new SaveProfileCommand(commandRegistry.getContext()),
    new SetupEngramCommand(commandRegistry.getContext()),

    // Agent commands
    new CreateAgentCommand(commandRegistry.getContext()),
    new SyncAgentsCommand(commandRegistry.getContext(), agentLoader),
    new DeleteAgentCommand(commandRegistry.getContext(), agentLoader),

    // Team commands
    new CreateTeamCommand(commandRegistry.getContext()),
    new ListTeamsCommand(commandRegistry.getContext()),

    // View commands
    new OpenDashboardCommand(commandRegistry.getContext()),
  ];

  commandRegistry.registerAll(commands);
  commandRegistry.activateAll(context);

  // Log registry stats
  const stats = commandRegistry.getStats();
  logger.info(
    `Command Registry initialized: ${stats.total} commands (${Object.entries(stats.byCategory)
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ')})`,
  );
}

/**
 * Register language model tools (LanguageModelTool API)
 */
function registerLanguageModelTools(context: vscode.ExtensionContext): void {
  if (!vscode.lm?.registerTool) {
    logger.warn('VS Code LM Tool API not available, skipping tool registration');
    return;
  }

  context.subscriptions.push(vscode.lm.registerTool('agent-teams-handoff', new HandoffTool()));
  logger.info('Registered LM tool: agent-teams-handoff');

  context.subscriptions.push(
    vscode.lm.registerTool('agent-teams-select-phases', new PhasePickerTool()),
  );
  logger.info('Registered LM tool: agent-teams-select-phases');

  context.subscriptions.push(
    vscode.lm.registerTool('agent-teams-suggest-community-skills', new FetchCommunitySkillsTool()),
  );
  logger.info('Registered LM tool: agent-teams-suggest-community-skills');

  context.subscriptions.push(
    vscode.lm.registerTool('agent-teams-read-workspace-file', new ReadWorkspaceFileTool()),
  );
  logger.info('Registered LM tool: agent-teams-read-workspace-file');

  context.subscriptions.push(
    vscode.lm.registerTool('agent-teams-sync-context-files', new SyncContextFilesTool()),
  );
  logger.info('Registered LM tool: agent-teams-sync-context-files');

  const bundledSkillsDir = path.join(context.extensionPath, 'dist', 'media', 'bundled-skills');
  context.subscriptions.push(
    vscode.lm.registerTool(
      'agent-teams-copy-bundled-skills',
      new CopyBundledSkillsTool(bundledSkillsDir),
    ),
  );
  logger.info('Registered LM tool: agent-teams-copy-bundled-skills');

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (taskCoordinator && workspaceFolders && workspaceFolders.length > 0) {
    context.subscriptions.push(
      vscode.lm.registerTool(
        'agent-teams-dispatch-parallel',
        new DispatchParallelTool(taskCoordinator, workspaceFolders[0].uri.fsPath),
      ),
    );
    logger.info('Registered LM tool: agent-teams-dispatch-parallel');

    context.subscriptions.push(
      vscode.lm.registerTool(
        'agent-teams-complete-subtask',
        new CompleteSubtaskTool(taskCoordinator, workspaceFolders[0].uri.fsPath),
      ),
    );
    logger.info('Registered LM tool: agent-teams-complete-subtask');
  }
}

/**
 * Register legacy commands (to be migrated)
 */
function registerLegacyCommands(context: vscode.ExtensionContext): void {
  // Reload agents command
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.reloadAgents', async (): Promise<void> => {
      await loadAgentsFromWorkspace();
    }),
  );

  // Manual agent selection command
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.selectAgent', async (): Promise<void> => {
      const agents = agentLoader.getAllAgents();

      if (agents.length === 0) {
        void vscode.window.showWarningMessage('No agents loaded');
        return;
      }

      const items = agents.map((agent) => ({
        label: `@${agent.id}`,
        description: agent.name,
        detail: agent.description,
        agent,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an agent to invoke',
      });

      if (selected) {
        void vscode.window.showInformationMessage(`Use @${selected.agent.id} in Copilot Chat`);
      }
    }),
  );

  // Create agent from spec command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'agent-teams.createFromSpec',
      async (uri?: vscode.Uri): Promise<void> => {
        await createAgentFromSpec(uri);
      },
    ),
  );

  // ===== v2.0 Legacy Commands =====
  // Sync team (not yet migrated)
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.syncTeam', async (): Promise<void> => {
      const { V2Commands } = require('./commands/v2Commands');
      const v2commands = new V2Commands(context.extensionUri);
      await v2commands.syncTeam();
    }),
  );

  // Backwards compatibility redirects
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'agent-teams.captureWorkspaceCatalog',
      async (): Promise<void> => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          void vscode.window.showWarningMessage('Open a workspace to capture catalog entries.');
          return;
        }
        await catalogManager.captureWorkspaceToCatalog(workspaceFolders[0].uri.fsPath);
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.exportCatalog', async (): Promise<void> => {
      await catalogManager.exportCatalog();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.importCatalog', async (): Promise<void> => {
      await catalogManager.importCatalog();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.resetCatalog', async (): Promise<void> => {
      await catalogManager.resetCatalog();
    }),
  );
}

/**
 * Create agent from spec file
 */
async function createAgentFromSpec(uri?: vscode.Uri): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    void vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  try {
    // Get spec file
    let specPath: string;
    if (uri) {
      specPath = uri.fsPath;
    } else {
      const result = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { 'Spec Files': ['yml', 'yaml', 'json'] },
        defaultUri: vscode.Uri.file(path.join(workspaceRoot, '.agent-teams', 'agents')),
      });

      if (!result || result.length === 0) {
        return;
      }

      specPath = result[0].fsPath;
    }

    // Generate agent
    const agentsDir = path.join(workspaceRoot, 'agents');
    const result = await generator.createAgent(specPath, agentsDir, workspaceRoot);

    if (result.success) {
      // Sync
      const targetDir = path.join(workspaceRoot, '.github', 'agents');
      await generator.syncAgents(agentsDir, targetDir);
      await loadAgentsFromWorkspace();

      void vscode.window.showInformationMessage(result.message);
    } else {
      void vscode.window.showErrorMessage(result.message);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to create agent from spec:', error);
    void vscode.window.showErrorMessage(`Failed to create agent: ${errorMessage}`);
  }
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  logger?.info('Agent Team extension deactivating...');

  // Cleanup command registry
  if (commandRegistry) {
    commandRegistry.dispose();
  }

  logger?.info('Agent Team extension deactivated');
}
