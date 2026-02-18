import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import * as YAML from 'yaml';
import type { Logger } from './logger';
import type { KitManifest } from './types';

/**
 * Kit Browser WebView Panel
 *
 * Provides a rich UI for exploring available kits, viewing details,
 * and creating teams from kits.
 */
export class KitBrowserPanel {
  public static currentPanel: KitBrowserPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private logger: Logger;
  private kitsPath: string;

  private constructor(
    panel: vscode.WebviewPanel,
    _extensionUri: vscode.Uri,
    logger: Logger,
    kitsPath: string,
  ) {
    this._panel = panel;
    this.logger = logger;
    this.kitsPath = kitsPath;

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
   * Create or show the kit browser panel
   */
  public static createOrShow(extensionUri: vscode.Uri, logger: Logger, kitsPath: string) {
    const column = vscode.ViewColumn.One;

    // If panel exists, show it
    if (KitBrowserPanel.currentPanel) {
      KitBrowserPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel('kitBrowser', '📦 Kit Browser', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [extensionUri],
    });

    KitBrowserPanel.currentPanel = new KitBrowserPanel(panel, extensionUri, logger, kitsPath);
  }

  /**
   * Dispose of resources
   */
  public dispose() {
    KitBrowserPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Load all available kits
   */
  private async loadKits(): Promise<Array<{ id: string; manifest: KitManifest; path: string }>> {
    const kits: Array<{ id: string; manifest: KitManifest; path: string }> = [];

    if (!fs.existsSync(this.kitsPath)) {
      this.logger.warn(`Kits directory not found: ${this.kitsPath}`);
      return kits;
    }

    const entries = fs.readdirSync(this.kitsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const kitId = entry.name;
      const manifestPath = path.join(this.kitsPath, kitId, 'kit.yml');

      if (!fs.existsSync(manifestPath)) {
        this.logger.warn(`Kit manifest not found for: ${kitId}`);
        continue;
      }

      try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = YAML.parse(content) as KitManifest;

        kits.push({
          id: kitId,
          manifest,
          path: path.join(this.kitsPath, kitId),
        });
      } catch (error) {
        this.logger.error(`Failed to load kit ${kitId}`, error);
      }
    }

    return kits;
  }

  /**
   * Handle messages from webview
   */
  private async _handleMessage(message: any) {
    switch (message.command) {
      case 'refresh':
        await this._update();
        break;

      case 'createTeam':
        await this._createTeamFromKit(message.kitId);
        break;

      case 'viewKitFolder':
        await this._viewKitFolder(message.kitId);
        break;
    }
  }

  /**
   * Create team from selected kit
   */
  private async _createTeamFromKit(kitId: string) {
    try {
      // Trigger the team creation command with pre-selected kit
      await vscode.commands.executeCommand('agent-teams.createTeam');

      vscode.window.showInformationMessage(`Use the wizard to create a team with kit: ${kitId}`);
    } catch (error) {
      this.logger.error('Failed to create team', error);
      vscode.window.showErrorMessage(
        `Failed to create team: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Open kit folder in explorer
   */
  private async _viewKitFolder(kitId: string) {
    const kitPath = path.join(this.kitsPath, kitId);
    const uri = vscode.Uri.file(kitPath);
    await vscode.commands.executeCommand('revealFileInOS', uri);
  }

  /**
   * Update webview content
   */
  private async _update() {
    const kits = await this.loadKits();
    this._panel.webview.html = this._getHtmlContent(kits);
  }

  /**
   * Generate HTML content for the webview
   */
  private _getHtmlContent(
    kits: Array<{ id: string; manifest: KitManifest; path: string }>,
  ): string {
    const kitsJson = JSON.stringify(
      kits.map((k) => ({
        id: k.id,
        name: k.manifest.name,
        version: k.manifest.version,
        description: k.manifest.description || 'No description',
        author: k.manifest.author,
        license: k.manifest.license,
        agents: k.manifest.provides.agents,
        skills: k.manifest.provides.skills || [],
        contextPacks: k.manifest.provides.context_packs || [],
        requires: k.manifest.requires,
        defaults: k.manifest.defaults,
      })),
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kit Browser</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .header h1 {
      font-size: 28px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
    }

    .btn:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .search-box {
      margin-bottom: 20px;
    }

    .search-box input {
      width: 100%;
      padding: 10px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      font-size: 14px;
    }

    .search-box input:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }

    .filters {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .filter-chip {
      padding: 6px 12px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 12px;
      font-size: 12px;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .filter-chip:hover {
      opacity: 0.8;
    }

    .filter-chip.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .kits-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .kit-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 20px;
      transition: all 0.2s;
      cursor: pointer;
    }

    .kit-card:hover {
      border-color: var(--vscode-focusBorder);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .kit-card.selected {
      border-color: var(--vscode-button-background);
      background: var(--vscode-list-activeSelectionBackground);
    }

    .kit-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 12px;
    }

    .kit-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .kit-id {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      font-family: var(--vscode-editor-font-family);
    }

    .kit-version {
      padding: 2px 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .kit-description {
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .kit-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 16px;
    }

    .kit-meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .kit-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }

    .tag {
      padding: 4px 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 4px;
      font-size: 11px;
    }

    .tag.agent-tag {
      background: rgba(0, 122, 204, 0.3);
    }

    .tag.skill-tag {
      background: rgba(16, 124, 16, 0.3);
    }

    .tag.tech-tag {
      background: rgba(204, 120, 0, 0.3);
    }

    .kit-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--vscode-panel-border);
    }

    .kit-actions .btn {
      flex: 1;
      padding: 8px 12px;
      font-size: 12px;
    }

    .details-panel {
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100vh;
      background: var(--vscode-sideBar-background);
      border-left: 1px solid var(--vscode-panel-border);
      padding: 20px;
      overflow-y: auto;
      transition: right 0.3s;
      z-index: 1000;
    }

    .details-panel.open {
      right: 0;
    }

    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .details-header h2 {
      font-size: 20px;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      font-size: 20px;
      padding: 4px;
    }

    .details-section {
      margin-bottom: 24px;
    }

    .details-section h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
    }

    .details-list {
      list-style: none;
    }

    .details-list li {
      padding: 8px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      font-size: 13px;
    }

    .details-list li:last-child {
      border-bottom: none;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--vscode-descriptionForeground);
    }

    .empty-state h2 {
      font-size: 24px;
      margin-bottom: 12px;
    }

    .empty-state p {
      font-size: 14px;
      margin-bottom: 20px;
    }

    @media (max-width: 768px) {
      .kits-grid {
        grid-template-columns: 1fr;
      }

      .details-panel {
        width: 100%;
        right: -100%;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📦 Kit Browser</h1>
    <div class="header-actions">
      <button class="btn btn-secondary" onclick="refreshKits()">
        🔄 Refresh
      </button>
    </div>
  </div>

  <div class="search-box">
    <input
      type="text"
      id="searchInput"
      placeholder="🔍 Search kits by name, description, or agent..."
      oninput="filterKits()"
    />
  </div>

  <div class="filters" id="filters"></div>

  <div class="kits-grid" id="kitsGrid"></div>

  <div class="details-panel" id="detailsPanel">
    <div class="details-header">
      <h2>Kit Details</h2>
      <button class="close-btn" onclick="closeDetails()">✕</button>
    </div>
    <div id="detailsContent"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const kits = ${kitsJson};
    let selectedKit = null;
    let activeFilters = new Set();

    // Initialize
    renderKits(kits);
    renderFilters();

    function renderKits(kitsToRender) {
      const grid = document.getElementById('kitsGrid');

      if (kitsToRender.length === 0) {
        grid.innerHTML = \`
          <div class="empty-state">
            <h2>No Kits Found</h2>
            <p>No kits available in the workspace.</p>
          </div>
        \`;
        return;
      }

      grid.innerHTML = kitsToRender.map(kit => \`
        <div class="kit-card" onclick="selectKit('\${kit.id}')">
          <div class="kit-header">
            <div>
              <div class="kit-title">\${kit.name}</div>
              <div class="kit-id">\${kit.id}</div>
            </div>
            <span class="kit-version">v\${kit.version}</span>
          </div>

          <div class="kit-description">
            \${kit.description}
          </div>

          <div class="kit-meta">
            <div class="kit-meta-item">
              <span>👥</span>
              <span>\${kit.agents.length} agent\${kit.agents.length !== 1 ? 's' : ''}</span>
            </div>
            \${kit.skills.length > 0 ? \`
              <div class="kit-meta-item">
                <span>🛠️</span>
                <span>\${kit.skills.length} skill\${kit.skills.length !== 1 ? 's' : ''}</span>
              </div>
            \` : ''}
            \${kit.author ? \`
              <div class="kit-meta-item">
                <span>✍️</span>
                <span>\${kit.author}</span>
              </div>
            \` : ''}
          </div>

          <div class="kit-tags">
            \${kit.agents.slice(0, 3).map(agent => 
              \`<span class="tag agent-tag">\${agent}</span>\`
            ).join('')}
            \${kit.agents.length > 3 ? \`<span class="tag">+\${kit.agents.length - 3} more</span>\` : ''}
          </div>

          <div class="kit-actions">
            <button class="btn" onclick="event.stopPropagation(); createTeam('\${kit.id}')">
              ➕ Create Team
            </button>
            <button class="btn btn-secondary" onclick="event.stopPropagation(); viewDetails('\${kit.id}')">
              👁️ Details
            </button>
          </div>
        </div>
      \`).join('');
    }

    function renderFilters() {
      const filtersDiv = document.getElementById('filters');
      const allTechs = new Set();

      kits.forEach(kit => {
        if (kit.requires?.technologies) {
          kit.requires.technologies.forEach(tech => allTechs.add(tech));
        }
      });

      const techFilters = Array.from(allTechs).sort();

      filtersDiv.innerHTML = techFilters.map(tech => 
        \`<span class="filter-chip" onclick="toggleFilter('\${tech}')">\${tech}</span>\`
      ).join('');
    }

    function toggleFilter(tech) {
      if (activeFilters.has(tech)) {
        activeFilters.delete(tech);
      } else {
        activeFilters.add(tech);
      }

      // Update UI
      document.querySelectorAll('.filter-chip').forEach(chip => {
        const chipTech = chip.textContent;
        if (activeFilters.has(chipTech)) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });

      filterKits();
    }

    function filterKits() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      
      const filtered = kits.filter(kit => {
        // Search filter
        const matchesSearch = !searchTerm ||
          kit.name.toLowerCase().includes(searchTerm) ||
          kit.description.toLowerCase().includes(searchTerm) ||
          kit.id.toLowerCase().includes(searchTerm) ||
          kit.agents.some(a => a.toLowerCase().includes(searchTerm));

        // Technology filter
        const matchesTech = activeFilters.size === 0 ||
          (kit.requires?.technologies && 
           kit.requires.technologies.some(t => activeFilters.has(t)));

        return matchesSearch && matchesTech;
      });

      renderKits(filtered);
    }

    function selectKit(kitId) {
      selectedKit = kitId;
      document.querySelectorAll('.kit-card').forEach(card => {
        card.classList.remove('selected');
      });
      event.currentTarget.classList.add('selected');
    }

    function viewDetails(kitId) {
      const kit = kits.find(k => k.id === kitId);
      if (!kit) return;

      const detailsContent = document.getElementById('detailsContent');
      
      detailsContent.innerHTML = \`
        <div class="details-section">
          <h3>Basic Information</h3>
          <div class="details-list">
            <li><strong>ID:</strong> \${kit.id}</li>
            <li><strong>Name:</strong> \${kit.name}</li>
            <li><strong>Version:</strong> \${kit.version}</li>
            \${kit.author ? \`<li><strong>Author:</strong> \${kit.author}</li>\` : ''}
            \${kit.license ? \`<li><strong>License:</strong> \${kit.license}</li>\` : ''}
          </div>
        </div>

        <div class="details-section">
          <h3>Description</h3>
          <p>\${kit.description}</p>
        </div>

        <div class="details-section">
          <h3>Agents (\${kit.agents.length})</h3>
          <ul class="details-list">
            \${kit.agents.map(agent => \`<li>\${agent}</li>\`).join('')}
          </ul>
        </div>

        \${kit.skills.length > 0 ? \`
          <div class="details-section">
            <h3>Skills (\${kit.skills.length})</h3>
            <ul class="details-list">
              \${kit.skills.map(skill => \`<li>\${skill}</li>\`).join('')}
            </ul>
          </div>
        \` : ''}

        \${kit.contextPacks.length > 0 ? \`
          <div class="details-section">
            <h3>Context Packs (\${kit.contextPacks.length})</h3>
            <ul class="details-list">
              \${kit.contextPacks.map(pack => \`<li>\${pack}</li>\`).join('')}
            </ul>
          </div>
        \` : ''}

        \${kit.requires?.technologies ? \`
          <div class="details-section">
            <h3>Required Technologies</h3>
            <ul class="details-list">
              \${kit.requires.technologies.map(tech => \`<li>\${tech}</li>\`).join('')}
            </ul>
          </div>
        \` : ''}

        \${kit.defaults ? \`
          <div class="details-section">
            <h3>Defaults</h3>
            <ul class="details-list">
              \${kit.defaults.output_mode ? \`<li><strong>Output Mode:</strong> \${kit.defaults.output_mode}</li>\` : ''}
              \${kit.defaults.max_files ? \`<li><strong>Max Files:</strong> \${kit.defaults.max_files}</li>\` : ''}
              \${kit.defaults.max_chars_per_file ? \`<li><strong>Max Chars/File:</strong> \${kit.defaults.max_chars_per_file}</li>\` : ''}
            </ul>
          </div>
        \` : ''}

        <div class="details-section">
          <button class="btn" style="width: 100%; margin-bottom: 8px;" onclick="createTeam('\${kit.id}')">
            ➕ Create Team with this Kit
          </button>
          <button class="btn btn-secondary" style="width: 100%;" onclick="viewKitFolder('\${kit.id}')">
            📁 Open Kit Folder
          </button>
        </div>
      \`;

      document.getElementById('detailsPanel').classList.add('open');
    }

    function closeDetails() {
      document.getElementById('detailsPanel').classList.remove('open');
    }

    function createTeam(kitId) {
      vscode.postMessage({
        command: 'createTeam',
        kitId: kitId
      });
    }

    function viewKitFolder(kitId) {
      vscode.postMessage({
        command: 'viewKitFolder',
        kitId: kitId
      });
    }

    function refreshKits() {
      vscode.postMessage({
        command: 'refresh'
      });
    }
  </script>
</body>
</html>`;
  }
}
