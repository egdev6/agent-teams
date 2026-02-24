import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { AgentGenerator } from './agentGenerator';
import { type CatalogData, CatalogManager } from './catalogManager';
import type { Logger } from './logger';
import { ProfileLoader } from './profileLoader';
import type { ProjectProfile } from './types';

type AgentRole = 'worker' | 'router' | 'orchestrator';

interface TeamSummary {
  id: string;
  name: string;
  description?: string;
  enabledAgentsCount?: number;
  enablesAllAgents?: boolean;
}

interface DashboardAgent {
  id: string;
  name: string;
  role: AgentRole;
  teamId?: string | null;
  scope?: 'team' | 'global';
  lastModified: string;
}

interface CatalogEntitySummary {
  id: string;
  name: string;
}

interface ProjectBindings {
  teamId: string | null;
  agentIds: string[];
  skillIds: string[];
}

interface GlobalCatalogSummary {
  teams: CatalogEntitySummary[];
  agents: CatalogEntitySummary[];
  skills: CatalogEntitySummary[];
}

interface DashboardStats {
  hasProfile: boolean;
  profileStatus: 'Active' | 'Not configured' | 'Error';
  profileError?: string;
  totalAgents: number | '—';
  specCount: number | '—';
  validSpecs: number | '—';
  teamsCount: number;
  teams: TeamSummary[];
  activeTeamId: string | null;
  teamContext: 'no_teams' | 'no_active_team' | 'active_team';
  syncStatus: 'SUCCESS' | 'WARNING' | 'NOT_SYNCED' | 'ERROR';
  syncTime: string;
  syncError?: string;
  warnings: string[];
  gatingReasons: {
    manageTeams?: string;
    createAgent?: string;
    browseSkills?: string;
    syncAgents?: string;
  };
  agents: DashboardAgent[];
  globalCatalog: GlobalCatalogSummary;
  bindings: ProjectBindings;
}

interface DashboardState {
  activeTeamId?: string | null;
}

/**
 * Dashboard WebView Panel
 */
