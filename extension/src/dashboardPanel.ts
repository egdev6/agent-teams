import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { Logger } from './logger';

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
    workspaceRoot: string
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
      this._disposables
    );
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    logger: Logger,
    workspaceRoot: string
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
        localResourceRoots: [extensionUri]
      }
    );

    DashboardPanel.currentPanel = new DashboardPanel(
      panel,
      extensionUri,
      logger,
      workspaceRoot
    );
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
      case 'refresh':
        this._update();
        break;
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
      'Delete', 'Cancel'
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
      } catch (error) {
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
    } catch (error) {
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

    let specCount = 0;
    let validSpecs = 0;
    const agents: Array<{ id: string; name: string; role: string; lastModified: string }> = [];

    if (fs.existsSync(specsDir)) {
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
            lastModified
          });
        } catch (error) {
          // Invalid spec
        }
      }
    }

    let syncStatus = 'NOT_SYNCED';
    let syncTime = 'Never';

    if (fs.existsSync(githubDir)) {
      const githubAgents = fs.readdirSync(githubDir).filter(f => f.endsWith('.agent.md'));
      if (githubAgents.length > 0) {
        syncStatus = 'SUCCESS';
        let latestTime = 0;
        for (const file of githubAgents) {
          const stats = fs.statSync(path.join(githubDir, file));
          if (stats.mtime.getTime() > latestTime) {
            latestTime = stats.mtime.getTime();
          }
        }
        syncTime = this._formatRelativeTime(new Date(latestTime));
      }
    }

    return {
      hasProfile,
      totalAgents: agents.length,
      specCount,
      validSpecs,
      syncStatus,
      syncTime,
      agents
    };
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
      stats
    });
  }

  private _getHtmlContent(stats: ReturnType<typeof this._getStats>): string {
    const webview = this._panel.webview;
    
    // Get URIs for the React bundle
    const distPath = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webviews');
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, 'dashboard.js'));
    
    // Generate nonce for CSP
    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Agent Teams Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
    #root { width: 100vw; height: 100vh; }
  </style>
  <script nonce="${nonce}">
    window.__INITIAL_STATE__ = ${JSON.stringify(stats)};
  </script>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
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
