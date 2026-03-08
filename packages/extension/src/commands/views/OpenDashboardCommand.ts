import * as vscode from 'vscode';
import { DashboardPanel } from '../../dashboardPanel';
import { Command, type CommandContext } from '../base/Command';

export class OpenDashboardCommand extends Command {
  constructor(context: CommandContext) {
    super(context, {
      id: 'openDashboard',
      title: 'Open Dashboard',
      category: 'view',
      description: 'Open the Agent Teams dashboard',
    });
  }

  async execute(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
      await vscode.commands.executeCommand('workbench.action.closeSidebar');
      await DashboardPanel.createOrShow(
        this.context.extensionUri,
        this.context.extensionContext,
        this.context.logger,
        workspaceFolder,
      );
    } catch (error) {
      this.showError(`Failed to open dashboard: ${error}`, error);
    }
  }
}
