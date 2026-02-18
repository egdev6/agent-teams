/**
 * Delete Agent Command
 * Deletes an agent specification
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { AgentLoader } from '../../agentLoader';
import { Command, type CommandContext } from '../base/Command';

export class DeleteAgentCommand extends Command {
  private agentLoader: AgentLoader;

  constructor(context: CommandContext, agentLoader: AgentLoader) {
    super(context, {
      id: 'deleteAgent',
      title: 'Delete Agent',
      category: 'agent',
      description: 'Delete an agent specification',
    });
    this.agentLoader = agentLoader;
  }

  async execute(agentId?: string): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
      // If no agentId provided, show picker
      let selectedAgentId = agentId;
      if (!selectedAgentId) {
        const agents = this.agentLoader.getAllAgents();
        if (agents.length === 0) {
          this.showInfo('No agents found in workspace');
          return;
        }

        const selected = await vscode.window.showQuickPick(
          agents.map((agent) => ({
            label: agent.name || agent._metadata.id,
            description: agent.description,
            detail: agent._metadata.id,
          })),
          {
            placeHolder: 'Select agent to delete',
          },
        );

        if (!selected || !selected.detail) return;
        selectedAgentId = selected.detail;
      }

      // Confirm deletion
      const confirm = await vscode.window.showWarningMessage(
        `Delete agent "${selectedAgentId}"?`,
        { modal: true },
        'Delete',
      );

      if (confirm !== 'Delete') return;

      // Find and delete agent file
      const agentPath = path.join(workspaceFolder, 'agents', `${selectedAgentId}.yml`);
      if (fs.existsSync(agentPath)) {
        fs.unlinkSync(agentPath);
        this.showInfo(`Agent "${selectedAgentId}" deleted successfully`);

        // Reload agents
        await this.agentLoader.loadAgents(workspaceFolder, `${workspaceFolder}/agents`);
      } else {
        this.showWarning(`Agent file not found: ${agentPath}`);
      }
    } catch (error) {
      this.showError(`Failed to delete agent: ${error}`, error);
    }
  }
}
