import * as vscode from 'vscode';
import { AgentLoader } from './agentLoader';
import { AgentRouter } from './router';
import { AgentOrchestrator } from './orchestrator';
import { AgentGenerator } from './agentGenerator';
import { Logger } from './logger';
import { ExtensionConfig } from './types';
import { KitBrowserPanel } from './kitBrowserPanel';
import * as path from 'path';

let logger: Logger;
let agentLoader: AgentLoader;
let router: AgentRouter;
let orchestrator: AgentOrchestrator;
let generator: AgentGenerator;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Agent Team extension is activating...');

  // Initialize logger
  const config = getConfig();
  logger = new Logger(config.logLevel);
  logger.info('Agent Team extension activated');

  // Initialize components
  agentLoader = new AgentLoader(logger);
  router = new AgentRouter(agentLoader, logger);
  orchestrator = new AgentOrchestrator(agentLoader, logger);
  generator = new AgentGenerator(logger);

  // Initialize generator
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    await generator.initialize(workspaceFolders[0].uri.fsPath);
  }

  // Load agents from workspace
  loadAgentsFromWorkspace();

  // Register chat participants
  registerChatParticipants(context);

  // Register commands
  registerCommands(context);

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('agentTeam')) {
        const newConfig = getConfig();
        logger.setLogLevel(newConfig.logLevel);
        logger.info('Configuration updated');
        
        if (e.affectsConfiguration('agentTeam.agentsPath')) {
          loadAgentsFromWorkspace();
        }
      }
    })
  );

  logger.info('Agent Team extension ready');
}

function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('agentTeam');
  return {
    agentsPath: config.get('agentsPath', '.github/agents'),
    enableAutoRouting: config.get('enableAutoRouting', true),
    enablePathMatching: config.get('enablePathMatching', true),
    logLevel: config.get('logLevel', 'info')
  };
}

async function loadAgentsFromWorkspace() {
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
      vscode.window.showInformationMessage(
        `Agent Team: Loaded ${agents.length} agent(s)`
      );
    }
  } catch (error) {
    logger.error('Failed to load agents:', error);
    vscode.window.showErrorMessage('Agent Team: Failed to load agents');
  }
}

function registerChatParticipants(context: vscode.ExtensionContext) {
  // Register router participant (@router)
  const routerHandler: vscode.ChatRequestHandler = async (
    request, chatContext, stream, token
  ) => {
    return await handleRouterRequest(request, stream, token);
  };

  const routerParticipant = vscode.chat.createChatParticipant(
    'agent-teams.router',
    routerHandler
  );
  routerParticipant.iconPath = new vscode.ThemeIcon('organization');
  context.subscriptions.push(routerParticipant);

  // Register dynamic participants for each loaded agent
  const agents = agentLoader.getAllAgents();
  for (const agent of agents) {
    const handler: vscode.ChatRequestHandler = async (request, chatContext, stream, token) => {
      return await handleAgentRequest(agent._metadata.id, request, stream, token);
    };

    const participant = vscode.chat.createChatParticipant(
      `agent-teams.${agent._metadata.id}`,
      handler
    );
    
    // Set icon based on domain
    const iconName = getIconForDomain(agent._metadata.domain);
    participant.iconPath = new vscode.ThemeIcon(iconName);
    
    context.subscriptions.push(participant);
    logger.info(`Registered chat participant: @${agent._metadata.id}`);
  }
}

function getIconForDomain(domain: string): string {
  const icons: Record<string, string> = {
    backend: 'server',
    frontend: 'browser',
    database: 'database',
    testing: 'beaker',
    docs: 'book',
    global: 'globe'
  };
  return icons[domain] || 'robot';
}

async function handleRouterRequest(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
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
        for (const suggestion of suggestions.slice(0, 3)) {
          const agent = agentLoader.getAgent(suggestion.agentId);
          stream.markdown(`- @${suggestion.agentId} (${agent?.name}) - Score: ${suggestion.score}\n`);
        }
      }
      return;
    }

    stream.markdown(`🎯 **Routing to: ${selectedAgent.name}** (@${selectedAgent._metadata.id})\n\n`);
    
    // Delegate to selected agent
    await handleAgentRequest(selectedAgent._metadata.id, request, stream, token);
    
  } catch (error) {
    logger.error('Router error:', error);
    stream.markdown('❌ Routing failed. Please try invoking an agent directly.');
  }
}

