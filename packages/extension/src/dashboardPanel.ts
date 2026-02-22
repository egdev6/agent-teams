import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { type CatalogData, CatalogManager } from './catalogManager';
import type { Logger } from './logger';
import { ProfileLoader } from './profileLoader';
import type { ProjectProfile } from './types';

type AgentRole = 'worker' | 'router' | 'orchestrator';

interface TeamSummary {
  id: string;
  name: string;
  description?: string;
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
  kitIds: string[];
}

interface GlobalCatalogSummary {
  teams: CatalogEntitySummary[];
  agents: CatalogEntitySummary[];
  skills: CatalogEntitySummary[];
  kits: CatalogEntitySummary[];
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
    browseKits?: string;
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
        await vscode.commands.executeCommand('agent-teams.createAgent');
        this._pushStats();
        break;
      case 'syncAgents':
        await this._syncAgents();
        break;
      case 'createTeam':
        await this._createTeam();
        break;
      case 'setActiveTeam':
        this._setActiveTeam(typeof message.teamId === 'string' ? message.teamId : null);
        this._pushStats();
        break;
      case 'saveGlobalBindings':
        this._saveProjectBindings(message);
        this._pushStats();
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

  private async _createTeam(): Promise<void> {
    const current = this._getStats();
    if (current.gatingReasons.manageTeams) {
      vscode.window.showWarningMessage(current.gatingReasons.manageTeams);
      return;
    }
    await vscode.commands.executeCommand('agent-teams.createTeam');
    this._pushStats();
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

  private async _saveProfile(profileData: any): Promise<void> {
    try {
      this.logger.info('Saving project profile...');

      const profileDir = path.join(this.workspaceRoot, '.agent-team');
      const profilePath = path.join(profileDir, 'project.profile.yml');

      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }

      const name =
        typeof profileData?.name === 'string' && profileData.name.trim()
          ? profileData.name.trim()
          : 'Project';
      const id =
        typeof profileData?.id === 'string' && profileData.id.trim()
          ? profileData.id.trim()
          : this._slugify(name);

      const profile: ProjectProfile = {
        project: {
          id,
          name,
          version:
            typeof profileData?.version === 'string' && profileData.version.trim()
              ? profileData.version.trim()
              : '1.0.0',
          type:
            typeof profileData?.type === 'string' && profileData.type.trim()
              ? profileData.type.trim()
              : 'fullstack',
        },
        technologies: this._toTechnologyMap(profileData?.technologies),
        paths:
          profileData?.paths && typeof profileData.paths === 'object'
            ? profileData.paths
            : { root: '.', src: './src', tests_root: './tests' },
        commands:
          profileData?.commands && typeof profileData.commands === 'object'
            ? profileData.commands
            : { build: 'pnpm build', test: 'pnpm test', dev: 'pnpm dev' },
        context_packs: ['architecture'],
        overrides: {},
      };

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
          const filePath = path.join(teamsDir, file);
          try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = YAML.parse(raw);
            const id =
              (typeof parsed?.id === 'string' && parsed.id.trim()) || path.parse(file).name;
            const name =
              (typeof parsed?.name === 'string' && parsed.name.trim()) || String(id || 'Unnamed');
            if (typeof id === 'string' && id.trim()) {
              teamsById.set(id, {
                id,
                name,
                description:
                  typeof parsed?.description === 'string' ? parsed.description : undefined,
              });
            }
          } catch (error) {
            warnings.push(`Invalid team file: ${file} (${String(error)})`);
          }
        }
      } catch (error) {
        warnings.push(`Failed to read teams directory: ${String(error)}`);
      }
    }

    return [...teamsById.values()].sort((a, b) => a.name.localeCompare(b.name));
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
      kitIds: [],
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
        kitIds: readStringArray(parsed.kitIds),
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
      kitIds: normalizeStringArray(payload.kitIds),
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

  private _loadGlobalCatalogSummary(): GlobalCatalogSummary {
    const catalog: CatalogData = this.catalogManager.getCatalogSnapshot();
    return {
      teams: this._catalogSummaryFromMap(catalog.teams),
      agents: this._catalogSummaryFromMap(catalog.agents),
      skills: this._catalogSummaryFromMap(catalog.skills),
      kits: this._catalogSummaryFromMap(catalog.kits),
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
        browseKits: 'Requiere Profile Config',
        browseSkills: 'Requiere Profile Config',
        syncAgents: 'Requiere Profile Config',
      };
    }

    if (teamsCount === 0) {
      return {
        createAgent: 'Requiere team activo',
        browseKits: 'Requiere team activo',
        browseSkills: 'Requiere team activo',
      };
    }

    if (!activeTeamId) {
      return {
        createAgent: 'Selecciona un equipo para continuar',
        browseKits: 'Selecciona un equipo para continuar',
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
