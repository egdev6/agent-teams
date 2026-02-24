/**
 * Create Team Command
 * Creates a new team configuration
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { CatalogManager } from '../../catalogManager';
import { TeamManager } from '../../teamManager';
import { Command, type CommandContext } from '../base/Command';

type CreateTeamPayload = {
  teamId: string;
  name: string;
  description?: string;
  agents?: string[];
  tags?: string[];
};

export class CreateTeamCommand extends Command {
  private teamManager: TeamManager;

  constructor(context: CommandContext) {
    super(context, {
      id: 'createTeam',
      title: 'Create Team',
      category: 'team',
      description: 'Create a new team configuration',
    });
    this.teamManager = new TeamManager();
  }

  async execute(payload?: CreateTeamPayload): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
      const profilePath = path.join(workspaceFolder, '.agent-team', 'project.profile.yml');
      if (!fs.existsSync(profilePath)) {
        this.showWarning('Project profile not found. Initialize it before creating teams.');
        return;
      }

      const input = payload ?? (await this.collectInteractiveInput());
      if (!input) return;

      const teamId = this.normalizeTeamId(input.teamId);
      if (!teamId) {
        throw new Error('Team ID is required');
      }
      if (!/^[a-z0-9-]+$/.test(teamId)) {
        throw new Error('Team ID must use lowercase letters, numbers, and hyphens only');
      }

      const teamName = input.name.trim();
      if (!teamName) {
        throw new Error('Team name is required');
      }

      const selectedAgents = Array.from(
        new Set(
          (input.agents || []).map((agent) => agent.trim()).filter((agent) => agent.length > 0),
        ),
      );
      const tags = Array.from(
        new Set((input.tags || []).map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
      );

      await this.teamManager.createTeam(workspaceFolder, teamId, {
        name: teamName,
        description: input.description?.trim(),
        enabledAgents: selectedAgents,
        tags,
      });

      const catalogManager = new CatalogManager(this.context.extensionContext, this.context.logger);
      await catalogManager.captureWorkspaceToCatalog(workspaceFolder);

      this.showInfo(`Team "${teamName}" created successfully`);

      const teamPath = path.join(workspaceFolder, '.agent-teams', 'teams', `${teamId}.yml`);
      const doc = await vscode.workspace.openTextDocument(teamPath);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (error) {
      this.showError(`Failed to create team: ${error}`, error);
      throw error;
    }
  }

  private normalizeTeamId(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async collectInteractiveInput(): Promise<CreateTeamPayload | null> {
    const teamId = await vscode.window.showInputBox({
      prompt: 'Team ID (e.g., minimal-testing)',
      placeHolder: 'my-team',
      validateInput: (value) => (value ? null : 'Team ID is required'),
    });
    if (!teamId) return null;

    const name = await vscode.window.showInputBox({
      prompt: 'Team Name (e.g., Minimal Testing Setup)',
      placeHolder: 'My Team',
      validateInput: (value) => (value ? null : 'Team name is required'),
    });
    if (!name) return null;

    const description = await vscode.window.showInputBox({
      prompt: 'Team Description (optional)',
      placeHolder: 'A team for...',
    });

    return {
      teamId,
      name,
      description: description || undefined,
    };
  }
}
