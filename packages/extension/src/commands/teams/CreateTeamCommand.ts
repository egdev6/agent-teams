/**
 * Create Team Command
 * Creates a new team configuration
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { Command, type CommandContext } from '../base/Command';

export class CreateTeamCommand extends Command {
  constructor(context: CommandContext) {
    super(context, {
      id: 'createTeam',
      title: 'Create Team',
      category: 'team',
      description: 'Create a new team configuration',
    });
  }

  async execute(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
      // Check if project profile exists
      const profilePath = path.join(workspaceFolder, '.agent-team', 'project.profile.yml');
      if (!fs.existsSync(profilePath)) {
        const initNow = await vscode.window.showWarningMessage(
          'Project profile not found. Initialize now?',
          'Initialize',
          'Cancel',
        );
        if (initNow === 'Initialize') {
          await vscode.commands.executeCommand('agent-teams.initProfile');
          return;
        }
        return;
      }

      // Get team ID
      const teamId = await vscode.window.showInputBox({
        prompt: 'Team ID (e.g., minimal-testing)',
        placeHolder: 'my-team',
        validateInput: (value) => {
          if (!value) return 'Team ID is required';
          if (!/^[a-z0-9-]+$/.test(value)) {
            return 'Use lowercase letters, numbers, and hyphens only';
          }
          return null;
        },
      });

      if (!teamId) return;

      // Get team name
      const teamName = await vscode.window.showInputBox({
        prompt: 'Team Name (e.g., Minimal Testing Setup)',
        placeHolder: 'My Team',
        validateInput: (value) => (value ? null : 'Team name is required'),
      });

      if (!teamName) return;

      // Get description
      const description = await vscode.window.showInputBox({
        prompt: 'Team Description',
        placeHolder: 'What does this team do?',
      });

      // Create team file
      const teamsDir = path.join(workspaceFolder, '.agent-team', 'teams');
      if (!fs.existsSync(teamsDir)) {
        fs.mkdirSync(teamsDir, { recursive: true });
      }

      const teamPath = path.join(teamsDir, `${teamId}.yml`);
      const teamConfig = {
        id: teamId,
        name: teamName,
        description: description || '',
        agents: [],
        kits: [],
        workflow: {
          mode: 'sequential',
          steps: [],
        },
      };

      const yamlContent = yaml.dump(teamConfig, {
        indent: 2,
        lineWidth: 100,
        noRefs: true,
      });

      fs.writeFileSync(teamPath, yamlContent, 'utf-8');

      this.showInfo(`Team "${teamName}" created successfully`);

      // Open file for editing
      const doc = await vscode.workspace.openTextDocument(teamPath);
      await vscode.window.showTextDocument(doc);
    } catch (error) {
      this.showError(`Failed to create team: ${error}`, error);
    }
  }
}
