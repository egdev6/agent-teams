/**
 * Extension Commands for v2.0 Kits & Teams System
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Logger } from '../logger';
import { ProfileEditorPanel } from '../profileEditorPanel';
import { TeamManager } from '../teamManager';

export class V2Commands {
  private teamManager: TeamManager;
  private logger: Logger;
  private extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this.teamManager = new TeamManager();
    this.logger = new Logger();
    this.extensionUri = extensionUri;
  }

  /**
   * Initialize Project Profile
   * Command: agent-teams.initProfile
   */
  async initProfile(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    // Check if profile already exists
    const profilePath = path.join(workspaceFolder, '.agent-team', 'project.profile.yml');
    if (fs.existsSync(profilePath)) {
      const overwrite = await vscode.window.showWarningMessage(
        'Project profile already exists. Overwrite?',
        'Yes',
        'No',
      );
      if (overwrite !== 'Yes') return;
    }

    // Open profile editor panel with auto-detection
    try {
      await ProfileEditorPanel.createOrShow(this.extensionUri, this.logger, workspaceFolder);
    } catch (error) {
      this.logger.error(`Failed to open profile editor: ${error}`);
      vscode.window.showErrorMessage(`Failed to open profile editor: ${error}`);
    }
  }

  /**
   * Create Team Profile
   * Command: agent-teams.createTeam
   */
  async createTeam(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    // Check if project profile exists
    const profilePath = path.join(workspaceFolder, '.agent-team', 'project.profile.yml');
    if (!fs.existsSync(profilePath)) {
      const initNow = await vscode.window.showWarningMessage(
        'Project profile not found. Initialize now?',
        'Initialize',
        'Cancel',
      );
      if (initNow === 'Initialize') {
        await this.initProfile();
        return; // User can create team after profile is ready
      }
      return;
    }

    // Get team ID
    const teamId = await vscode.window.showInputBox({
      prompt: 'Team ID (e.g., minimal-testing)',
      placeHolder: 'my-team',
      validateInput: (value) => {
        if (!value) return 'Team ID is required';
        if (!/^[a-z0-9-]+$/.test(value)) return 'Use lowercase letters, numbers, and hyphens only';
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
      prompt: 'Team Description (optional)',
      placeHolder: 'A team for...',
    });

    // Get available kits
    const availableKits = this.getAvailableKits();
    if (availableKits.length === 0) {
      vscode.window.showWarningMessage('No kits available. Create kits first.');
      return;
    }

    // Select kits
    const selectedKits = await vscode.window.showQuickPick(
      availableKits.map((kit) => ({ label: kit, picked: false })),
      {
        placeHolder: 'Select kits to include (Space to select, Enter to confirm)',
        canPickMany: true,
      },
    );

    if (!selectedKits || selectedKits.length === 0) {
      vscode.window.showWarningMessage('At least one kit is required');
      return;
    }

    const kits = selectedKits.map((k) => k.label);

    // Create team
    try {
      await this.teamManager.createTeam(workspaceFolder, teamId, {
        name: teamName,
        description,
        kits,
      });

      vscode.window.showInformationMessage(
        `✅ Team "${teamName}" created! Sync with: Agent Team: Sync Team`,
      );

      // Open team file
      const teamPath = path.join(workspaceFolder, '.agent-teams', 'teams', `${teamId}.yml`);
      const uri = vscode.Uri.file(teamPath);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create team: ${error}`);
    }
  }

  /**
   * List Teams
   * Command: agent-teams.listTeams
   */
  async listTeams(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
      const teams = await this.teamManager.listTeams(workspaceFolder);

      if (teams.length === 0) {
        vscode.window.showInformationMessage(
          'No teams found. Create one with: Agent Team: Create Team',
        );
        return;
      }

      const selectedTeam = await vscode.window.showQuickPick(
        teams.map((team) => ({
          label: team,
          description: 'Open team file',
        })),
        {
          placeHolder: 'Select team to view',
        },
      );

      if (selectedTeam) {
        const teamPath = path.join(
          workspaceFolder,
          '.agent-teams',
          'teams',
          `${selectedTeam.label}.yml`,
        );
        const uri = vscode.Uri.file(teamPath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to list teams: ${error}`);
    }
  }

  /**
   * Sync Team to .github/agents/
   * Command: agent-teams.syncTeam
   */
  async syncTeam(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    try {
      const teams = await this.teamManager.listTeams(workspaceFolder);

      if (teams.length === 0) {
        vscode.window.showInformationMessage(
          'No teams found. Create one with: Agent Team: Create Team',
        );
        return;
      }

      const selectedTeam = await this.selectTeamToSync(teams);
      if (!selectedTeam) return;

      const dryRun = await this.selectSyncMode();
      if (!dryRun) return;

      const result = await this.performTeamSync(workspaceFolder, selectedTeam.label, dryRun.value);

      await this.displaySyncResults(selectedTeam.label, result, dryRun.value);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to sync team: ${error}`);
      this.logger.error(`Team sync error: ${error}`);
    }
  }

  /**
   * Select team to sync
   */
  private async selectTeamToSync(
    teams: string[],
  ): Promise<{ label: string; description: string } | undefined> {
    return vscode.window.showQuickPick(
      teams.map((team) => ({
        label: team,
        description: 'Sync this team',
      })),
      {
        placeHolder: 'Select team to sync',
      },
    );
  }

  /**
   * Select sync mode (dry run or apply)
   */
  private async selectSyncMode(): Promise<
    { label: string; description: string; value: boolean } | undefined
  > {
    return vscode.window.showQuickPick(
      [
        {
          label: 'Apply Changes',
          description: 'Generate agents to .github/agents/',
          value: false,
        },
        {
          label: 'Preview Changes (Dry Run)',
          description: 'Show what would change without writing files',
          value: true,
        },
      ],
      {
        placeHolder: 'Choose action',
      },
    );
  }

  /**
   * Perform team sync operation
   */
  private async performTeamSync(
    workspaceFolder: string,
    teamLabel: string,
    dryRunMode: boolean,
  ): Promise<any> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Syncing team: ${teamLabel}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Loading profile...' });

        const syncResult = await this.teamManager.syncTeam(workspaceFolder, teamLabel, {
          dryRun: dryRunMode,
          showDiff: dryRunMode,
        });

        progress.report({ increment: 100, message: 'Complete!' });

        return syncResult;
      },
    );
  }

  /**
   * Display sync results to user
   */
  private async displaySyncResults(
    teamLabel: string,
    result: any,
    isDryRun: boolean,
  ): Promise<void> {
    if (isDryRun) {
      this.displayDryRunPreview(teamLabel, result);
    } else {
      vscode.window.showInformationMessage(
        `✅ Team synced! ${result.summary.created} created, ${result.summary.updated} updated to .github/agents/`,
      );
    }
  }

  /**
   * Display dry run preview output
   */
  private displayDryRunPreview(teamLabel: string, result: any): void {
    const output = this.logger.getOutputChannel();
    output.clear();
    output.show();

    output.appendLine('='.repeat(60));
    output.appendLine(`TEAM SYNC PREVIEW: ${teamLabel}`);
    output.appendLine('='.repeat(60));
    output.appendLine('');
    output.appendLine('📊 Summary:');
    output.appendLine(`   Total agents: ${result.summary.total}`);
    output.appendLine(`   ✨ New:       ${result.summary.created}`);
    output.appendLine(`   📝 Updated:   ${result.summary.updated}`);
    output.appendLine(`   ⏭️  Skipped:   ${result.summary.skipped}`);
    output.appendLine('');

    if (result.changes.length > 0) {
      output.appendLine('📋 Changes:');
      output.appendLine('─'.repeat(60));

      for (const change of result.changes) {
        const icon = change.action === 'create' ? '✨' : change.action === 'update' ? '📝' : '⏭️';
        output.appendLine('');
        output.appendLine(`${icon} ${change.agentId} (${change.action})`);
        output.appendLine(`   File: ${change.filepath}`);

        if (change.diff) {
          output.appendLine(change.diff);
        }
      }

      output.appendLine('');
      output.appendLine('─'.repeat(60));
      output.appendLine('💡 Run without dry-run to apply changes');
    }

    vscode.window.showInformationMessage(
      `Dry run complete! ${result.summary.created} new, ${result.summary.updated} updates. Check Output panel for details.`,
    );
  }

  /**
   * Browse Available Kits
   * Command: agent-teams.browseKits
   */
  async browseKits(): Promise<void> {
    const kits = this.getAvailableKits();

    if (kits.length === 0) {
      vscode.window.showInformationMessage('No kits available');
      return;
    }

    const selectedKit = await vscode.window.showQuickPick(
      kits.map((kit) => ({
        label: kit,
        description: 'View kit details',
      })),
      {
        placeHolder: 'Select kit to view',
      },
    );

    if (selectedKit) {
      // Open kit manifest
      const extensionPath = this.getExtensionPath();
      const kitPath = path.join(extensionPath, '..', '..', 'kits', selectedKit.label, 'kit.yml');

      if (fs.existsSync(kitPath)) {
        const uri = vscode.Uri.file(kitPath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
      } else {
        vscode.window.showWarningMessage(`Kit manifest not found: ${kitPath}`);
      }
    }
  }

  /**
   * Get workspace folder
   */
  private getWorkspaceFolder(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder open');
      return undefined;
    }
    return workspaceFolders[0].uri.fsPath;
  }

  /**
   * Get available kits
   */
  private getAvailableKits(): string[] {
    const extensionPath = this.getExtensionPath();
    const kitsPath = path.join(extensionPath, '..', '..', 'kits');

    if (!fs.existsSync(kitsPath)) {
      return [];
    }

    return fs.readdirSync(kitsPath).filter((item) => {
      const itemPath = path.join(kitsPath, item);
      return fs.statSync(itemPath).isDirectory();
    });
  }

  /**
   * Get extension path
   */
  private getExtensionPath(): string {
    return __dirname;
  }
}
