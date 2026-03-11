import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import * as YAML from 'yaml';
import type { Logger } from './logger';
import { ProfileLoader } from './profileLoader';
import type { ProjectProfile } from './types';

/**
 * Profile Editor WebView Panel
 *
 * Provides a rich UI for creating and editing project profiles
 * with auto-detection and visual editing capabilities.
 */
export class ProfileEditorPanel {
  public static currentPanel: ProfileEditorPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private logger: Logger;
  private workspaceRoot: string;
  private detectedConfig: any;

  private constructor(
    panel: vscode.WebviewPanel,
    _extensionUri: vscode.Uri,
    logger: Logger,
    workspaceRoot: string,
    detectedConfig: any,
  ) {
    this._panel = panel;
    this.logger = logger;
    this.workspaceRoot = workspaceRoot;
    this.detectedConfig = detectedConfig;

    // Set initial HTML
    this._update();

    // Listen for panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables,
    );
  }

  /**
   * Create or show the profile editor panel
   */
  public static async createOrShow(
    extensionUri: vscode.Uri,
    logger: Logger,
    workspaceRoot: string,
  ): Promise<void> {
    const column = vscode.ViewColumn.One;

    // If panel already exists, show it
    if (ProfileEditorPanel.currentPanel) {
      ProfileEditorPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Detect project configuration
    logger.info('Detecting project configuration...');
    const detectedConfig = await ProfileLoader.detectProjectConfig(workspaceRoot);
    logger.info(`Detected ${Object.keys(detectedConfig.technologies).length} technologies`);

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'profileEditor',
      'Project Profile Editor',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      },
    );
    panel.iconPath = vscode.Uri.joinPath(extensionUri, 'media', 'icon.png');

    ProfileEditorPanel.currentPanel = new ProfileEditorPanel(
      panel,
      extensionUri,
      logger,
      workspaceRoot,
      detectedConfig,
    );
  }

  /**
   * Handle messages from the webview
   */
  private async _handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'save':
        await this._saveProfile(message.data);
        break;
      case 'cancel':
        this._panel.dispose();
        break;
      case 'log':
        this.logger.info(`[ProfileEditor] ${message.message}`);
        break;
    }
  }

  /**
   * Save the profile to disk
   */
  private async _saveProfile(profileData: any): Promise<void> {
    try {
      this.logger.info('Saving project profile...');

      const profileDir = path.join(this.workspaceRoot, '.agent-teams');
      const profilePath = path.join(profileDir, 'project.profile.yml');

      // Create .agent-teams directory if it doesn't exist
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

      // Show success message
      vscode.window.showInformationMessage('✅ Project profile created successfully!');

      // Close panel
      this._panel.dispose();

      // Open the profile file
      const doc = await vscode.workspace.openTextDocument(profilePath);
      await vscode.window.showTextDocument(doc);
    } catch (error) {
      this.logger.error(`Failed to save profile: ${error}`);
      vscode.window.showErrorMessage(`Failed to save profile: ${error}`);
    }
  }

  /**
   * Update webview content
   */
  private _update(): void {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlContent(webview);
  }

  /**
   * Generate HTML content for the webview
   */
  private _getHtmlContent(_webview: vscode.Webview): string {
    // Get base folder name as default project name
    const folderName = path.basename(this.workspaceRoot);
    const defaultId = folderName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Profile Editor</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      color: #e4e4e7;
      background: #0a0e27;
      padding: 20px;
      line-height: 1.6;
    }

    h1 {
      color: #e4e4e7;
      margin-bottom: 10px;
      font-size: 28px;
      font-weight: 700;
    }

    .subtitle {
      color: #9ca3af;
      margin-bottom: 30px;
      font-size: 15px;
    }

    .section {
      background: #0f1535;
      border: 1px solid #1a1f3a;
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 20px;
      color: #e4e4e7;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-icon {
      font-size: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #e4e4e7;
      font-weight: 600;
      font-size: 13px;
    }

    input, select, textarea {
      width: 100%;
      padding: 10px 14px;
      background: #0a0e27;
      color: #e4e4e7;
      border: 1px solid #1a1f3a;
      border-radius: 6px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    .item-list {
      margin-top: 10px;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(37, 99, 235, 0.05);
      border: 1px solid #1a1f3a;
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .item:hover {
      background: rgba(37, 99, 235, 0.1);
      border-color: #2563eb;
    }

    .item-content {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .item-name {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      font-weight: 600;
      color: #60a5fa;
    }

    .item-value {
      color: #9ca3af;
      font-size: 12px;
    }

    .item-actions {
      display: flex;
      gap: 6px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .btn-primary {
      background: #2563eb;
      color: #fff;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: #1e293b;
      color: #e4e4e7;
    }

    .btn-secondary:hover {
      background: #334155;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn-small {
      padding: 6px 12px;
      font-size: 11px;
    }

    .add-item {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .add-item input {
      flex: 1;
    }

    .footer {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #1a1f3a;
    }

    .detected-badge {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .hint {
      color: #6b7280;
      font-size: 12px;
      margin-top: 6px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    @media (max-width: 768px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Project Profile Editor</h1>
    <p class="subtitle">Configure your project settings with auto-detected values. Add, remove, or edit as needed.</p>

    <!-- Basic Info Section -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">📝</span>
        Basic Information
      </div>
      
      <div class="grid-2">
        <div class="form-group">
          <label for="project-id">Project ID</label>
          <input type="text" id="project-id" value="${defaultId}" placeholder="my-project">
          <div class="hint">Lowercase letters, numbers, and hyphens only</div>
        </div>

        <div class="form-group">
          <label for="project-name">Project Name</label>
          <input type="text" id="project-name" value="${folderName}" placeholder="My Project">
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label for="project-type">Project Type</label>
          <select id="project-type">
            <option value="frontend" ${this.detectedConfig.type === 'frontend' ? 'selected' : ''}>Frontend</option>
            <option value="backend" ${this.detectedConfig.type === 'backend' ? 'selected' : ''}>Backend</option>
            <option value="fullstack" ${this.detectedConfig.type === 'fullstack' ? 'selected' : ''}>Full-stack</option>
            <option value="monorepo" ${this.detectedConfig.type === 'monorepo' ? 'selected' : ''}>Monorepo</option>
            <option value="library" ${this.detectedConfig.type === 'library' ? 'selected' : ''}>Library</option>
          </select>
        </div>

        <div class="form-group">
          <label for="project-version">Version</label>
          <input type="text" id="project-version" value="1.0.0" placeholder="1.0.0">
        </div>
      </div>
    </div>

    <!-- Technologies Section -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">⚡</span>
        Technologies
        <span class="detected-badge">AUTO-DETECTED</span>
      </div>
      
      <div id="technologies-list" class="item-list"></div>
      
      <div class="add-item">
        <input type="text" id="new-tech" placeholder="Add technology (e.g., rust, python, docker)">
        <button class="btn btn-secondary" onclick="addTechnology()">Add</button>
      </div>
    </div>

    <!-- Paths Section -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">📁</span>
        Paths
        <span class="detected-badge">AUTO-DETECTED</span>
      </div>
      
      <div id="paths-list" class="item-list"></div>
      
      <div class="add-item">
        <input type="text" id="new-path-key" placeholder="Path name (e.g., backend)" style="flex: 0.4;">
        <input type="text" id="new-path-value" placeholder="Path value (e.g., ./backend)" style="flex: 0.6;">
        <button class="btn btn-secondary" onclick="addPath()">Add</button>
      </div>
    </div>

    <!-- Commands Section -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">⚙️</span>
        Commands
        <span class="detected-badge">AUTO-DETECTED</span>
      </div>
      
      <div id="commands-list" class="item-list"></div>
      
      <div class="add-item">
        <input type="text" id="new-cmd-key" placeholder="Command name (e.g., lint)" style="flex: 0.3;">
        <input type="text" id="new-cmd-value" placeholder="Command (e.g., npm run lint)" style="flex: 0.7;">
        <button class="btn btn-secondary" onclick="addCommand()">Add</button>
      </div>
    </div>

    <!-- Context Packs Section -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">📦</span>
        Context Packs
      </div>
      
      <div id="context-packs-list" class="item-list"></div>
      
      <div class="add-item">
        <input type="text" id="new-context-pack" placeholder="Add context pack (e.g., security, testing)">
        <button class="btn btn-secondary" onclick="addContextPack()">Add</button>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="footer">
      <button class="btn btn-secondary" onclick="cancel()">Cancel</button>
      <button class="btn btn-primary" onclick="save()">Save Profile</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    // Initial data from detection
    let data = ${JSON.stringify({
      technologies: this.detectedConfig.technologies,
      paths: this.detectedConfig.paths,
      commands: this.detectedConfig.commands,
      contextPacks: ['architecture'],
    })};

    // Render initial lists
    renderTechnologies();
    renderPaths();
    renderCommands();
    renderContextPacks();

    function renderTechnologies() {
      const list = document.getElementById('technologies-list');
      list.innerHTML = '';
      
      Object.keys(data.technologies).forEach(tech => {
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = \`
          <div class="item-content">
            <span class="item-name">\${tech}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-danger btn-small" onclick="removeTechnology('\${tech}')">🗑️</button>
          </div>
        \`;
        list.appendChild(item);
      });
    }

    function renderPaths() {
      const list = document.getElementById('paths-list');
      list.innerHTML = '';
      
      Object.entries(data.paths).forEach(([key, value]) => {
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = \`
          <div class="item-content">
            <span class="item-name">\${key}</span>
            <span class="item-value">\${value}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-danger btn-small" onclick="removePath('\${key}')">🗑️</button>
          </div>
        \`;
        list.appendChild(item);
      });
    }

    function renderCommands() {
      const list = document.getElementById('commands-list');
      list.innerHTML = '';
      
      Object.entries(data.commands).forEach(([key, value]) => {
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = \`
          <div class="item-content">
            <span class="item-name">\${key}</span>
            <span class="item-value">\${value}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-danger btn-small" onclick="removeCommand('\${key}')">🗑️</button>
          </div>
        \`;
        list.appendChild(item);
      });
    }

    function renderContextPacks() {
      const list = document.getElementById('context-packs-list');
      list.innerHTML = '';
      
      data.contextPacks.forEach(pack => {
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = \`
          <div class="item-content">
            <span class="item-name">\${pack}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-danger btn-small" onclick="removeContextPack('\${pack}')">🗑️</button>
          </div>
        \`;
        list.appendChild(item);
      });
    }

    function addTechnology() {
      const input = document.getElementById('new-tech');
      const tech = input.value.trim().toLowerCase();
      if (tech && !data.technologies[tech]) {
        data.technologies[tech] = true;
        input.value = '';
        renderTechnologies();
      }
    }

    function removeTechnology(tech) {
      delete data.technologies[tech];
      renderTechnologies();
    }

    function addPath() {
      const keyInput = document.getElementById('new-path-key');
      const valueInput = document.getElementById('new-path-value');
      const key = keyInput.value.trim();
      const value = valueInput.value.trim();
      
      if (key && value) {
        data.paths[key] = value;
        keyInput.value = '';
        valueInput.value = '';
        renderPaths();
      }
    }

    function removePath(key) {
      delete data.paths[key];
      renderPaths();
    }

    function addCommand() {
      const keyInput = document.getElementById('new-cmd-key');
      const valueInput = document.getElementById('new-cmd-value');
      const key = keyInput.value.trim();
      const value = valueInput.value.trim();
      
      if (key && value) {
        data.commands[key] = value;
        keyInput.value = '';
        valueInput.value = '';
        renderCommands();
      }
    }

    function removeCommand(key) {
      delete data.commands[key];
      renderCommands();
    }

    function addContextPack() {
      const input = document.getElementById('new-context-pack');
      const pack = input.value.trim();
      if (pack && !data.contextPacks.includes(pack)) {
        data.contextPacks.push(pack);
        input.value = '';
        renderContextPacks();
      }
    }

    function removeContextPack(pack) {
      data.contextPacks = data.contextPacks.filter(p => p !== pack);
      renderContextPacks();
    }

    function save() {
      const profileData = {
        id: document.getElementById('project-id').value.trim(),
        name: document.getElementById('project-name').value.trim(),
        version: document.getElementById('project-version').value.trim(),
        type: document.getElementById('project-type').value,
        technologies: data.technologies,
        paths: data.paths,
        commands: data.commands,
        context_packs: data.contextPacks,
        overrides: {}
      };

      // Validate
      if (!profileData.id || !/^[a-z0-9-]+$/.test(profileData.id)) {
        alert('Project ID must contain only lowercase letters, numbers, and hyphens');
        return;
      }

      if (!profileData.name) {
        alert('Project name is required');
        return;
      }

      vscode.postMessage({ type: 'save', data: profileData });
    }

    function cancel() {
      vscode.postMessage({ type: 'cancel' });
    }

    // Allow Enter key to add items
    document.getElementById('new-tech').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTechnology();
    });
    document.getElementById('new-path-value').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addPath();
    });
    document.getElementById('new-cmd-value').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addCommand();
    });
    document.getElementById('new-context-pack').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addContextPack();
    });
  </script>
</body>
</html>`;
  }

  public dispose(): void {
    ProfileEditorPanel.currentPanel = undefined;

    // Clean up resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
