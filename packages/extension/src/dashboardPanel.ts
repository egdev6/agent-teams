import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import * as YAML from 'yaml';
import type { Logger } from './logger';
import { ProfileLoader } from './profileLoader';
import type { ProjectProfile } from './types';

/**
 * Dashboard WebView Panel
 *
 * Central hub for managing Agent Teams - shows stats, quick actions,
 * active agents, and onboarding with modern UI.
 */
export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private logger: Logger;
  private workspaceRoot: string;
  private extensionUri: vscode.Uri;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    logger: Logger,
    workspaceRoot: string,
  ) {
    this._panel = panel;
    this.logger = logger;
    this.workspaceRoot = workspaceRoot;
    this.extensionUri = extensionUri;

    this._update();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables,
    );
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    logger: Logger,
    workspaceRoot: string,
  ): void {
    const column = vscode.ViewColumn.One;

    if (DashboardPanel.currentPanel) {
      DashboardPanel.currentPanel._panel.reveal(column);
      DashboardPanel.currentPanel._update();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'agentTeamsDashboard',
      'Agent Teams Dashboard',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      },
    );

    DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, logger, workspaceRoot);
  }

  private async _handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'initProject':
        await vscode.commands.executeCommand('agent-teams.initProfile');
        break;
      case 'createAgent':
        await vscode.commands.executeCommand('agent-teams.createAgent');
        this._update();
        break;
      case 'syncAgents':
        await vscode.commands.executeCommand('agent-teams.syncAgents');
        this._update();
        break;
      case 'browseKits':
        await vscode.commands.executeCommand('agent-teams.browseKits');
        break;
      case 'openChat':
        await vscode.commands.executeCommand('workbench.action.chat.open');
        break;
      case 'editAgent':
        await this._editAgent(message.agentId);
        break;
      case 'deleteAgent':
        await this._deleteAgent(message.agentId);
        break;
      case 'viewSpec':
        await this._viewSpec(message.agentId);
        break;
      case 'requestDetectedConfig':
        await this._sendDetectedConfig();
        break;
      case 'saveProfile':
        await this._saveProfile(message.profile);
        break;
      case 'refresh':
        this._update();
        break;
    }
  }

  private async _sendDetectedConfig(): Promise<void> {
    try {
      this.logger.info('Detecting project configuration...');
      const detectedConfig = await ProfileLoader.detectProjectConfig(this.workspaceRoot);
      const folderName = path.basename(this.workspaceRoot);

      this._panel.webview.postMessage({
        type: 'detectedConfig',
        config: detectedConfig,
        workspaceName: folderName,
      });
    } catch (error) {
      this.logger.error(`Failed to detect config: ${error}`);
    }
  }

  private async _saveProfile(profileData: any): Promise<void> {
    try {
      this.logger.info('Saving project profile...');

      const profileDir = path.join(this.workspaceRoot, '.agent-team');
      const profilePath = path.join(profileDir, 'project.profile.yml');

      // Create .agent-team directory if it doesn't exist
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }

      // Construct profile object
      const profile: ProjectProfile = {
        project: {
          id: profileData.id,
          name: profileData.name,
          version: profileData.version || '1.0.0',
          type: profileData.type,
        },
        technologies: profileData.technologies,
        paths: profileData.paths,
        commands: profileData.commands,
        context_packs: profileData.context_packs || ['architecture'],
        overrides: profileData.overrides || {},
      };

      // Write to file
      const content = YAML.stringify(profile);
      fs.writeFileSync(profilePath, content, 'utf-8');

      this.logger.info('Project profile saved successfully');
      vscode.window.showInformationMessage('✅ Project profile created successfully!');

      // Update dashboard stats
      this._update();

      // Open the profile file
      const doc = await vscode.workspace.openTextDocument(profilePath);
      await vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: vscode.ViewColumn.Two,
      });
    } catch (error) {
      this.logger.error(`Failed to save profile: ${error}`);
      vscode.window.showErrorMessage(`Failed to save profile: ${error}`);
    }
  }

  private async _editAgent(agentId: string): Promise<void> {
    const specPath = this._findSpecByAgentId(agentId);
    if (specPath) {
      const doc = await vscode.workspace.openTextDocument(specPath);
      await vscode.window.showTextDocument(doc);
    }
  }

  private async _deleteAgent(agentId: string): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      `Delete agent "${agentId}"?`,
      'Delete',
      'Cancel',
    );

    if (confirm !== 'Delete') return;

    try {
      const specPath = this._findSpecByAgentId(agentId);
      const agentPath = path.join(this.workspaceRoot, 'agents', `${agentId}.md`);
      const githubPath = path.join(this.workspaceRoot, '.github', 'agents', `${agentId}.agent.md`);

      if (specPath && fs.existsSync(specPath)) fs.unlinkSync(specPath);
      if (fs.existsSync(agentPath)) fs.unlinkSync(agentPath);
      if (fs.existsSync(githubPath)) fs.unlinkSync(githubPath);

      vscode.window.showInformationMessage(`✅ Deleted agent "${agentId}"`);
      this._update();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete agent: ${error}`);
    }
  }

  private async _viewSpec(agentId: string): Promise<void> {
    const specPath = this._findSpecByAgentId(agentId);
    if (specPath) {
      const doc = await vscode.workspace.openTextDocument(specPath);
      await vscode.window.showTextDocument(doc, { preview: true });
    }
  }

  private _findSpecByAgentId(agentId: string): string | null {
    const specsDir = path.join(this.workspaceRoot, 'specs');
    if (!fs.existsSync(specsDir)) return null;

    const specs = this._findSpecFiles(specsDir);
    for (const spec of specs) {
      try {
        const content = fs.readFileSync(spec, 'utf-8');
        const parsed = YAML.parse(content);
        if (parsed._metadata?.id === agentId) {
          return spec;
        }
      } catch (_error) {
        // Ignore
      }
    }
    return null;
  }

  private _findSpecFiles(dir: string): string[] {
    const results: string[] = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this._findSpecFiles(fullPath));
        } else if (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
          results.push(fullPath);
        }
      }
    } catch (_error) {
      // Ignore
    }
    return results;
  }

  private _getStats(): {
    hasProfile: boolean;
    totalAgents: number;
    specCount: number;
    validSpecs: number;
    syncStatus: string;
    syncTime: string;
    agents: Array<{
      id: string;
      name: string;
      role: string;
      lastModified: string;
    }>;
  } {
    const profilePath = path.join(this.workspaceRoot, '.agent-team', 'project.profile.yml');
    const hasProfile = fs.existsSync(profilePath);

    const specsDir = path.join(this.workspaceRoot, 'specs');
    const githubDir = path.join(this.workspaceRoot, '.github', 'agents');

    const { specCount, validSpecs, agents } = this._loadAgents(specsDir);
    const { syncStatus, syncTime } = this._getSyncStatus(githubDir);

    return {
      hasProfile,
      totalAgents: agents.length,
      specCount,
      validSpecs,
      syncStatus,
      syncTime,
      agents,
    };
  }

  private _loadAgents(specsDir: string): {
    specCount: number;
    validSpecs: number;
    agents: Array<{ id: string; name: string; role: string; lastModified: string }>;
  } {
    let specCount = 0;
    let validSpecs = 0;
    const agents: Array<{ id: string; name: string; role: string; lastModified: string }> = [];

    if (!fs.existsSync(specsDir)) {
      return { specCount, validSpecs, agents };
    }

    const specs = this._findSpecFiles(specsDir);
    specCount = specs.length;

    for (const spec of specs) {
      try {
        const content = fs.readFileSync(spec, 'utf-8');
        const parsed = YAML.parse(content);
        validSpecs++;

        const stats = fs.statSync(spec);
        const lastModified = this._formatRelativeTime(stats.mtime);

        agents.push({
          id: parsed._metadata?.id || 'unknown',
          name: parsed.name || 'Unknown',
          role: parsed._metadata?.role || 'worker',
          lastModified,
        });
      } catch (_error) {
        // Invalid spec
      }
    }

    return { specCount, validSpecs, agents };
  }

  private _getSyncStatus(githubDir: string): { syncStatus: string; syncTime: string } {
    let syncStatus = 'NOT_SYNCED';
    let syncTime = 'Never';

    if (!fs.existsSync(githubDir)) {
      return { syncStatus, syncTime };
    }

    const githubAgents = fs.readdirSync(githubDir).filter((f) => f.endsWith('.agent.md'));
    if (githubAgents.length === 0) {
      return { syncStatus, syncTime };
    }

    syncStatus = 'SUCCESS';
    let latestTime = 0;
    for (const file of githubAgents) {
      const stats = fs.statSync(path.join(githubDir, file));
      if (stats.mtime.getTime() > latestTime) {
        latestTime = stats.mtime.getTime();
      }
    }
    syncTime = this._formatRelativeTime(new Date(latestTime));

    return { syncStatus, syncTime };
  }

  private _formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHour > 0) return `${diffHour}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'Just now';
  }

  private _update(): void {
    const stats = this._getStats();
    this._panel.webview.html = this._getHtmlContent(stats);

    // Send stats update to React
    this._panel.webview.postMessage({
      type: 'updateStats',
      stats,
    });
  }

  private _getHtmlContent(stats: ReturnType<typeof this._getStats>): string {
    const webview = this._panel.webview;
    const distPath = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webviews');
    const nonce = this._getNonce();

    try {
      // Read the compiled dashboard.html from Vite build
      const htmlPath = path.join(
        path.dirname(this.extensionUri.fsPath),
        'dist',
        'webviews',
        'dashboard.html',
      );
      let html = fs.readFileSync(htmlPath, 'utf-8');

      // Replace absolute paths with webview URIs
      html = html.replace(/src="\/([^"]+)"/g, (_match, filename) => {
        const uri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, filename));
        return `src="${uri}"`;
      });

      html = html.replace(/href="\/([^"]+)"/g, (_match, filename) => {
        const uri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, filename));
        return `href="${uri}"`;
      });

      // Add nonce to all scripts
      html = html.replace(/<script/g, `<script nonce="${nonce}"`);

      // Add CSP meta tag with type="module" support
      const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">`;
      html = html.replace('<meta charset="UTF-8"', cspMeta);

      // Add initial state script before closing head
      const initialStateScript = `<script nonce="${nonce}">
        window.__INITIAL_STATE__ = ${JSON.stringify(stats)};
      </script>`;
      html = html.replace('</head>', `${initialStateScript}</head>`);

      return html;
    } catch (error) {
      this.logger.error(`Failed to load dashboard HTML: ${error}`);

      // Fallback: simple HTML that loads the bundle
      const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'dashboard.js'));
      const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'dashboard.css'));

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">
  <title>Agent Teams Dashboard</title>
  <link rel="stylesheet" href="${cssUri}">
  <script nonce="${nonce}">
    window.__INITIAL_STATE__ = ${JSON.stringify(stats)};
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  public dispose(): void {
    DashboardPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
