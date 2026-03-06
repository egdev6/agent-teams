/**
 * Create Agent Command
 * Creates a new agent specification
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { stringify as yamlStringify } from 'yaml';
import { Command, type CommandContext } from '../base/Command';

export class CreateAgentCommand extends Command {
  constructor(context: CommandContext) {
    super(context, {
      id: 'createAgent',
      title: 'Create New Agent',
      category: 'agent',
      description: 'Create a new agent specification',
    });
  }

  async execute(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
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

      const agentName = await vscode.window.showInputBox({
        prompt: 'Agent Name (e.g., Test Runner)',
        placeHolder: 'My Agent',
        validateInput: (value) => (value ? null : 'Agent name is required'),
      });

      if (!agentName) return;

      const description = await vscode.window.showInputBox({
        prompt: 'Agent Description',
        placeHolder: 'What does this agent do?',
      });

      const spec = {
        name: agentName,
        description: description || '',
        instructions: `You are **${agentName}**, a worker agent.\n\n${description || "Edit this section to define your agent's behavior."}`,
        _metadata: {
          id: agentId,
          role: 'worker',
          domain: 'general',
          intents: [],
          context: { max_files: 8, max_chars_per_file: 8000 },
          output: {
            mode_default: 'short+diff',
            max_bullets: 7,
            never_include: ['disclaimers', 'placeholders', 'apologies'],
          },
          skills: { uses: [] },
          permissions: {},
        },
      };

      const specsDir = path.join(workspaceFolder, '.agent-teams', 'agents');
      if (!fs.existsSync(specsDir)) {
        fs.mkdirSync(specsDir, { recursive: true });
      }
      const specPath = path.join(specsDir, `${agentId}.yml`);
      fs.writeFileSync(specPath, yamlStringify(spec), 'utf-8');

      this.showInfo(`Agent "${agentName}" spec saved to ${specPath}`);
    } catch (error) {
      this.showError(`Failed to create agent: ${error}`, error);
    }
  }
}
