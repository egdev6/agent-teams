/**
 * Setup Engram Command
 * Detects whether the engram binary is available and configures the workspace
 * for Engram persistent memory: creates .vscode/mcp.json and updates .gitignore.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { Command, type CommandContext } from '../base/Command';

const ENGRAM_RELEASES_URL = 'https://github.com/Gentleman-Programming/engram/releases';

const MCP_SERVER_ENTRY = {
  command: 'engram',
  args: ['mcp'],
};

const GITIGNORE_BLOCK = `
# Engram persistent memory (local DB is gitignored; manifest + chunks are committed for git sync)
.engram/engram.db
`;

export class SetupEngramCommand extends Command {
  constructor(context: CommandContext) {
    super(context, {
      id: 'setupEngram',
      title: 'Setup Engram Memory',
      category: 'project',
      description: 'Configure Engram persistent memory for AI agents in this workspace',
    });
  }

  async execute(): Promise<void> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) return;

    if (!this.isEngramInstalled()) {
      await this.promptInstall(workspaceFolder);
      return;
    }

    try {
      const created: string[] = [];
      const updated: string[] = [];

      this.setupMcpJson(workspaceFolder, created, updated);
      this.updateGitignore(workspaceFolder, created, updated);
      await this.showSummary(workspaceFolder, created, updated);

      this.context.logger.info(
        `Engram setup: ${[...created.map((f) => `created ${f}`), ...updated.map((f) => `updated ${f}`)].join('; ') || 'already configured'}`,
      );
    } catch (error) {
      this.showError(`Engram setup failed: ${error}`, error);
    }
  }

  private async promptInstall(workspaceFolder: string): Promise<void> {
    const action = await vscode.window.showErrorMessage(
      'Engram binary not found in PATH. Install it first, then run this command again.',
      'Download Engram',
      'Cancel',
    );
    if (action === 'Download Engram') {
      await vscode.env.openExternal(vscode.Uri.parse(ENGRAM_RELEASES_URL));
    }
    if (!this.isWorkspaceConfigured(workspaceFolder)) {
      await this.offerWorkspaceSetup(workspaceFolder);
    }
  }

  private async offerWorkspaceSetup(workspaceFolder: string): Promise<void> {
    const setup = await vscode.window.showInformationMessage(
      'Pre-configure workspace files for Engram? (.vscode/mcp.json and .gitignore will be ready when you install the binary.)',
      'Configure Workspace',
      'Skip',
    );
    if (setup === 'Configure Workspace') {
      const created: string[] = [];
      const updated: string[] = [];
      this.setupMcpJson(workspaceFolder, created, updated);
      this.updateGitignore(workspaceFolder, created, updated);
      await this.showSummary(workspaceFolder, created, updated);
    }
  }

  private isWorkspaceConfigured(workspaceFolder: string): boolean {
    const mcpJsonPath = path.join(workspaceFolder, '.vscode', 'mcp.json');
    const gitignorePath = path.join(workspaceFolder, '.gitignore');
    const marker = '.engram/engram.db';

    let mcpOk = false;
    if (fs.existsSync(mcpJsonPath)) {
      try {
        const d = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8')) as Record<string, unknown>;
        mcpOk = !!(d.servers as Record<string, unknown> | undefined)?.engram;
      } catch {
        mcpOk = false;
      }
    }

    const gitOk =
      fs.existsSync(gitignorePath) && fs.readFileSync(gitignorePath, 'utf-8').includes(marker);

    return mcpOk && gitOk;
  }

  private setupMcpJson(workspaceFolder: string, created: string[], updated: string[]): void {
    const vscodeDirPath = path.join(workspaceFolder, '.vscode');
    const mcpJsonPath = path.join(vscodeDirPath, 'mcp.json');

    if (!fs.existsSync(vscodeDirPath)) {
      fs.mkdirSync(vscodeDirPath, { recursive: true });
    }

    if (!fs.existsSync(mcpJsonPath)) {
      fs.writeFileSync(
        mcpJsonPath,
        `${JSON.stringify({ servers: { engram: MCP_SERVER_ENTRY } }, null, 2)}\n`,
        'utf-8',
      );
      created.push('.vscode/mcp.json');
      return;
    }

    let existing: Record<string, unknown>;
    try {
      existing = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      existing = {};
    }

    const servers = (existing.servers ?? {}) as Record<string, unknown>;
    if (!servers.engram) {
      servers.engram = MCP_SERVER_ENTRY;
      existing.servers = servers;
      fs.writeFileSync(mcpJsonPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf-8');
      updated.push('.vscode/mcp.json');
    }
  }

  private updateGitignore(workspaceFolder: string, created: string[], updated: string[]): void {
    const gitignorePath = path.join(workspaceFolder, '.gitignore');
    const marker = '.engram/engram.db';

    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, GITIGNORE_BLOCK.trimStart(), 'utf-8');
      created.push('.gitignore');
      return;
    }

    if (!fs.readFileSync(gitignorePath, 'utf-8').includes(marker)) {
      fs.appendFileSync(gitignorePath, GITIGNORE_BLOCK, 'utf-8');
      updated.push('.gitignore');
    }
  }

  private async showSummary(
    workspaceFolder: string,
    created: string[],
    updated: string[],
  ): Promise<void> {
    if (created.length === 0 && updated.length === 0) {
      const action = await vscode.window.showInformationMessage(
        'Engram is already configured in this workspace.',
        'Open .vscode/mcp.json',
      );
      if (action === 'Open .vscode/mcp.json') {
        const doc = await vscode.workspace.openTextDocument(
          vscode.Uri.file(path.join(workspaceFolder, '.vscode', 'mcp.json')),
        );
        await vscode.window.showTextDocument(doc);
      }
      return;
    }

    const parts: string[] = [];
    if (created.length > 0) parts.push(`Created: ${created.join(', ')}`);
    if (updated.length > 0) parts.push(`Updated: ${updated.join(', ')}`);

    const action = await vscode.window.showInformationMessage(
      `Engram setup complete. ${parts.join(' | ')}. Run "engram sync" to export your first memory chunk.`,
      'Open .vscode/mcp.json',
    );

    if (action === 'Open .vscode/mcp.json') {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(path.join(workspaceFolder, '.vscode', 'mcp.json')),
      );
      await vscode.window.showTextDocument(doc);
    }
  }

  private isEngramInstalled(): boolean {
    try {
      execSync('engram -v', { stdio: 'ignore', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
