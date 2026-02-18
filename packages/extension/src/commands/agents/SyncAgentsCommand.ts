/**
 * Sync Agents Command
 * Synchronizes agents from workspace
 */

import * as vscode from 'vscode';
import type { AgentLoader } from '../../agentLoader';
import { Command, type CommandContext } from '../base/Command';

export class SyncAgentsCommand extends Command {
  private agentLoader: AgentLoader;

  constructor(context: CommandContext, agentLoader: AgentLoader) {
    super(context, {
      id: 'syncAgents',
      title: 'Sync Agents',
      category: 'agent',
      description: 'Synchronize agents from workspace',
    });
    this.agentLoader = agentLoader;
  }

  async execute(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Syncing agents...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0, message: 'Loading agents from workspace' });

          // Reload agents
          await this.agentLoader.loadAgents(workspaceFolder, `${workspaceFolder}/agents`);
          const agents = this.agentLoader.getAllAgents();

          progress.report({ increment: 100, message: `Found ${agents.length} agents` });

          this.showInfo(`Successfully synced ${agents.length} agents`);
        },
      );
    } catch (error) {
      this.showError(`Failed to sync agents: ${error}`, error);
    }
  }
}
