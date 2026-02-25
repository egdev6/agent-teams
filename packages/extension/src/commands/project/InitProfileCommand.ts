/**
 * Init Profile Command
 * Initializes a project profile with auto-detection
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { ProfileEditorPanel } from '../../profileEditorPanel';
import { Command, type CommandContext } from '../base/Command';

export class InitProfileCommand extends Command {
  constructor(context: CommandContext) {
    super(context, {
      id: 'initProfile',
      title: 'Initialize Project Profile',
      category: 'project',
      description: 'Create a new project profile with auto-detection',
    });
  }

  async execute(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    // Check if profile already exists (.agent-teams preferred, legacy fallback)
    const profilePath = fs.existsSync(
      path.join(workspaceFolder, '.agent-teams', 'project.profile.yml'),
    )
      ? path.join(workspaceFolder, '.agent-teams', 'project.profile.yml')
      : path.join(workspaceFolder, '.agent-team', 'project.profile.yml');

    if (fs.existsSync(profilePath)) {
      const overwrite = await vscode.window.showWarningMessage(
        'Project profile already exists. Overwrite?',
        'Yes',
        'No',
      );
      if (overwrite !== 'Yes') {
        this.context.logger.info('User cancelled profile overwrite');
        return;
      }
    }

    // Open profile editor panel with auto-detection
    try {
      await ProfileEditorPanel.createOrShow(
        this.context.extensionUri,
        this.context.logger,
        workspaceFolder,
      );
      this.showInfo('Profile editor opened. Configure your project settings.');
    } catch (error) {
      this.showError(`Failed to open profile editor: ${error}`, error);
    }
  }
}
