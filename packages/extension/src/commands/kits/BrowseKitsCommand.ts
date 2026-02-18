import { KitBrowserPanel } from '../../kitBrowserPanel';
import { Command, type CommandContext } from '../base/Command';

export class BrowseKitsCommand extends Command {
  constructor(context: CommandContext) {
    super(context, {
      id: 'browseKits',
      title: 'Browse Kits',
      category: 'kit',
      description: 'Browse and install available kits',
    });
  }

  async execute(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
      await KitBrowserPanel.createOrShow(
        this.context.extensionUri,
        this.context.logger,
        workspaceFolder,
      );
    } catch (error) {
      this.showError(`Failed to open kit browser: ${error}`, error);
    }
  }
}
