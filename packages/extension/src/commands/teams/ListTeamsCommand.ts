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
      const teamsDirs = [
        path.join(workspaceFolder, '.agent-teams', 'teams'),
        path.join(workspaceFolder, '.agent-team', 'teams'),
      ];
      const uniqueTeams = new Map<string, { filePath: string; fileName: string }>();
      for (const teamsDir of teamsDirs) {
        if (!fs.existsSync(teamsDir)) {
          continue;
        }
        const teamFiles = fs
          .readdirSync(teamsDir)
          .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));
        for (const fileName of teamFiles) {
          const id = path.basename(fileName, path.extname(fileName));
          if (!uniqueTeams.has(id)) {
            uniqueTeams.set(id, { filePath: path.join(teamsDir, fileName), fileName });
          }
        }
      }

      if (uniqueTeams.size === 0) {
        this.showInfo('No teams found. Create one with "Create Team" command.');
        return;
      }

      // Parse team files
      const teams = [...uniqueTeams.values()]
        .map(({ filePath, fileName }) => {
          const content = fs.readFileSync(filePath, 'utf-8');
          const team = yaml.load(content) as any;
          return {
            label: team.name || team.id,
            description: team.description || '',
            detail: `${team.agents?.length || 0} agents`,
            filePath,
            sortKey: path.basename(fileName, path.extname(fileName)),
          };
        })
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

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