async function handleAgentRequest(
  agentId: string,
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
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
      vscode.LanguageModelChatMessage.User(request.prompt)
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

function registerCommands(context: vscode.ExtensionContext) {
  // Reload agents command
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.reloadAgents', async () => {
      await loadAgentsFromWorkspace();
    })
  );

  // Manual agent selection command
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.selectAgent', async () => {
      const agents = agentLoader.getAllAgents();
      
      if (agents.length === 0) {
        vscode.window.showWarningMessage('No agents loaded');
        return;
      }

      const items = agents.map(agent => ({
        label: `@${agent._metadata.id}`,
        description: agent.name,
        detail: agent.description,
        agent
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an agent to invoke'
      });

      if (selected) {
        vscode.window.showInformationMessage(
          `Use @${selected.agent._metadata.id} in Copilot Chat`
        );
      }
    })
  );

  // Create new agent command
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.createAgent', async () => {
      await createAgentInteractive();
    })
  );

  // Sync agents command
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.syncAgents', async () => {
      await syncAgentsCommand();
    })
  );

  // Create agent from spec command
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.createFromSpec', async (uri?: vscode.Uri) => {
      await createAgentFromSpec(uri);
    })
  );

  // ===== v2.0 Commands =====
  const { V2Commands } = require('./commands/v2Commands');
  const v2commands = new V2Commands(context.extensionUri);

  // Initialize project profile
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.initProfile', async () => {
      await v2commands.initProfile();
    })
  );

  // Create team profile
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.createTeam', async () => {
      await v2commands.createTeam();
    })
  );

  // List teams
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.listTeams', async () => {
      await v2commands.listTeams();
    })
  );

  // Sync team
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.syncTeam', async () => {
      await v2commands.syncTeam();
    })
  );

  // Browse kits
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.browseKits', async () => {
      await v2commands.browseKits();
    })
  );

  // Kit Browser WebView
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.openKitBrowser', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const kitsPath = path.join(workspaceRoot, 'kits');

      KitBrowserPanel.createOrShow(
        context.extensionUri,
        logger,
        kitsPath
      );
    })
  );

  // Dashboard WebView
  context.subscriptions.push(
    vscode.commands.registerCommand('agent-teams.openDashboard', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;

      const { DashboardPanel } = require('./dashboardPanel');
      DashboardPanel.createOrShow(
        context.extensionUri,
        logger,
        workspaceRoot
      );
    })
  );
}

async function createAgentInteractive() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;

  // Create spec interactively
  const spec = await generator.createSpecInteractive();
  if (!spec) {
    return; // User cancelled
  }

  // Save spec
  const specsDir = path.join(workspaceRoot, 'specs');
  const specPath = await generator.saveSpec(spec, specsDir);

  // Generate agent
  const agentsDir = path.join(workspaceRoot, 'agents');
  const result = await generator.createAgent(specPath, agentsDir, workspaceRoot);

  if (result.success && result.agentPath) {
    // Sync to .github/agents
    const targetDir = path.join(workspaceRoot, '.github', 'agents');
    await generator.syncAgents(agentsDir, targetDir);

    // Reload agents
    await loadAgentsFromWorkspace();

    // Open created files
    const choice = await vscode.window.showInformationMessage(
      `✅ Agent "${spec.name}" created!\n\n📝 Spec: specs/${spec._metadata.id}.yml\n📄 Agent: .github/agents/${spec._metadata.id}.agent.md\n🎯 Invoke as: @${spec._metadata.id}\n\n⚠️  Note: Copilot will detect the agent after reloading VS Code.`,
      'Open Spec',
      'Open Agent',
      'Reload Window'
    );

    if (choice === 'Open Spec') {
      const doc = await vscode.workspace.openTextDocument(specPath);
      await vscode.window.showTextDocument(doc);
    } else if (choice === 'Open Agent') {
      const doc = await vscode.workspace.openTextDocument(result.agentPath);
      await vscode.window.showTextDocument(doc);
    } else if (choice === 'Reload Window') {
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  } else {
    vscode.window.showErrorMessage(`Failed to create agent: ${result.message}`);
  }
}

async function syncAgentsCommand() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const agentsDir = path.join(workspaceRoot, 'agents');
  const targetDir = path.join(workspaceRoot, '.github', 'agents');

  // Ask if clean
  const clean = await vscode.window.showQuickPick(
    ['Yes', 'No'],
    { placeHolder: 'Clean existing agents before sync?' }
  );

  const result = await generator.syncAgents(agentsDir, targetDir, {
    clean: clean === 'Yes'
  });

  if (result.success) {
    await loadAgentsFromWorkspace();
    vscode.window.showInformationMessage(result.message);
  } else {
    vscode.window.showErrorMessage(result.message);
  }
}

async function createAgentFromSpec(uri?: vscode.Uri) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;

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
      defaultUri: vscode.Uri.file(path.join(workspaceRoot, 'specs'))
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

    vscode.window.showInformationMessage(result.message);
  } else {
    vscode.window.showErrorMessage(result.message);
  }
}

export function deactivate() {
  logger?.info('Agent Team extension deactivated');
}
