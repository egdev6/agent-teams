import * as path from 'node:path';
import * as vscode from 'vscode';
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
  SyncAgentsCommand,
} from './commands';
import { CommandRegistry } from './commands/base/CommandRegistry';
import { Logger } from './logger';
import { AgentRouter } from './router';
import type { ExtensionConfig } from './types';

// Constants
const DEFAULT_AGENTS_PATH = '.github/agents';
const DEFAULT_LOG_LEVEL = 'info';
const CHAT_PARTICIPANT_PREFIX = 'agent-teams';
const MAX_SUGGESTIONS_DISPLAY = 3;

// Extension state
let logger: Logger;
let agentLoader: AgentLoader;
let router: AgentRouter;
let generator: AgentGenerator;
let commandRegistry: CommandRegistry;
let catalogManager: CatalogManager;

/**
 * Activate the Agent Team extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Agent Team extension is activating...');

  try {
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

    // Load agents from workspace
    void loadAgentsFromWorkspace();

    // Register chat participants
    registerChatParticipants(context);

    // Setup command registry
    setupCommandRegistry(context);

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
}

/**
 * Register chat participants for agents
 */
function registerChatParticipants(context: vscode.ExtensionContext): void {
  // Register router participant (@router)
  const routerHandler: vscode.ChatRequestHandler = async (request, _chatContext, stream, token) => {
    return await handleRouterRequest(request, stream, token);
  };

  const routerParticipant = vscode.chat.createChatParticipant(
    `${CHAT_PARTICIPANT_PREFIX}.router`,
    routerHandler,
  );
  routerParticipant.iconPath = new vscode.ThemeIcon('organization');
  context.subscriptions.push(routerParticipant);

  // Register dynamic participants for each loaded agent
  const agents = agentLoader.getAllAgents();
  for (const agent of agents) {
    const handler: vscode.ChatRequestHandler = async (request, _chatContext, stream, token) => {
      return await handleAgentRequest(agent._metadata.id, request, stream, token);
    };

    const participant = vscode.chat.createChatParticipant(
      `${CHAT_PARTICIPANT_PREFIX}.${agent._metadata.id}`,
      handler,
    );

    // Set icon based on domain
    const iconName = getIconForDomain(agent._metadata.domain);
    participant.iconPath = new vscode.ThemeIcon(iconName);

    context.subscriptions.push(participant);
    logger.info(`Registered chat participant: @${agent._metadata.id}`);
  }
}

/**
 * Get appropriate icon for agent domain
 */
function getIconForDomain(domain: string): string {
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

    stream.markdown(
      `🎯 **Routing to: ${selectedAgent.name}** (@${selectedAgent._metadata.id})\n\n`,
    );

    // Delegate to selected agent
    await handleAgentRequest(selectedAgent._metadata.id, request, stream, token);
  } catch (error) {
    logger.error('Router error:', error);
    stream.markdown('❌ Routing failed. Please try invoking an agent directly.');
  }
}

/**
 * Handle request for a specific agent
 */
async function handleAgentRequest(
  agentId: string,
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
): Promise<void> {
  const agent = agentLoader.getAgent(agentId);

  if (!agent) {
    stream.markdown(`❌ Agent not found: ${agentId}`);
    return;
  }

  logger.info(`Handling request for agent: ${agentId}`);

  try {
    // Build messages with agent instructions
    const messages = [
      vscode.LanguageModelChatMessage.User(agent.instructions || ''),
      vscode.LanguageModelChatMessage.User(request.prompt),
    ];

    // Send to language model
    const chatResponse = await request.model.sendRequest(messages, {}, token);

    // Stream response
    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
  } catch (error) {
    logger.error(`Agent ${agentId} error:`, error);
    stream.markdown(`❌ Error processing request with ${agent.name}`);
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

    // Agent commands
    new CreateAgentCommand(commandRegistry.getContext(), generator),
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
        label: `@${agent._metadata.id}`,
        description: agent.name,
        detail: agent.description,
        agent,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an agent to invoke',
      });

      if (selected) {
        void vscode.window.showInformationMessage(
          `Use @${selected.agent._metadata.id} in Copilot Chat`,
        );
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
        defaultUri: vscode.Uri.file(path.join(workspaceRoot, 'specs')),
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