export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _refreshTimer: NodeJS.Timeout | undefined;
  private _webviewAssetsPoller: NodeJS.Timeout | undefined;
  private _workspaceStatePoller: NodeJS.Timeout | undefined;
  private _lastWebviewAssetsStamp = 0;
  private _lastWorkspaceStateSignature = '';
  private _lastStatsSnapshot: string | null = null;
  private _pendingWebviewReload = false;
  private _htmlInitialized = false;
  private _lastSyncError: string | null = null;
  private logger: Logger;
  private workspaceRoot: string;
  private extensionUri: vscode.Uri;
  private catalogManager: CatalogManager;
  private agentGenerator: AgentGenerator;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    extensionContext: vscode.ExtensionContext,
    logger: Logger,
    workspaceRoot: string,
  ) {
    this._panel = panel;
    this.logger = logger;
    this.workspaceRoot = workspaceRoot;
    this.extensionUri = extensionUri;
    this.catalogManager = new CatalogManager(extensionContext, logger);
    this.agentGenerator = new AgentGenerator(logger);

    this._update();
    this._registerFileWatchers();
    this._startWebviewAssetsPolling();
    this._startWorkspaceStatePolling();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables,
    );
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    extensionContext: vscode.ExtensionContext,
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

    DashboardPanel.currentPanel = new DashboardPanel(
      panel,
      extensionUri,
      extensionContext,
      logger,
      workspaceRoot,
    );
  }

  private _registerFileWatchers(): void {
    const patterns = [
      '.agent-team/project.profile.yml',
      '.agent-team/project.profile.yaml',
      '.agent-team/dashboard.state.json',
      '.agent-team/bindings.yml',
      '.agent-team/bindings.yaml',
      '.agent-team/teams/*.yml',
      '.agent-team/teams/*.yaml',
      '.agent-teams/teams/*.yml',
      '.agent-teams/teams/*.yaml',
      'specs/**/*.yml',
      'specs/**/*.yaml',
      '.github/agents/*.agent.md',
      // Broad fallbacks for reliability across platforms/filesystems.
      '.agent-team/**/*',
      '.agent-teams/**/*',
      'specs/**/*',
    ];

    for (const glob of patterns) {
      this._registerWatcher(glob);
    }

    // Catch-all watcher so dashboard reacts to repository changes as well.
    this._registerWatcher('**/*');

    const onDidSave = vscode.workspace.onDidSaveTextDocument((document) => {
      const normalizedPath = document.uri.fsPath.replace(/\\/g, '/');
      if (
        normalizedPath.includes('/.agent-team/') ||
        normalizedPath.includes('/.agent-teams/') ||
        normalizedPath.includes('/specs/')
      ) {
        this._scheduleUpdate();
      }
    });
    this._disposables.push(onDidSave);
  }

  private _registerWatcher(glob: string): void {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.workspaceRoot, glob),
    );
    const scheduleUpdate = (uri: vscode.Uri) => {
      const shouldReloadWebview = this._shouldReloadWebview(uri);
      if (this._shouldIgnoreWatchUri(uri) && !shouldReloadWebview) {
        return;
      }
      this._scheduleUpdate(shouldReloadWebview);
    };
    watcher.onDidCreate(scheduleUpdate, null, this._disposables);
    watcher.onDidChange(scheduleUpdate, null, this._disposables);
    watcher.onDidDelete(scheduleUpdate, null, this._disposables);
    this._disposables.push(watcher);
  }

  private _shouldIgnoreWatchUri(uri: vscode.Uri): boolean {
    const normalizedPath = uri.fsPath.replace(/\\/g, '/');
    const ignoredSegments = ['/node_modules/', '/.git/', '/dist/', '/out/', '/.next/', '/.turbo/'];
    return ignoredSegments.some((segment) => normalizedPath.includes(segment));
  }

  private _shouldReloadWebview(uri: vscode.Uri): boolean {
    const normalizedPath = uri.fsPath.replace(/\\/g, '/');
    return (
      normalizedPath.includes('/packages/extension/dist/webviews/') ||
      normalizedPath.includes('/packages/webviews/dist/')
    );
  }

  private _scheduleUpdate(forceWebviewReload = false): void {
    if (forceWebviewReload) {
      this._pendingWebviewReload = true;
    }
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
    }
    this._refreshTimer = setTimeout(() => {
      if (this._pendingWebviewReload) {
        this._pendingWebviewReload = false;
        this._reloadWebview();
        return;
      }
      this._pushStats();
    }, 150);
  }

  private _reloadWebview(): void {
    const stats = this._getStats();
    this._lastStatsSnapshot = JSON.stringify(stats);
    this._panel.webview.html = this._getHtmlContent(stats);
    this._htmlInitialized = true;
  }

  private _startWebviewAssetsPolling(): void {
    this._lastWebviewAssetsStamp = this._getWebviewAssetsStamp();
    this._webviewAssetsPoller = setInterval(() => {
      const currentStamp = this._getWebviewAssetsStamp();
      if (currentStamp > this._lastWebviewAssetsStamp) {
        this._lastWebviewAssetsStamp = currentStamp;
        this._scheduleUpdate(true);
      }
    }, 1000);
  }

  private _startWorkspaceStatePolling(): void {
    this._lastWorkspaceStateSignature = this._getWorkspaceStateSignature();
    this._workspaceStatePoller = setInterval(() => {
      const currentSignature = this._getWorkspaceStateSignature();
      if (currentSignature !== this._lastWorkspaceStateSignature) {
        this._lastWorkspaceStateSignature = currentSignature;
        this._scheduleUpdate();
      }
    }, 1000);
  }

  private _safeStatStamp(targetPath: string): string {
    if (!fs.existsSync(targetPath)) {
      return 'missing';
    }
    try {
      const stats = fs.statSync(targetPath);
      return String(stats.mtimeMs);
    } catch (_error) {
      return 'error';
    }
  }

  private _safeCount(targetPath: string): number {
    if (!fs.existsSync(targetPath)) {
      return 0;
    }
    try {
      return fs.readdirSync(targetPath).length;
    } catch (_error) {
      return 0;
    }
  }

  private _getWorkspaceStateSignature(): string {
    const profilePath = path.join(this.workspaceRoot, '.agent-team', 'project.profile.yml');
    const bindingsPath = path.join(this.workspaceRoot, '.agent-team', 'bindings.yml');
    const teamsDirA = path.join(this.workspaceRoot, '.agent-team', 'teams');
    const teamsDirB = path.join(this.workspaceRoot, '.agent-teams', 'teams');
    const specsDir = path.join(this.workspaceRoot, 'specs');

    return [
      `profile:${this._safeStatStamp(profilePath)}`,
      `bindings:${this._safeStatStamp(bindingsPath)}`,
      `teamsA:${this._safeStatStamp(teamsDirA)}:${this._safeCount(teamsDirA)}`,
      `teamsB:${this._safeStatStamp(teamsDirB)}:${this._safeCount(teamsDirB)}`,
      `specs:${this._safeStatStamp(specsDir)}:${this._safeCount(specsDir)}`,
    ].join('|');
  }

  private _getWebviewAssetsStamp(): number {
    const webviewsDistDir = path.join(
      this.workspaceRoot,
      'packages',
      'extension',
      'dist',
      'webviews',
    );
    if (!fs.existsSync(webviewsDistDir)) {
      return 0;
    }

    try {
      const files = fs
        .readdirSync(webviewsDistDir)
        .filter((name) => name.endsWith('.html') || name.endsWith('.js') || name.endsWith('.css'));
      let maxMtime = 0;
      for (const file of files) {
        const stats = fs.statSync(path.join(webviewsDistDir, file));
        const mtime = stats.mtimeMs;
        if (mtime > maxMtime) {
          maxMtime = mtime;
        }
      }
      return maxMtime;
    } catch (_error) {
      return 0;
    }
  }

  private async _handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'initProject':
        await vscode.commands.executeCommand('agent-teams.initProfile');
        break;
      case 'createAgent':
        await this._createAgentFromPayload(message);
        break;
      case 'syncAgents':
        await this._syncAgents();
        break;
      case 'createTeam':
        await this._createTeam(message);
        break;
      case 'loadTeamTemplate':
        await this._loadTeamTemplate(message.teamId);
        break;
      case 'setActiveTeam':
        this._setActiveTeam(typeof message.teamId === 'string' ? message.teamId : null);
        this._pushStats();
        break;
      case 'saveGlobalBindings':
        this._saveProjectBindings(message);
        this._pushStats();
        break;
      case 'openChat':
        await vscode.commands.executeCommand('workbench.action.chat.open');
        break;
      case 'requestAgentData':
        await this._sendAgentData(message.agentId);
        break;
      case 'saveAgent':
        await this._saveAgentFromPayload(message);
        break;
      case 'editAgent':
        await this._sendAgentData(message.agentId);
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
      case 'requestContextPacksState':
        await this._sendContextPacksState();
        break;
      case 'saveContextPacks':
        await this._saveContextPacks(message.contextPacks);
        break;
      case 'createContextPack':
        await this._createContextPack(message.packId);
        break;
      case 'openContextPacksFolder':
        await this._openContextPacksFolder();
        break;
      case 'saveProfile':
        await this._saveProfile(message.profile);
        break;
      case 'refresh':
        this._pushStats(undefined, true);
        break;
    }
  }

  private async _syncAgents(): Promise<void> {
    const current = this._getStats();
    if (current.gatingReasons.syncAgents) {
      vscode.window.showWarningMessage(current.gatingReasons.syncAgents);
      return;
    }

    try {
      await vscode.commands.executeCommand('agent-teams.syncAgents');
      this._lastSyncError = null;
    } catch (error) {
      this._lastSyncError = String(error);
    }

    const next = this._getStats();
    this._pushStats(next);
    if (next.syncStatus === 'ERROR') {
      this._panel.webview.postMessage({
        type: 'syncResult',
        success: false,
        error: next.syncError || 'Unknown sync error',
      });
    }
  }

  private async _createTeam(message: any): Promise<void> {
    const current = this._getStats();
    if (current.gatingReasons.manageTeams) {
      vscode.window.showWarningMessage(current.gatingReasons.manageTeams);
      return;
    }
    try {
      const payload =
        typeof message?.teamId === 'string' && typeof message?.name === 'string'
          ? {
              teamId: message.teamId,
              name: message.name,
              description:
                typeof message.description === 'string' ? message.description : undefined,
              agents: Array.isArray(message.agents)
                ? message.agents.filter(
                    (agent: unknown): agent is string => typeof agent === 'string',
                  )
                : undefined,
              tags: Array.isArray(message.tags)
                ? message.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
                : undefined,
            }
          : undefined;

      if (payload) {
        await vscode.commands.executeCommand('agent-teams.createTeam', payload);
      } else {
        await vscode.commands.executeCommand('agent-teams.createTeam');
      }

      await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot);
      this._pushStats(undefined, true);
      this._panel.webview.postMessage({
        type: 'createTeamResult',
        success: true,
      });
    } catch (error) {
      const errorMessage = `Failed to create team: ${String(error)}`;
      vscode.window.showErrorMessage(errorMessage);
      this._panel.webview.postMessage({
        type: 'createTeamResult',
        success: false,
        error: errorMessage,
      });
    }
  }

  private _normalizeTeamTemplate(raw: unknown): {
    id: string;
    name: string;
    description?: string;
    agents?: string[];
    tags?: string[];
  } | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const team = raw as Record<string, unknown>;
    const id = typeof team.id === 'string' ? team.id.trim() : '';
    const name = typeof team.name === 'string' ? team.name.trim() : '';
    const description =
      typeof team.description === 'string' && team.description.trim()
        ? team.description.trim()
        : undefined;

    const enabledRaw =
      team.agents && typeof team.agents === 'object'
        ? (team.agents as Record<string, unknown>).enable
        : undefined;
    const agents = Array.isArray(enabledRaw)
      ? Array.from(
          new Set(
            enabledRaw
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter((item) => Boolean(item)),
          ),
        )
      : undefined;

    const tags = Array.isArray(team.tags)
      ? Array.from(
          new Set(
            team.tags
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter((item) => Boolean(item)),
          ),
        )
      : undefined;

    if (!id || !name) {
      return null;
    }

    return {
      id,
      name,
      description,
      agents,
      tags,
    };
  }

  private _loadTeamTemplateFromWorkspace(teamId: string): unknown | null {
    if (!teamId) {
      return null;
    }

    for (const teamsDir of this._teamDirectories()) {
      const ymlPath = path.join(teamsDir, `${teamId}.yml`);
      const yamlPath = path.join(teamsDir, `${teamId}.yaml`);
      const existingPath = fs.existsSync(ymlPath)
        ? ymlPath
        : fs.existsSync(yamlPath)
          ? yamlPath
          : null;
      if (!existingPath) {
        continue;
      }
      try {
        const raw = fs.readFileSync(existingPath, 'utf-8');
        return YAML.parse(raw);
      } catch (_error) {
        return null;
      }
    }

    return null;
  }

  private async _loadTeamTemplate(rawTeamId: unknown): Promise<void> {
    const teamId = typeof rawTeamId === 'string' ? rawTeamId.trim() : '';
    if (!teamId) {
      this._panel.webview.postMessage({
        type: 'teamTemplateError',
        error: 'Team template id is required.',
      });
      return;
    }

    try {
      const catalogSnapshot = this.catalogManager.getCatalogSnapshot();
      const fromCatalog = catalogSnapshot.teams?.[teamId]?.data;
      const fromWorkspace = this._loadTeamTemplateFromWorkspace(teamId);
      const normalized = this._normalizeTeamTemplate(fromWorkspace ?? fromCatalog);

      if (!normalized) {
        this._panel.webview.postMessage({
          type: 'teamTemplateError',
          error: `Could not load template for "${teamId}".`,
        });
        return;
      }

      this._panel.webview.postMessage({
        type: 'teamTemplate',
        team: normalized,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'teamTemplateError',
        error: `Failed to load team template: ${String(error)}`,
      });
    }
  }

  private async _sendDetectedConfig(): Promise<void> {
    try {
      this.logger.info('Detecting project configuration...');
      const detectedConfig = await ProfileLoader.detectProjectConfig(this.workspaceRoot);
      const folderName = path.basename(this.workspaceRoot);
      const existingProfile = this._readExistingProfileYaml();

      this._panel.webview.postMessage({
        type: 'detectedConfig',
        config: detectedConfig,
        workspaceName: folderName,
        profile: existingProfile,
      });
    } catch (error) {
      this.logger.error(`Failed to detect config: ${error}`);
    }
  }

  private _toTechnologyMap(input: any): Record<string, boolean> {
    if (Array.isArray(input)) {
      return Object.fromEntries(
        input.filter((value) => typeof value === 'string').map((value) => [value, true]),
      );
    }
    if (input && typeof input === 'object') {
      return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Boolean(value)]));
    }
    return {};
  }

  private _slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private _normalizeSyncTargets(input: unknown): Array<'claude_code' | 'codex' | 'github_copilot'> {
    const allowed = new Set(['claude_code', 'codex', 'github_copilot']);
    const raw = Array.isArray(input)
      ? input.filter((item): item is string => typeof item === 'string')
      : [];
    const normalized = Array.from(new Set(raw.filter((item) => allowed.has(item))));
    return normalized as Array<'claude_code' | 'codex' | 'github_copilot'>;
  }

  private _contextPacksDirPath(): string {
    return path.join(this.workspaceRoot, '.agent-team', 'context-packs');
  }

  private _sanitizePackId(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private _contextPackTemplate(packId: string): string {
    return `# ${packId}

## Project: {{project:name}}

{{#if project:type=frontend}}
This pack is focused on frontend conventions.
{{/if}}
{{#if project:type=backend}}
This pack is focused on backend conventions.
{{/if}}
{{#if project:type=fullstack}}
This pack covers frontend and backend conventions.
{{/if}}

## Purpose
Describe what this context pack adds to the project.

## Conventions
- Keep changes aligned with project architecture.
- Prefer patterns already used in the codebase.
- Validate using: \`{{command:test}}\`

## Paths
- Source: \`{{path:src}}\`
- Tests: \`{{path:tests_root}}\`

## Enabled Technologies
{{#each technologies}}
- {{this}}
{{/each}}
`;
  }

  private _listContextPacks(): string[] {
    const packsDir = this._contextPacksDirPath();
    if (!fs.existsSync(packsDir)) return [];
    try {
      return fs
        .readdirSync(packsDir)
        .filter((file) => file.endsWith('.md'))
        .map((file) => file.replace(/\.md$/i, ''))
        .filter((name) => Boolean(name))
        .sort((a, b) => a.localeCompare(b));
    } catch (_error) {
      return [];
    }
  }

  private _readExistingProfileYaml(): ProjectProfile | null {
    const profilePath = path.join(this.workspaceRoot, '.agent-team', 'project.profile.yml');
    if (!fs.existsSync(profilePath)) return null;
    try {
      const raw = fs.readFileSync(profilePath, 'utf-8');
      return YAML.parse(raw) as ProjectProfile;
    } catch (_error) {
      return null;
    }
  }

  private async _sendContextPacksState(): Promise<void> {
    try {
      const availablePacks = this._listContextPacks();
      const profile = this._readExistingProfileYaml();
      const selectedPacks = Array.isArray(profile?.context_packs)
        ? profile.context_packs.filter((item): item is string => typeof item === 'string')
        : [];

      this._panel.webview.postMessage({
        type: 'contextPacksState',
        availablePacks,
        selectedPacks,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'contextPacksError',
        error: `Failed to load context packs: ${String(error)}`,
      });
    }
  }

  private async _createContextPack(rawPackId: unknown): Promise<void> {
    const packId = this._sanitizePackId(rawPackId);
    if (!packId) {
      this._panel.webview.postMessage({
        type: 'contextPacksError',
        error: 'Invalid context pack name.',
      });
      return;
    }

    try {
      const packsDir = this._contextPacksDirPath();
      if (!fs.existsSync(packsDir)) {
        fs.mkdirSync(packsDir, { recursive: true });
      }

      const packPath = path.join(packsDir, `${packId}.md`);
      if (!fs.existsSync(packPath)) {
        fs.writeFileSync(packPath, this._contextPackTemplate(packId), 'utf-8');
      }

      const profile = this._readExistingProfileYaml();
      const currentSelected =
        profile && Array.isArray(profile.context_packs)
          ? profile.context_packs.filter((item): item is string => typeof item === 'string')
          : [];
      const nextSelected = currentSelected.includes(packId)
        ? currentSelected
        : [...currentSelected, packId];
      await this._saveContextPacks(nextSelected);

      const doc = await vscode.workspace.openTextDocument(packPath);
      await vscode.window.showTextDocument(doc, { preview: false });
      await this._sendContextPacksState();
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'contextPacksError',
        error: `Failed to create context pack: ${String(error)}`,
      });
    }
  }

  private async _openContextPacksFolder(): Promise<void> {
    try {
      const packsDir = this._contextPacksDirPath();
      if (!fs.existsSync(packsDir)) {
        fs.mkdirSync(packsDir, { recursive: true });
      }
      const folderUri = vscode.Uri.file(packsDir);
      let opened = false;
      try {
        await vscode.commands.executeCommand('revealFileInOS', folderUri);
        opened = true;
      } catch (_error) {
        opened = false;
      }

      if (!opened) {
        opened = await vscode.env.openExternal(folderUri);
      }

      if (!opened) {
        throw new Error('Could not open folder with available VS Code APIs.');
      }

      this._panel.webview.postMessage({
        type: 'contextPacksOpened',
        path: packsDir,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'contextPacksError',
        error: `Failed to open context packs folder: ${String(error)}`,
      });
    }
  }

  private async _saveContextPacks(input: unknown): Promise<void> {
    try {
      const contextPacks = Array.isArray(input)
        ? input
            .filter((item): item is string => typeof item === 'string')
            .map((item) => this._sanitizePackId(item))
            .filter((item) => Boolean(item))
        : [];
      const uniqueContextPacks = Array.from(new Set(contextPacks));

      const profileDir = path.join(this.workspaceRoot, '.agent-team');
      const profilePath = path.join(profileDir, 'project.profile.yml');
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }
      const packsDir = this._contextPacksDirPath();
      if (!fs.existsSync(packsDir)) {
        fs.mkdirSync(packsDir, { recursive: true });
      }

      // Ensure selected packs always exist on disk with a usable starter template.
      for (const packId of uniqueContextPacks) {
        const packPath = path.join(packsDir, `${packId}.md`);
        if (!fs.existsSync(packPath)) {
          fs.writeFileSync(packPath, this._contextPackTemplate(packId), 'utf-8');
        }
      }

      const existing = this._readExistingProfileYaml();
      const profile: ProjectProfile =
        existing && typeof existing === 'object'
          ? { ...existing, context_packs: uniqueContextPacks }
          : {
              project: {
                id: path.basename(this.workspaceRoot),
                name: path.basename(this.workspaceRoot),
                version: '1.0.0',
                type: 'fullstack',
              },
              technologies: {},
              paths: { root: '.', src: './src', tests_root: './tests' },
              commands: { build: 'pnpm build', test: 'pnpm test', dev: 'pnpm dev' },
              context_packs: uniqueContextPacks,
              overrides: {},
            };

      fs.writeFileSync(profilePath, YAML.stringify(profile), 'utf-8');
      vscode.window.showInformationMessage('✅ Context packs updated successfully.');
      this._panel.webview.postMessage({
        type: 'contextPacksSaved',
        count: uniqueContextPacks.length,
      });
      this._pushStats();
      await this._sendContextPacksState();
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'contextPacksError',
        error: `Failed to save context packs: ${String(error)}`,
      });
    }
  }

  private async _saveProfile(profileData: any): Promise<void> {
    try {
      this.logger.info('Saving project profile...');

      const profileDir = path.join(this.workspaceRoot, '.agent-team');
      const profilePath = path.join(profileDir, 'project.profile.yml');

      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }

      const existingProfile = this._readExistingProfileYaml();
      const profile = this._buildProfileObject(profileData, existingProfile);

      const content = YAML.stringify(profile);
      fs.writeFileSync(profilePath, content, 'utf-8');

      this.logger.info('Project profile saved successfully');
      vscode.window.showInformationMessage('✅ Project profile created successfully!');
      this._pushStats();

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

  private _buildProfileObject(profileData: any, existingProfile: any): ProjectProfile {
    const name =
      typeof profileData?.name === 'string' && profileData.name.trim()
        ? profileData.name.trim()
        : 'Project';
    const id =
      typeof profileData?.id === 'string' && profileData.id.trim()
        ? profileData.id.trim()
        : this._slugify(name);
    const syncTargets = this._normalizeSyncTargets(profileData?.syncTargets);
    const version =
      typeof profileData?.version === 'string' && profileData.version.trim()
        ? profileData.version.trim()
        : '1.0.0';
    const type =
      typeof profileData?.type === 'string' && profileData.type.trim()
        ? profileData.type.trim()
        : 'fullstack';
    const paths =
      profileData?.paths && typeof profileData.paths === 'object'
        ? profileData.paths
        : { root: '.', src: './src', tests_root: './tests' };
    const commands =
      profileData?.commands && typeof profileData.commands === 'object'
        ? profileData.commands
        : { build: 'pnpm build', test: 'pnpm test', dev: 'pnpm dev' };
    return {
      project: { id, name, version, type },
      technologies: this._toTechnologyMap(profileData?.technologies),
      paths,
      commands,
      context_packs: this._resolveContextPacks(profileData, existingProfile),
      sync_targets: this._resolveFinalSyncTargets(syncTargets, existingProfile),
      overrides: {},
    };
  }

  private _resolveContextPacks(profileData: any, existingProfile: any): string[] {
    if (Array.isArray(profileData?.contextPacks)) {
      return profileData.contextPacks.filter(
        (item: unknown): item is string => typeof item === 'string',
      );
    }
    if (existingProfile && Array.isArray(existingProfile.context_packs)) {
      return existingProfile.context_packs;
    }
    return ['architecture'];
  }

  private _resolveFinalSyncTargets(
    syncTargets: string[],
    existingProfile: any,
  ): Array<'claude_code' | 'codex' | 'github_copilot'> {
    if (syncTargets.length > 0) return this._normalizeSyncTargets(syncTargets);
    if (existingProfile && Array.isArray(existingProfile.sync_targets)) {
      return this._normalizeSyncTargets(existingProfile.sync_targets);
    }
    return ['claude_code', 'codex', 'github_copilot'];
  }

  private async _sendAgentData(agentId: string): Promise<void> {
    const specPath = this._findSpecByAgentId(agentId);
    if (!specPath) {
      this._panel.webview.postMessage({
        type: 'agentData',
        agentId,
        error: `Spec not found for agent "${agentId}"`,
      });
      return;
    }
    try {
      const content = fs.readFileSync(specPath, 'utf-8');
      const spec = YAML.parse(content);
      this._panel.webview.postMessage({
        type: 'agentData',
        agentId,
        name: spec.name || agentId,
        role: spec._metadata?.role || '',
        description: spec.description || '',
        skills: (spec._metadata?.skills?.allowed as string[]) || [],
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'agentData',
        agentId,
        error: String(error),
      });
    }
  }

  private async _createAgentFromPayload(message: {
    name: string;
    role?: string;
    description?: string;
    skills?: string[];
  }): Promise<void> {
    const gating = this._getStats().gatingReasons.createAgent;
    if (gating) {
      this._panel.webview.postMessage({ type: 'createAgentResult', success: false, error: gating });
      return;
    }
    const { name, role, description, skills } = message;
    if (!name?.trim()) {
      this._panel.webview.postMessage({
        type: 'createAgentResult',
        success: false,
        error: 'Agent name is required',
      });
      return;
    }
    try {
      const agentId = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const spec: Record<string, unknown> = {
        _metadata: {
          id: agentId,
          role: role || 'worker',
          domain: 'general',
          intents: [] as string[],
          ...(Array.isArray(skills) && skills.length > 0 ? { skills: { allowed: skills } } : {}),
        },
        name: name.trim(),
        description: description || '',
        instructions: `You are ${name.trim()}. ${description || ''}`.trim(),
        context_packs: [],
      };

      await this.agentGenerator.initialize(this.workspaceRoot);
      const specsDir = path.join(this.workspaceRoot, 'specs');
      const specPath = this.agentGenerator.saveSpec(spec, specsDir);
      const agentsDir = path.join(this.workspaceRoot, 'agents');
      const result = await this.agentGenerator.createAgent(specPath, agentsDir, this.workspaceRoot);

      if (result.success) {
        await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot);
        this._pushStats(undefined, true);
        this._panel.webview.postMessage({ type: 'createAgentResult', success: true });
      } else {
        this._panel.webview.postMessage({
          type: 'createAgentResult',
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'createAgentResult',
        success: false,
        error: String(error),
      });
    }
  }

  private async _saveAgentFromPayload(message: {
    agentId: string;
    name: string;
    role?: string;
    description?: string;
    skills?: string[];
  }): Promise<void> {
    const { agentId, name, role, description, skills } = message;
    if (!agentId || !name?.trim()) {
      this._panel.webview.postMessage({
        type: 'saveAgentResult',
        success: false,
        error: 'Agent ID and name are required',
      });
      return;
    }
    try {
      const specPath = this._findSpecByAgentId(agentId);
      if (!specPath) {
        this._panel.webview.postMessage({
          type: 'saveAgentResult',
          success: false,
          error: `Spec not found for agent "${agentId}"`,
        });
        return;
      }

      const existing = YAML.parse(fs.readFileSync(specPath, 'utf-8')) as Record<string, unknown>;
      const existingMeta = (existing._metadata as Record<string, unknown>) || {};
      const updated: Record<string, unknown> = {
        ...existing,
        name: name.trim(),
        description: description || '',
        context_packs: existing.context_packs || [],
        _metadata: {
          ...existingMeta,
          role: role || existingMeta.role || 'worker',
          ...(Array.isArray(skills) && skills.length > 0 ? { skills: { allowed: skills } } : {}),
        },
      };
      fs.writeFileSync(specPath, YAML.stringify(updated), 'utf-8');

      await this.agentGenerator.initialize(this.workspaceRoot);
      const agentsDir = path.join(this.workspaceRoot, 'agents');
      const result = await this.agentGenerator.createAgent(specPath, agentsDir, this.workspaceRoot);

      if (result.success) {
        await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot);
        this._pushStats(undefined, true);
        this._panel.webview.postMessage({ type: 'saveAgentResult', success: true });
      } else {
        this._panel.webview.postMessage({
          type: 'saveAgentResult',
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'saveAgentResult',
        success: false,
        error: String(error),
      });
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
      this._pushStats();
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
        if (parsed?._metadata?.id === agentId) {
          return spec;
        }
      } catch (_error) {
        // Ignore invalid spec files
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
      // Ignore traversal errors
    }
    return results;
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

  private _readProfileStatus(warnings: string[]): {
    hasProfile: boolean;
    profileStatus: DashboardStats['profileStatus'];
    profileError?: string;
  } {
    const profilePath = path.join(this.workspaceRoot, '.agent-team', 'project.profile.yml');
    if (!fs.existsSync(profilePath)) {
      return { hasProfile: false, profileStatus: 'Not configured' };
    }

    try {
      const raw = fs.readFileSync(profilePath, 'utf-8');
      const parsed = YAML.parse(raw);
      const isValidShape =
        typeof parsed?.project?.id === 'string' &&
        typeof parsed?.project?.name === 'string' &&
        typeof parsed?.project?.version === 'string' &&
        parsed?.paths &&
        typeof parsed.paths === 'object' &&
        parsed?.commands &&
        typeof parsed.commands === 'object';
      if (!isValidShape) {
        throw new Error('Project profile is missing required fields.');
      }
      return { hasProfile: true, profileStatus: 'Active' };
    } catch (error) {
      const profileError = String(error);
      warnings.push(profileError);
      return { hasProfile: false, profileStatus: 'Error', profileError };
    }
  }

  private _teamDirectories(): string[] {
    return [
      path.join(this.workspaceRoot, '.agent-team', 'teams'),
      path.join(this.workspaceRoot, '.agent-teams', 'teams'),
    ];
  }

  private _loadTeams(warnings: string[]): TeamSummary[] {
    const teamsById = new Map<string, TeamSummary>();

    for (const teamsDir of this._teamDirectories()) {
      if (!fs.existsSync(teamsDir)) continue;
      try {
        const files = fs
          .readdirSync(teamsDir)
          .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
        for (const file of files) {
          const entry = this._parseTeamEntry(path.join(teamsDir, file), file, warnings);
          if (entry) teamsById.set(entry.id, entry);
        }
      } catch (error) {
        warnings.push(`Failed to read teams directory: ${String(error)}`);
      }
    }

    return [...teamsById.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private _parseTeamEntry(filePath: string, file: string, warnings: string[]): TeamSummary | null {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = YAML.parse(raw);
      const id = (typeof parsed?.id === 'string' && parsed.id.trim()) || path.parse(file).name;
      const name =
        (typeof parsed?.name === 'string' && parsed.name.trim()) || String(id || 'Unnamed');
      if (typeof id !== 'string' || !id.trim()) return null;
      return {
        id,
        name,
        description: typeof parsed?.description === 'string' ? parsed.description : undefined,
        enabledAgentsCount: Array.isArray(parsed?.agents?.enable)
          ? parsed.agents.enable.length
          : undefined,
        enablesAllAgents: parsed?.agents?.enable === 'all',
      };
    } catch (error) {
      warnings.push(`Invalid team file: ${file} (${String(error)})`);
      return null;
    }
  }

  private _dashboardStatePath(): string {
    return path.join(this.workspaceRoot, '.agent-team', 'dashboard.state.json');
  }

  private _bindingsPath(): string {
    return path.join(this.workspaceRoot, '.agent-team', 'bindings.yml');
  }

  private _readProjectBindings(warnings: string[]): ProjectBindings {
    const bindingsPath = this._bindingsPath();
    const emptyBindings: ProjectBindings = {
      teamId: null,
      agentIds: [],
      skillIds: [],
    };

    if (!fs.existsSync(bindingsPath)) {
      return emptyBindings;
    }

    try {
      const raw = fs.readFileSync(bindingsPath, 'utf-8');
      const parsed = YAML.parse(raw) || {};
      const readStringArray = (value: unknown): string[] =>
        Array.isArray(value)
          ? value.filter((item): item is string => typeof item === 'string')
          : [];

      return {
        teamId: typeof parsed.teamId === 'string' && parsed.teamId.trim() ? parsed.teamId : null,
        agentIds: readStringArray(parsed.agentIds),
        skillIds: readStringArray(parsed.skillIds),
      };
    } catch (error) {
      warnings.push(`Failed to read bindings: ${String(error)}`);
      return emptyBindings;
    }
  }

  private _saveProjectBindings(payload: any): void {
    const bindingsPath = this._bindingsPath();
    const bindingsDir = path.dirname(bindingsPath);
    if (!fs.existsSync(bindingsDir)) {
      fs.mkdirSync(bindingsDir, { recursive: true });
    }

    const normalizeStringArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

    const bindings: ProjectBindings = {
      teamId: typeof payload.teamId === 'string' && payload.teamId.trim() ? payload.teamId : null,
      agentIds: normalizeStringArray(payload.agentIds),
      skillIds: normalizeStringArray(payload.skillIds),
    };

    fs.writeFileSync(bindingsPath, YAML.stringify(bindings), 'utf-8');
  }

  private _setActiveTeam(teamId: string | null): void {
    const statePath = this._dashboardStatePath();
    const stateDir = path.dirname(statePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    fs.writeFileSync(statePath, JSON.stringify({ activeTeamId: teamId }, null, 2), 'utf-8');
  }

  private _readActiveTeamId(teams: TeamSummary[], warnings: string[]): string | null {
    const statePath = this._dashboardStatePath();
    if (!fs.existsSync(statePath)) return null;
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8')) as DashboardState;
      const activeTeamId = typeof state.activeTeamId === 'string' ? state.activeTeamId : null;
      if (activeTeamId && teams.some((team) => team.id === activeTeamId)) {
        return activeTeamId;
      }
      return null;
    } catch (error) {
      warnings.push(`Failed to read dashboard state: ${String(error)}`);
      return null;
    }
  }

  private _loadAgents(warnings: string[]): {
    specCount: number | '—';
    validSpecs: number | '—';
    agents: DashboardAgent[];
  } {
    const specsDir = path.join(this.workspaceRoot, 'specs');
    if (!fs.existsSync(specsDir)) {
      return { specCount: 0, validSpecs: 0, agents: [] };
    }

    try {
      const specs = this._findSpecFiles(specsDir);
      let validSpecs = 0;
      const agents: DashboardAgent[] = [];

      for (const spec of specs) {
        try {
          const content = fs.readFileSync(spec, 'utf-8');
          const parsed = YAML.parse(content);
          validSpecs++;
          const stats = fs.statSync(spec);
          const role = parsed?._metadata?.role;
          const teamId =
            parsed?._composition_metadata?.team_id ||
            parsed?._metadata?.team_id ||
            parsed?.team_id ||
            null;

          agents.push({
            id: parsed?._metadata?.id || path.basename(spec, path.extname(spec)),
            name: parsed?.name || 'Unknown',
            role: role === 'router' || role === 'orchestrator' ? role : 'worker',
            teamId: typeof teamId === 'string' ? teamId : null,
            scope: teamId ? 'team' : 'global',
            lastModified: this._formatRelativeTime(stats.mtime),
          });
        } catch (error) {
          warnings.push(`Invalid spec file: ${path.basename(spec)} (${String(error)})`);
        }
      }

      return { specCount: specs.length, validSpecs, agents };
    } catch (error) {
      warnings.push(`Failed to load specs: ${String(error)}`);
      return { specCount: '—', validSpecs: '—', agents: [] };
    }
  }

  private _getSyncStatus(): { syncStatus: DashboardStats['syncStatus']; syncTime: string } {
    if (this._lastSyncError) {
      return { syncStatus: 'ERROR', syncTime: 'Failed' };
    }

    const githubDir = path.join(this.workspaceRoot, '.github', 'agents');
    if (!fs.existsSync(githubDir)) {
      return { syncStatus: 'NOT_SYNCED', syncTime: 'Never' };
    }

    try {
      const githubAgents = fs.readdirSync(githubDir).filter((f) => f.endsWith('.agent.md'));
      if (githubAgents.length === 0) {
        return { syncStatus: 'NOT_SYNCED', syncTime: 'Never' };
      }

      let latestTime = 0;
      for (const file of githubAgents) {
        const stats = fs.statSync(path.join(githubDir, file));
        if (stats.mtime.getTime() > latestTime) {
          latestTime = stats.mtime.getTime();
        }
      }
      return { syncStatus: 'SUCCESS', syncTime: this._formatRelativeTime(new Date(latestTime)) };
    } catch (_error) {
      return { syncStatus: 'WARNING', syncTime: 'Unknown' };
    }
  }

  private _catalogSummaryFromMap(map: Record<string, unknown>): CatalogEntitySummary[] {
    const entities = Object.entries(map).map(([id, entry]) => {
      const data =
        entry && typeof entry === 'object' && 'data' in (entry as Record<string, unknown>)
          ? ((entry as Record<string, unknown>).data as Record<string, unknown> | undefined)
          : undefined;
      const name =
        data && typeof data.name === 'string' && data.name.trim()
          ? data.name
          : data && typeof data.title === 'string' && data.title.trim()
            ? data.title
            : id;
      return { id, name };
    });
    return entities.sort((a, b) => a.name.localeCompare(b.name));
  }

  private _readWorkspaceAgentSummaries(): CatalogEntitySummary[] {
    const specsDir = path.join(this.workspaceRoot, 'specs');
    const specFiles = this._findSpecFiles(specsDir);
    const summaries: CatalogEntitySummary[] = [];

    for (const specFile of specFiles) {
      try {
        const raw = fs.readFileSync(specFile, 'utf-8');
        const parsed = YAML.parse(raw);
        const id =
          typeof parsed?._metadata?.id === 'string' && parsed._metadata.id.trim()
            ? parsed._metadata.id
            : path.basename(specFile, path.extname(specFile));
        const name = typeof parsed?.name === 'string' && parsed.name.trim() ? parsed.name : id;
        summaries.push({ id, name });
      } catch (_error) {
        // Ignore malformed specs.
      }
    }

    return summaries;
  }

  private _mergeCatalogEntities(
    primary: CatalogEntitySummary[],
    secondary: CatalogEntitySummary[],
  ): CatalogEntitySummary[] {
    const merged = new Map<string, CatalogEntitySummary>();
    for (const entry of [...primary, ...secondary]) {
      if (!merged.has(entry.id)) {
        merged.set(entry.id, entry);
      }
    }
    return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  private _loadGlobalCatalogSummary(): GlobalCatalogSummary {
    const catalog: CatalogData = this.catalogManager.getCatalogSnapshot();
    const catalogTeams = this._catalogSummaryFromMap(catalog.teams);
    const catalogAgents = this._catalogSummaryFromMap(catalog.agents);

    const workspaceTeamEntries = this._loadTeams([]).map((team) => ({
      id: team.id,
      name: team.name,
    }));
    const workspaceAgentEntries = this._readWorkspaceAgentSummaries();

    return {
      teams: this._mergeCatalogEntities(catalogTeams, workspaceTeamEntries),
      agents: this._mergeCatalogEntities(catalogAgents, workspaceAgentEntries),
      skills: this._catalogSummaryFromMap(catalog.skills),
    };
  }

  private _getGatingReasons(
    hasProfile: boolean,
    teamsCount: number,
    activeTeamId: string | null,
  ): DashboardStats['gatingReasons'] {
    if (!hasProfile) {
      return {
        manageTeams: 'Requiere Profile Config',
        createAgent: 'Requiere Profile Config',
        browseSkills: 'Requiere Profile Config',
        syncAgents: 'Requiere Profile Config',
      };
    }

    if (teamsCount === 0) {
      return {
        createAgent: 'Requiere team activo',
        browseSkills: 'Requiere team activo',
      };
    }

    if (!activeTeamId) {
      return {
        createAgent: 'Selecciona un equipo para continuar',
        browseSkills: 'Selecciona un equipo para continuar',
      };
    }

    return {};
  }

  private _getStats(): DashboardStats {
    const warnings: string[] = [];

    const profile = this._readProfileStatus(warnings);
    const teams = this._loadTeams(warnings);
    const activeTeamId = profile.hasProfile ? this._readActiveTeamId(teams, warnings) : null;
    const bindings = this._readProjectBindings(warnings);
    const globalCatalog = this._loadGlobalCatalogSummary();
    const agentsData = this._loadAgents(warnings);
    const syncData = this._getSyncStatus();

    const visibleAgents = activeTeamId
      ? agentsData.agents.filter((agent) => !agent.teamId || agent.teamId === activeTeamId)
      : agentsData.agents;

    return {
      hasProfile: profile.hasProfile,
      profileStatus: profile.profileStatus,
      profileError: profile.profileError,
      totalAgents: typeof agentsData.specCount === 'number' ? visibleAgents.length : '—',
      specCount: agentsData.specCount,
      validSpecs: agentsData.validSpecs,
      teamsCount: teams.length,
      teams,
      activeTeamId,
      teamContext:
        teams.length === 0 ? 'no_teams' : activeTeamId ? 'active_team' : 'no_active_team',
      syncStatus: syncData.syncStatus,
      syncTime: syncData.syncTime,
      syncError: this._lastSyncError || undefined,
      warnings,
      gatingReasons: this._getGatingReasons(profile.hasProfile, teams.length, activeTeamId),
      agents: activeTeamId ? visibleAgents : [],
      globalCatalog,
      bindings,
    };
  }

  private _pushStats(preloaded?: DashboardStats, force = false): void {
    const stats = preloaded || this._getStats();
    const snapshot = JSON.stringify(stats);
    if (!force && snapshot === this._lastStatsSnapshot) {
      return;
    }
    this._lastStatsSnapshot = snapshot;
    this._panel.webview.postMessage({
      type: 'updateStats',
      stats,
    });
  }

  private _update(): void {
    const stats = this._getStats();
    if (!this._htmlInitialized) {
      this._lastStatsSnapshot = JSON.stringify(stats);
      this._panel.webview.html = this._getHtmlContent(stats);
      this._htmlInitialized = true;
      return;
    }
    this._pushStats(stats, true);
  }

  private _getHtmlContent(stats: DashboardStats): string {
    const webview = this._panel.webview;
    const distPath = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webviews');
    const nonce = this._getNonce();

    try {
      const htmlPath = path.join(
        path.dirname(this.extensionUri.fsPath),
        'dist',
        'webviews',
        'dashboard.html',
      );
      let html = fs.readFileSync(htmlPath, 'utf-8');

      html = html.replace(/src="\/([^"]+)"/g, (_match, filename) => {
        const uri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, filename));
        return `src="${uri}"`;
      });

      html = html.replace(/href="\/([^"]+)"/g, (_match, filename) => {
        const uri = webview.asWebviewUri(vscode.Uri.joinPath(distPath, filename));
        return `href="${uri}"`;
      });

      html = html.replace(/<script/g, `<script nonce="${nonce}"`);

      const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">`;
      if (html.includes('<meta charset="UTF-8">')) {
        html = html.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n  ${cspMeta}`);
      } else {
        html = html.replace('<head>', `<head>\n  ${cspMeta}`);
      }

      const initialStateScript = `<script nonce="${nonce}">
        window.__INITIAL_STATE__ = ${JSON.stringify(stats)};
      </script>`;
      html = html.replace('</head>', `${initialStateScript}</head>`);

      return html;
    } catch (error) {
      this.logger.error(`Failed to load dashboard HTML: ${error}`);

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
    if (this._refreshTimer) {
      clearTimeout(this._refreshTimer);
    }
    if (this._webviewAssetsPoller) {
      clearInterval(this._webviewAssetsPoller);
    }
    if (this._workspaceStatePoller) {
      clearInterval(this._workspaceStatePoller);
    }
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
