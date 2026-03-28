import * as fs from 'node:fs';
import * as path from 'node:path';
import AdmZip from 'adm-zip';
import * as vscode from 'vscode';
import type { Logger } from './logger';

const AGENT_TEAMS_DIR = '.agent-teams';

export interface ProfileExportResult {
  filesWritten: number;
  conflicts: string[];
}

export class ProfileExporter {
  constructor(private readonly logger: Logger) {}

  async exportProfileAsZip(workspaceRoot: string): Promise<void> {
    const sourceDir = path.join(workspaceRoot, AGENT_TEAMS_DIR);

    if (!fs.existsSync(sourceDir)) {
      void vscode.window.showErrorMessage(
        'No .agent-teams/ directory found in this workspace. Nothing to export.',
      );
      return;
    }

    const target = await vscode.window.showSaveDialog({
      title: 'Export Profile as ZIP',
      defaultUri: vscode.Uri.file(path.join(workspaceRoot, 'agent-teams-profile.zip')),
      filters: { 'ZIP Files': ['zip'] },
      saveLabel: 'Export Profile',
    });

    if (!target) {
      return;
    }

    const zip = new AdmZip();
    this._addDirectoryToZip(zip, sourceDir, AGENT_TEAMS_DIR);

    zip.writeZip(target.fsPath);
    const count = zip.getEntries().length;
    this.logger.info(`Profile exported to ${target.fsPath} (${count} entries)`);
    void vscode.window.showInformationMessage(`Profile exported successfully (${count} files).`);
  }

  async importProfileFromZip(workspaceRoot: string): Promise<ProfileExportResult | null> {
    const uris = await vscode.window.showOpenDialog({
      title: 'Import Profile from ZIP',
      filters: { 'ZIP Files': ['zip'] },
      canSelectMany: false,
      openLabel: 'Import Profile',
    });

    if (!uris || uris.length === 0) {
      return null;
    }

    const zipPath = uris[0].fsPath;

    let zip: AdmZip;
    try {
      zip = new AdmZip(zipPath);
    } catch (e) {
      throw new Error(`Failed to read ZIP file: ${e}`);
    }

    const entries = zip.getEntries();
    const agentTeamsEntries = entries.filter(
      (e) => e.entryName.startsWith(`${AGENT_TEAMS_DIR}/`) || e.entryName === AGENT_TEAMS_DIR,
    );

    if (agentTeamsEntries.length === 0) {
      throw new Error(
        'The ZIP does not appear to contain a valid .agent-teams/ profile. ' +
          'Make sure it was exported with "Export Profile as ZIP".',
      );
    }

    // Detect conflicts: files that already exist in workspace
    const destBase = workspaceRoot;
    const conflicts: string[] = [];
    for (const entry of agentTeamsEntries) {
      if (entry.isDirectory) continue;
      const destPath = path.join(destBase, entry.entryName);
      if (fs.existsSync(destPath)) {
        conflicts.push(entry.entryName);
      }
    }

    if (conflicts.length > 0) {
      const proceed = await vscode.window.showWarningMessage(
        `${conflicts.length} file(s) already exist and will be overwritten. Proceed?`,
        { modal: true },
        'Overwrite',
        'Cancel',
      );
      if (proceed !== 'Overwrite') {
        return null;
      }
    }

    // Extract files
    let filesWritten = 0;
    for (const entry of agentTeamsEntries) {
      if (entry.isDirectory) continue;
      const destPath = path.join(destBase, entry.entryName);
      const destDir = path.dirname(destPath);
      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(destPath, entry.getData());
      filesWritten++;
    }

    this.logger.info(`Profile imported from ${zipPath} (${filesWritten} files written)`);
    return { filesWritten, conflicts };
  }

  private _addDirectoryToZip(zip: AdmZip, dirPath: string, zipPrefix: string): void {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const zipPath = `${zipPrefix}/${entry.name}`;
      if (entry.isDirectory()) {
        this._addDirectoryToZip(zip, fullPath, zipPath);
      } else {
        zip.addLocalFile(fullPath, zipPrefix);
      }
    }
  }
}
