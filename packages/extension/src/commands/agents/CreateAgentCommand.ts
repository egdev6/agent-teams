/**
 * Create Agent Command
 * Creates a new agent specification
 */

import * as vscode from 'vscode';
import type { AgentGenerator } from '../../agentGenerator';
import { Command, type CommandContext } from '../base/Command';

export class CreateAgentCommand extends Command {
  private generator: AgentGenerator;

  constructor(context: CommandContext, generator: AgentGenerator) {
    super(context, {
      id: 'createAgent',
      title: 'Create New Agent',
      category: 'agent',
      description: 'Create a new agent specification',
    });
    this.generator = generator;
  }

  async execute(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
      // Initialize generator if needed
      await this.generator.initialize(workspaceFolder);

      // Get agent ID
      const agentId = await vscode.window.showInputBox({
        prompt: 'Agent ID (e.g., test-runner)',
        placeHolder: 'my-agent',
        validateInput: (value) => {
          if (!value) return 'Agent ID is required';
          if (!/^[a-z0-9-]+$/.test(value)) {
            return 'Use lowercase letters, numbers, and hyphens only';
          }
          return null;
        },
      });

      if (!agentId) return;

      // Get agent name
      const agentName = await vscode.window.showInputBox({
        prompt: 'Agent Name (e.g., Test Runner)',
        placeHolder: 'My Agent',
        validateInput: (value) => (value ? null : 'Agent name is required'),
      });

      if (!agentName) return;

      // Get description
      const description = await vscode.window.showInputBox({
        prompt: 'Agent Description',
        placeHolder: 'What does this agent do?',
      });

      // Build complete spec
      // Build complete spec matching AgentSpec interface
      const spec: any = {
        _metadata: {
          id: agentId,
          role: 'worker',
          domain: 'general',
          intents: [],
        },
        name: agentName,
        description: description || '',
        instructions: `You are ${agentName}. ${description || ''}`,
        context_packs: [],
      };

      // Save spec to file
      const specsDir = `${workspaceFolder}/specs`;
      const specPath = await this.generator.saveSpec(spec, specsDir);

      // Create agent from spec
      const agentsDir = `${workspaceFolder}/agents`;
      const result = await this.generator.createAgent(specPath, agentsDir, workspaceFolder);

      if (result.success) {
        this.showInfo(`Agent "${agentName}" created successfully at ${result.agentPath}`);
      } else {
        this.showError(result.message);
      }
    } catch (error) {
      this.showError(`Failed to create agent: ${error}`, error);
    }
  }
}
