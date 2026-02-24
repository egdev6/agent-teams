/**
 * List Teams Command
 * Lists all teams in the workspace
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { Command, type CommandContext } from '../base/Command';

export class ListTeamsCommand extends Command {
  constructor(context: CommandContext) {
    super(context, {
      id: 'listTeams',
      title: 'List Teams',
      category: 'team',
      description: 'List all teams in the workspace',
    });
  }

  async execute(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
      const teamsDir = path.join(workspaceFolder, '.agent-team', 'teams');

      if (!fs.existsSync(teamsDir)) {
        this.showInfo('No teams found. Create one with "Create Team" command.');
        return;
      }

      // Read all team files
      const teamFiles = fs
        .readdirSync(teamsDir)
        .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));

      if (teamFiles.length === 0) {
        this.showInfo('No teams found. Create one with "Create Team" command.');
        return;
      }

      // Parse team files
      const teams = teamFiles.map((file) => {
        const filePath = path.join(teamsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const team = yaml.load(content) as any;
        return {
          label: team.name || team.id,
          description: team.description || '',
          detail: `${team.agents?.length || 0} agents`,
          filePath,
        };
      });

      // Show quick pick
      const selected = await vscode.window.showQuickPick(teams, {
        placeHolder: 'Select a team to open',
      });

      if (selected) {
        const doc = await vscode.workspace.openTextDocument(selected.filePath);
        await vscode.window.showTextDocument(doc);
      }
    } catch (error) {
      this.showError(`Failed to list teams: ${error}`, error);
    }
  }
}
