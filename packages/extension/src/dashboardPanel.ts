import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { AgentGenerator } from './agentGenerator';
import { type CatalogData, CatalogManager } from './catalogManager';
import type { Logger } from './logger';
import { ProfileLoader } from './profileLoader';
import { TeamManager } from './teamManager';
import type { ProjectProfile } from './types';

const execFileAsync = promisify(execFile);

type AgentRole = 'worker' | 'router' | 'orchestrator';
type OutputMode = 'short+diff' | 'diff' | 'plan' | 'structured';
type DelegationStrategy = 'disabled' | 'router_split' | 'agent_handoff';

interface AgentWizardPayload {
  name: string;
  role?: string;
  description?: string;
  domain?: string;
  subdomains?: string[];
  intents?: string[];
  pathGlobs?: string[];
  keywords?: string[];
  skills?: string[];
  output?: {
    modeDefault?: OutputMode;
  };
  context?: {
    maxFiles?: number;
    maxCharsPerFile?: number;
  };
  delegation?: {
    strategy?: DelegationStrategy;
    maxHandoffs?: number;
    allowedSubagents?: string[] | 'all';
  };
}

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
  role?: AgentRole;
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

interface BrowserSkill {
  id: string;
  name: string;
  description: string;
  category?: string;
  tags: string[];
  version?: string;
  source: 'workspace' | 'import' | 'community';
  installed: boolean;
}

interface DashboardStats {
  hasProfile: boolean;
  profileStatus: 'Active' | 'Not configured' | 'Error';
  profileError?: string;
  totalAgents: number;
  specCount: number;
  validSpecs: number;
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

  private _agentTeamsDir(): string {
    return path.join(this.workspaceRoot, '.agent-teams');
  }

  private _legacyAgentTeamDir(): string {
    return path.join(this.workspaceRoot, '.agent-team');
  }

  private _preferredAgentTeamsPath(...segments: string[]): string {
    return path.join(this._agentTeamsDir(), ...segments);
  }

  private _resolveReadableAgentTeamsPath(...segments: string[]): string {
    const preferred = this._preferredAgentTeamsPath(...segments);
    if (fs.existsSync(preferred)) {
      return preferred;
    }
    return path.join(this._legacyAgentTeamDir(), ...segments);
  }

  private _getWorkspaceStateSignature(): string {
    const profilePath = this._resolveReadableAgentTeamsPath('project.profile.yml');
    const bindingsPath = this._resolveReadableAgentTeamsPath('bindings.yml');
    const teamsDirA = this._preferredAgentTeamsPath('teams');
    const teamsDirB = path.join(this._legacyAgentTeamDir(), 'teams');
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
      case 'requestTeamData':
        await this._sendTeamData(message.teamId);
        break;
      case 'requestSkillsCatalog':
        await this._sendSkillsCatalog();
        break;
      case 'toggleSkill':
        await this._toggleProjectSkill(message.skillId);
        break;
      case 'searchCommunitySkills':
        await this._searchCommunitySkills(message.query);
        break;
      case 'importCommunitySkillSource':
        await this._importCommunitySkillSource(message.source);
        break;
      case 'saveTeam':
        await this._saveTeamFromPayload(message);
        break;
      case 'deleteTeam':
        await this._deleteTeam(message.teamId);
        break;
      case 'browseTeams':
      case 'manageTeams':
        // Legacy message types from pre-router webviews; keep as no-op refresh for compatibility.
        this._pushStats(undefined, true);
        break;
      case 'setActiveTeam':
        await this._setActiveTeamSelection(
          typeof message.teamId === 'string' ? message.teamId : null,
        );
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

    const teamId = current.activeTeamId || current.bindings.teamId;
    if (!teamId) {
      const message = 'Select an active team before syncing.';
      this._lastSyncError = message;
      vscode.window.showWarningMessage(message);
      this._panel.webview.postMessage({
        type: 'syncResult',
        success: false,
        error: message,
      });
      return;
    }

    try {
      const teamManager = new TeamManager();
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Syncing team: ${teamId}`,
          cancellable: false,
        },
        async () => {
          const result = await teamManager.syncTeam(this.workspaceRoot, teamId, {
            dryRun: false,
            showDiff: false,
          });
          vscode.window.showInformationMessage(
            `✅ Sync complete (${result.targets.join(', ')}): ${result.summary.created} created, ${result.summary.updated} updated.`,
          );
        },
      );
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
        const existingTeamIds = new Set(current.globalCatalog.teams.map((team) => team.id));
        if (existingTeamIds.has(payload.teamId)) {
          throw new Error(`Team "${payload.teamId}" already exists.`);
        }
        const hasProjectTeamAssigned = Boolean(current.activeTeamId || current.bindings.teamId);
        if (hasProjectTeamAssigned) {
          const teamData = this._buildTeamDocument({
            teamId: payload.teamId,
            name: payload.name,
            description: payload.description,
            agents: payload.agents,
            tags: payload.tags,
          });
          this.catalogManager.upsertTeam(payload.teamId, teamData, 'import');
        } else {
          await vscode.commands.executeCommand('agent-teams.createTeam', payload);
        }
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

    const agentIdsRaw = Array.isArray(team.agentIds) ? team.agentIds : undefined;
    const enabledRaw = Array.isArray(team.agents)
      ? team.agents
      : team.agents && typeof team.agents === 'object'
        ? (team.agents as Record<string, unknown>).enable
        : agentIdsRaw;
    const agents =
      enabledRaw === 'all'
        ? this._allKnownAgentIds()
        : Array.isArray(enabledRaw)
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

  private _allKnownAgentIds(): string[] {
    const catalogAgents = this._loadGlobalCatalogSummary().agents.map((agent) => agent.id);
    const workspaceAgents = this._readWorkspaceAgentSummaries().map((agent) => agent.id);
    return Array.from(new Set([...catalogAgents, ...workspaceAgents])).sort((a, b) =>
      a.localeCompare(b),
    );
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

  private _resolveNormalizedTeamTemplate(teamId: string): {
    id: string;
    name: string;
    description?: string;
    agents?: string[];
    tags?: string[];
  } | null {
    const fromWorkspace = this._loadTeamTemplateFromWorkspace(teamId);
    const fromCatalog = this.catalogManager.getCatalogSnapshot().teams?.[teamId]?.data;
    const workspaceTeam = this._normalizeTeamTemplate(fromWorkspace);
    const catalogTeam = this._normalizeTeamTemplate(fromCatalog);

    if (!workspaceTeam) {
      return catalogTeam;
    }
    if (!catalogTeam) {
      return workspaceTeam;
    }

    return {
      id: workspaceTeam.id,
      name: workspaceTeam.name || catalogTeam.name,
      description: workspaceTeam.description ?? catalogTeam.description,
      agents:
        workspaceTeam.agents && workspaceTeam.agents.length > 0
          ? workspaceTeam.agents
          : catalogTeam.agents,
      tags:
        workspaceTeam.tags && workspaceTeam.tags.length > 0 ? workspaceTeam.tags : catalogTeam.tags,
    };
  }

  private _resolveTeamFilePath(teamId: string): string | null {
    for (const teamsDir of this._teamDirectories()) {
      const ymlPath = path.join(teamsDir, `${teamId}.yml`);
      const yamlPath = path.join(teamsDir, `${teamId}.yaml`);
      if (fs.existsSync(ymlPath)) return ymlPath;
      if (fs.existsSync(yamlPath)) return yamlPath;
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
      const normalized = this._resolveNormalizedTeamTemplate(teamId);

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

  private async _sendTeamData(rawTeamId: unknown): Promise<void> {
    const teamId = typeof rawTeamId === 'string' ? rawTeamId.trim() : '';
    if (!teamId) {
      this._panel.webview.postMessage({
        type: 'teamData',
        teamId: '',
        error: 'Team ID is required.',
      });
      return;
    }

    try {
      const normalized = this._resolveNormalizedTeamTemplate(teamId);

      if (!normalized) {
        this._panel.webview.postMessage({
          type: 'teamData',
          teamId,
          error: `Team "${teamId}" not found.`,
        });
        return;
      }

      this._panel.webview.postMessage({
        type: 'teamData',
        teamId: normalized.id,
        name: normalized.name,
        description: normalized.description,
        agents: normalized.agents ?? [],
        tags: normalized.tags ?? [],
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'teamData',
        teamId,
        error: `Failed to load team: ${String(error)}`,
      });
    }
  }

  private _getSelectedProjectTeamId(): string | null {
    const warnings: string[] = [];
    const teams = this._loadTeams(warnings);
    return this._readActiveTeamId(teams, warnings);
  }

  private _buildTeamDocument(input: {
    teamId: string;
    name: string;
    description?: string;
    agents?: string[];
    tags?: string[];
  }): Record<string, unknown> {
    return {
      id: input.teamId,
      name: input.name,
      description: input.description || '',
      tags: input.tags || [],
      agents: {
        enable: input.agents || [],
      },
    };
  }

  private _writeTeamToWorkspace(teamData: Record<string, unknown>): void {
    const teamId = typeof teamData.id === 'string' ? teamData.id : '';
    if (!teamId) {
      return;
    }
    const targetPath = this._preferredAgentTeamsPath('teams', `${teamId}.yml`);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, YAML.stringify(teamData), 'utf-8');
  }

  private _pruneTeamFilesExcept(teamIdToKeep: string | null): void {
    const keep = teamIdToKeep ? teamIdToKeep.trim() : '';
    for (const teamsDir of this._teamDirectories()) {
      if (!fs.existsSync(teamsDir)) {
        continue;
      }
      for (const file of fs.readdirSync(teamsDir)) {
        const fullPath = path.join(teamsDir, file);
        if (!fs.statSync(fullPath).isFile()) {
          continue;
        }
        const ext = path.extname(file).toLowerCase();
        if (ext !== '.yml' && ext !== '.yaml') {
          continue;
        }
        const teamId = path.parse(file).name;
        if (keep && teamId === keep) {
          continue;
        }
        fs.unlinkSync(fullPath);
      }
    }
  }

  private async _saveTeamFromPayload(message: {
    teamId: unknown;
    name: unknown;
    description?: unknown;
    agents?: unknown;
    tags?: unknown;
  }): Promise<void> {
    const teamId = typeof message.teamId === 'string' ? message.teamId.trim() : '';
    const name = typeof message.name === 'string' ? message.name.trim() : '';
    const description =
      typeof message.description === 'string' ? message.description.trim() : undefined;
    const agents = Array.isArray(message.agents)
      ? Array.from(
          new Set(
            message.agents
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter((item) => Boolean(item)),
          ),
        )
      : [];
    const tags = Array.isArray(message.tags)
      ? Array.from(
          new Set(
            message.tags
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter((item) => Boolean(item)),
          ),
        )
      : [];

    if (!teamId || !name) {
      this._panel.webview.postMessage({
        type: 'saveTeamResult',
        success: false,
        error: 'Team ID and name are required.',
      });
      return;
    }

    try {
      const selectedTeamId = this._getSelectedProjectTeamId();
      const updated = this._buildTeamDocument({
        teamId,
        name,
        description,
        agents,
        tags,
      });

      const existingPath = this._resolveTeamFilePath(teamId);
      const targetPath = this._preferredAgentTeamsPath('teams', `${teamId}.yml`);
      if (
        existingPath &&
        fs.existsSync(existingPath) &&
        path.normalize(existingPath) !== path.normalize(targetPath)
      ) {
        fs.unlinkSync(existingPath);
      }
      this._writeTeamToWorkspace(updated);

      if (selectedTeamId && selectedTeamId === teamId) {
        this._pruneTeamFilesExcept(teamId);
        const bindings = this._readProjectBindings([]);
        this._writeProjectBindings({
          ...bindings,
          teamId,
          agentIds: agents,
        });
        this._syncActiveTeamAgentSpecs(agents);
      }
      this.catalogManager.upsertTeam(teamId, updated, 'import');

      await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot, { notify: false });
      this._pushStats(undefined, true);
      this._panel.webview.postMessage({
        type: 'saveTeamResult',
        success: true,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'saveTeamResult',
        success: false,
        error: `Failed to save team: ${String(error)}`,
      });
    }
  }

  private async _deleteTeam(rawTeamId: unknown): Promise<void> {
    const teamId = typeof rawTeamId === 'string' ? rawTeamId.trim() : '';
    if (!teamId) {
      this._panel.webview.postMessage({
        type: 'deleteTeamResult',
        success: false,
        error: 'Team ID is required.',
      });
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `Delete team "${teamId}"?`,
      'Delete',
      'Cancel',
    );
    if (confirm !== 'Delete') {
      this._panel.webview.postMessage({
        type: 'deleteTeamResult',
        success: false,
        error: 'Team deletion cancelled.',
      });
      return;
    }

    try {
      const teamPath = this._resolveTeamFilePath(teamId);
      if (!teamPath || !fs.existsSync(teamPath)) {
        this._panel.webview.postMessage({
          type: 'deleteTeamResult',
          success: false,
          error: `Team "${teamId}" not found.`,
        });
        return;
      }

      fs.unlinkSync(teamPath);
      this._clearDeletedTeamReferences(teamId);
      this.catalogManager.removeTeam(teamId);
      this._pruneTeamFilesExcept(this._getSelectedProjectTeamId());
      await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot);
      this._pushStats(undefined, true);
      vscode.window.showInformationMessage(`Deleted team "${teamId}".`);
      this._panel.webview.postMessage({
        type: 'deleteTeamResult',
        success: true,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'deleteTeamResult',
        success: false,
        error: `Failed to delete team: ${String(error)}`,
      });
    }
  }

  private _clearDeletedTeamReferences(teamId: string): void {
    const bindings = this._readProjectBindings([]);
    if (bindings.teamId === teamId) {
      this._writeProjectBindings({
        ...bindings,
        teamId: null,
        agentIds: [],
      });
      this._syncActiveTeamAgentSpecs([]);
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
    return this._preferredAgentTeamsPath('context-packs');
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
    const packs = new Set<string>();
    const packsDirs = [
      this._contextPacksDirPath(),
      path.join(this._legacyAgentTeamDir(), 'context-packs'),
    ];
    for (const packsDir of packsDirs) {
      if (!fs.existsSync(packsDir)) continue;
      try {
        const names = fs
          .readdirSync(packsDir)
          .filter((file) => file.endsWith('.md'))
          .map((file) => file.replace(/\.md$/i, ''))
          .filter((name) => Boolean(name));
        for (const name of names) {
          packs.add(name);
        }
      } catch (_error) {
        // Ignore invalid entries and keep reading remaining directories.
      }
    }
    return [...packs].sort((a, b) => a.localeCompare(b));
  }

  private _readExistingProfileYaml(): ProjectProfile | null {
    const profilePath = this._resolveReadableAgentTeamsPath('project.profile.yml');
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

      const profileDir = this._agentTeamsDir();
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

      const profileDir = this._agentTeamsDir();
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
      this._panel.webview.postMessage(this._toAgentDataMessage(agentId, spec));
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'agentData',
        agentId,
        error: String(error),
      });
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mapping persisted spec shape to webview payload
  private _toAgentDataMessage(agentId: string, spec: Record<string, any>): Record<string, unknown> {
    const metadata = spec._metadata || {};
    const delegation = metadata.delegation || {};
    const allowedSubagents = delegation.allowed_subagents;

    return {
      type: 'agentData',
      agentId,
      name: spec.name || agentId,
      role: metadata.role || '',
      description: spec.description || '',
      domain: metadata.domain || '',
      subdomains: Array.isArray(metadata.subdomains) ? metadata.subdomains : [],
      intents: Array.isArray(metadata.intents) ? metadata.intents : [],
      pathGlobs: Array.isArray(metadata.path_globs) ? metadata.path_globs : [],
      keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
      skills: (metadata.skills?.allowed as string[]) || [],
      output: {
        modeDefault: metadata.output?.mode_default || 'short+diff',
      },
      context: {
        maxFiles: metadata.context?.max_files ?? 8,
        maxCharsPerFile: metadata.context?.max_chars_per_file ?? 8000,
      },
      delegation: {
        strategy: delegation.strategy || 'disabled',
        maxHandoffs: delegation.max_handoffs ?? 1,
        allowedSubagents:
          allowedSubagents === 'all'
            ? 'all'
            : Array.isArray(allowedSubagents)
              ? allowedSubagents
              : [],
      },
    };
  }

  private _toUniqueStringArray(value?: string[]): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item): item is string => item.length > 0);
    return Array.from(new Set(normalized));
  }

  private _clamp(value: number | undefined, min: number, max: number, fallback: number): number {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return Math.min(Math.max(value as number, min), max);
  }

  private _resolveRole(role?: string): AgentRole {
    return role === 'router' || role === 'orchestrator' ? role : 'worker';
  }

  private _buildAgentMetadataFromPayload(
    agentId: string,
    payload: AgentWizardPayload,
    existingMeta?: Record<string, unknown>,
  ): Record<string, unknown> {
    const role = this._resolveRole(payload.role);
    const base = this._buildBaseMetadata(agentId, role, payload, existingMeta);

    if (role === 'router') {
      return this._buildRouterMetadata(base);
    }

    if (role === 'orchestrator') {
      return this._buildOrchestratorMetadata(base, payload);
    }

    return this._buildWorkerMetadata(base, payload);
  }

  private _buildBaseMetadata(
    agentId: string,
    role: AgentRole,
    payload: AgentWizardPayload,
    existingMeta?: Record<string, unknown>,
  ): Record<string, unknown> {
    const base: Record<string, unknown> = {
      ...(existingMeta || {}),
      id: agentId,
      role,
      domain:
        role === 'router'
          ? 'global'
          : payload.domain?.trim() || (role === 'worker' ? 'general' : 'global'),
      intents: this._toUniqueStringArray(payload.intents),
      context: {
        max_files: role === 'worker' ? this._clamp(payload.context?.maxFiles, 1, 64, 8) : 8,
        max_chars_per_file:
          role === 'worker'
            ? this._clamp(payload.context?.maxCharsPerFile, 500, 40000, 8000)
            : 8000,
      },
      output: {
        mode_default:
          role === 'worker' ? payload.output?.modeDefault || 'short+diff' : 'short+diff',
      },
    };

    const subdomains = this._toUniqueStringArray(payload.subdomains);
    const pathGlobs = this._toUniqueStringArray(payload.pathGlobs);
    const keywords = this._toUniqueStringArray(payload.keywords);

    if (subdomains.length > 0) {
      base.subdomains = subdomains;
    } else {
      delete base.subdomains;
    }
    if (pathGlobs.length > 0) {
      base.path_globs = pathGlobs;
    } else {
      delete base.path_globs;
    }
    if (keywords.length > 0) {
      base.keywords = keywords;
    } else {
      delete base.keywords;
    }
    return base;
  }

  private _buildRouterMetadata(base: Record<string, unknown>): Record<string, unknown> {
    return {
      ...base,
      skills: { allowed: ['search_codebase'] },
      delegation: {
        strategy: 'router_split',
        max_handoffs: 1,
        allowed_subagents: 'all',
      },
    };
  }

  private _resolveAllowedSubagents(payload: AgentWizardPayload): string[] | 'all' {
    const rawAllowed = payload.delegation?.allowedSubagents;
    const allowedFromArray = this._toUniqueStringArray(Array.isArray(rawAllowed) ? rawAllowed : []);
    return rawAllowed === 'all' || (allowedFromArray.length === 1 && allowedFromArray[0] === 'all')
      ? 'all'
      : allowedFromArray;
  }

  private _buildOrchestratorMetadata(
    base: Record<string, unknown>,
    payload: AgentWizardPayload,
  ): Record<string, unknown> {
    const allowedSubagents = this._resolveAllowedSubagents(payload);
    return {
      ...base,
      skills: { allowed: [] },
      delegation: {
        strategy: 'router_split',
        max_handoffs: this._clamp(payload.delegation?.maxHandoffs, 1, 3, 2),
        ...(allowedSubagents === 'all' || allowedSubagents.length > 0
          ? { allowed_subagents: allowedSubagents }
          : {}),
      },
    };
  }

  private _buildWorkerMetadata(
    base: Record<string, unknown>,
    payload: AgentWizardPayload,
  ): Record<string, unknown> {
    const workerSkills = this._toUniqueStringArray(payload.skills);
    const next: Record<string, unknown> = {
      ...base,
      skills: { allowed: workerSkills },
    };
    if (payload.delegation?.strategy && payload.delegation.strategy !== 'disabled') {
      const allowedSubagents = this._resolveAllowedSubagents(payload);
      next.delegation = {
        strategy: payload.delegation.strategy === 'router_split' ? 'router_split' : 'agent_handoff',
        max_handoffs: this._clamp(payload.delegation.maxHandoffs, 1, 2, 1),
        ...(allowedSubagents === 'all' || allowedSubagents.length > 0
          ? { allowed_subagents: allowedSubagents }
          : {}),
      };
    } else {
      delete next.delegation;
    }
    return next;
  }

  private async _createAgentFromPayload(message: AgentWizardPayload): Promise<void> {
    const gating = this._getStats().gatingReasons.createAgent;
    if (gating) {
      this._panel.webview.postMessage({ type: 'createAgentResult', success: false, error: gating });
      return;
    }
    const { name, description } = message;
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
        _metadata: this._buildAgentMetadataFromPayload(agentId, message),
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

  private async _saveAgentFromPayload(
    message: AgentWizardPayload & {
      agentId: string;
    },
  ): Promise<void> {
    const { agentId, name, description } = message;
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
        _metadata: this._buildAgentMetadataFromPayload(agentId, message, existingMeta),
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

  private _syncActiveTeamAgentSpecs(agentIds: string[]): void {
    const targetDir = this._preferredAgentTeamsPath('agents');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const selected = new Set(
      agentIds
        .filter((agentId) => typeof agentId === 'string')
        .map((agentId) => agentId.trim())
        .filter((agentId) => Boolean(agentId)),
    );

    for (const agentId of selected) {
      const specPath = this._findSpecByAgentId(agentId);
      if (specPath && fs.existsSync(specPath)) {
        const targetPath = path.join(targetDir, `${agentId}.yml`);
        fs.writeFileSync(targetPath, fs.readFileSync(specPath, 'utf-8'), 'utf-8');
        continue;
      }

      const fromCatalog = this.catalogManager.getCatalogSnapshot().agents?.[agentId]?.data;
      if (fromCatalog && typeof fromCatalog === 'object') {
        const targetPath = path.join(targetDir, `${agentId}.yml`);
        fs.writeFileSync(targetPath, YAML.stringify(fromCatalog), 'utf-8');
      }
    }

    for (const fileName of fs.readdirSync(targetDir)) {
      const fullPath = path.join(targetDir, fileName);
      if (!fs.statSync(fullPath).isFile()) {
        continue;
      }
      const ext = path.extname(fileName).toLowerCase();
      if (ext !== '.yml' && ext !== '.yaml') {
        continue;
      }
      const currentId = path.basename(fileName, ext);
      if (!selected.has(currentId)) {
        fs.unlinkSync(fullPath);
      }
    }
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
    const profilePath = this._resolveReadableAgentTeamsPath('project.profile.yml');
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
    return [this._preferredAgentTeamsPath('teams'), path.join(this._legacyAgentTeamDir(), 'teams')];
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

  private _bindingsPath(): string {
    return this._preferredAgentTeamsPath('bindings.yml');
  }

  private _readProjectBindings(warnings: string[]): ProjectBindings {
    const bindingsPath = this._resolveReadableAgentTeamsPath('bindings.yml');
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

  private _writeProjectBindings(bindings: ProjectBindings): void {
    const bindingsPath = this._bindingsPath();
    const bindingsDir = path.dirname(bindingsPath);
    if (!fs.existsSync(bindingsDir)) {
      fs.mkdirSync(bindingsDir, { recursive: true });
    }

    const payload = {
      teamId: bindings.teamId,
      agentIds: bindings.agentIds,
      skillIds: bindings.skillIds,
    };
    fs.writeFileSync(bindingsPath, YAML.stringify(payload), 'utf-8');
  }

  private _toBrowserSkill(
    id: string,
    entry: CatalogData['skills'][string],
    installedIds: Set<string>,
  ): BrowserSkill {
    const data =
      entry && typeof entry.data === 'object' ? (entry.data as Record<string, unknown>) : {};
    const tags = Array.isArray(data.tags)
      ? data.tags.filter((item): item is string => typeof item === 'string')
      : [];
    const category = typeof data.category === 'string' ? data.category : undefined;
    const name =
      typeof data.name === 'string' && data.name.trim()
        ? data.name
        : typeof data.title === 'string' && data.title.trim()
          ? data.title
          : id;
    const description =
      typeof data.description === 'string' && data.description.trim()
        ? data.description
        : `Skill from ${entry.source} catalog`;
    const version = typeof data.version === 'string' ? data.version : undefined;

    return {
      id,
      name,
      description,
      category,
      tags,
      version,
      source: entry.source,
      installed: installedIds.has(id),
    };
  }

  private async _sendSkillsCatalog(): Promise<void> {
    try {
      await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot, { notify: false });
      const catalog = this.catalogManager.getCatalogSnapshot();
      const bindings = this._readProjectBindings([]);
      const installedIds = new Set(bindings.skillIds);
      const skills = Object.entries(catalog.skills)
        .map(([id, entry]) => this._toBrowserSkill(id, entry, installedIds))
        .sort((a, b) => a.name.localeCompare(b.name));

      this._panel.webview.postMessage({
        type: 'skillsCatalog',
        skills,
        selectedSkillIds: bindings.skillIds,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'skillsCatalogError',
        error: `Failed to load skills catalog: ${String(error)}`,
      });
    }
  }

  private async _toggleProjectSkill(rawSkillId: unknown): Promise<void> {
    const skillId = typeof rawSkillId === 'string' ? rawSkillId.trim() : '';
    if (!skillId) {
      return;
    }

    try {
      const bindings = this._readProjectBindings([]);
      const current = new Set(bindings.skillIds);
      if (current.has(skillId)) {
        current.delete(skillId);
      } else {
        current.add(skillId);
      }
      const nextBindings: ProjectBindings = {
        ...bindings,
        skillIds: [...current].sort(),
      };
      this._writeProjectBindings(nextBindings);
      await this._sendSkillsCatalog();
      this._pushStats(undefined, true);
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'skillsCatalogError',
        error: `Failed to update selected skills: ${String(error)}`,
      });
    }
  }

  private async _runSkillsLcCli(args: string[]): Promise<string> {
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const { stdout, stderr } = await execFileAsync(command, ['skills-lc-cli', ...args], {
      cwd: this.workspaceRoot,
      timeout: 30000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    const combined = [stdout, stderr].filter(Boolean).join('\n').trim();
    return combined || 'Command completed without output.';
  }

  private _extractCommunitySources(output: string): string[] {
    const sourcePattern = /\b([a-z0-9_.-]+\/[a-z0-9_.-]+)\b/gi;
    const matches = output.match(sourcePattern) || [];
    return [...new Set(matches.map((item) => item.toLowerCase()))];
  }

  private async _searchCommunitySkills(rawQuery: unknown): Promise<void> {
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
    if (!query) {
      this._panel.webview.postMessage({
        type: 'communitySkillsResult',
        query: '',
        sources: [],
        output: '',
      });
      return;
    }

    try {
      const output = await this._runSkillsLcCli(['find', query]);
      this._panel.webview.postMessage({
        type: 'communitySkillsResult',
        query,
        sources: this._extractCommunitySources(output),
        output,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'communitySkillsResult',
        query,
        sources: [],
        output: String(error),
      });
    }
  }

  private async _importCommunitySkillSource(rawSource: unknown): Promise<void> {
    const source = typeof rawSource === 'string' ? rawSource.trim() : '';
    if (!source) {
      return;
    }

    try {
      const output = await this._runSkillsLcCli(['add', source, '-a', 'codex', '-y']);
      await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot);
      this._pushStats(undefined, true);
      this._panel.webview.postMessage({
        type: 'communitySkillImportResult',
        source,
        success: true,
        output,
      });
      await this._sendSkillsCatalog();
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'communitySkillImportResult',
        source,
        success: false,
        output: String(error),
      });
    }
  }

  private async _setActiveTeamSelection(teamId: string | null): Promise<void> {
    const normalizedTeamId = typeof teamId === 'string' ? teamId.trim() : '';
    const selectedTeamId = normalizedTeamId || null;

    if (!selectedTeamId) {
      const bindings = this._readProjectBindings([]);
      this._writeProjectBindings({
        ...bindings,
        teamId: null,
        agentIds: [],
      });
      this._syncActiveTeamAgentSpecs([]);
      this._pruneTeamFilesExcept(null);
      await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot, { notify: false });
      return;
    }

    const normalized = this._resolveNormalizedTeamTemplate(selectedTeamId);

    if (normalized) {
      const teamData = this._buildTeamDocument({
        teamId: normalized.id,
        name: normalized.name,
        description: normalized.description,
        agents: normalized.agents,
        tags: normalized.tags,
      });
      this._writeTeamToWorkspace(teamData);
    }

    const bindings = this._readProjectBindings([]);
    this._writeProjectBindings({
      ...bindings,
      teamId: selectedTeamId,
      agentIds: normalized?.agents ?? [],
    });
    this._syncActiveTeamAgentSpecs(normalized?.agents ?? []);

    this._pruneTeamFilesExcept(selectedTeamId);
    await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot, { notify: false });
  }

  private _readActiveTeamId(teams: TeamSummary[], warnings: string[]): string | null {
    const bindings = this._readProjectBindings(warnings);
    const activeTeamId = bindings.teamId;
    if (!activeTeamId) {
      return null;
    }
    return teams.some((team) => team.id === activeTeamId) ? activeTeamId : null;
  }

  private _loadAgents(warnings: string[]): {
    specCount: number;
    validSpecs: number;
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
      return { specCount: 0, validSpecs: 0, agents: [] };
    }
  }

  private _getSyncStatus(): { syncStatus: DashboardStats['syncStatus']; syncTime: string } {
    if (this._lastSyncError) {
      return { syncStatus: 'ERROR', syncTime: 'Failed' };
    }

    const profile = this._readExistingProfileYaml();
    const targets =
      Array.isArray(profile?.sync_targets) && profile.sync_targets.length > 0
        ? profile.sync_targets
        : ['claude_code', 'codex', 'github_copilot'];
    const targetDirs: string[] = [];
    for (const target of targets) {
      if (target === 'github_copilot') {
        targetDirs.push(path.join(this.workspaceRoot, '.github', 'agents'));
      } else if (target === 'claude_code') {
        targetDirs.push(path.join(this.workspaceRoot, '.claude', 'agents'));
      } else if (target === 'codex') {
        targetDirs.push(path.join(this.workspaceRoot, '.codex', 'agents'));
      }
    }

    try {
      let latestTime = 0;
      let syncedFiles = 0;

      for (const dir of targetDirs) {
        if (!fs.existsSync(dir)) {
          continue;
        }
        const files = fs
          .readdirSync(dir)
          .filter((f) => f.endsWith('.agent.md') || f.endsWith('.md'));
        syncedFiles += files.length;
        for (const file of files) {
          const stats = fs.statSync(path.join(dir, file));
          if (stats.mtime.getTime() > latestTime) {
            latestTime = stats.mtime.getTime();
          }
        }
      }

      if (syncedFiles === 0 || latestTime === 0) {
        return { syncStatus: 'NOT_SYNCED', syncTime: 'Never' };
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
      const role =
        data?._metadata &&
        typeof data._metadata === 'object' &&
        typeof (data._metadata as Record<string, unknown>).role === 'string'
          ? ((data._metadata as Record<string, unknown>).role as AgentRole)
          : undefined;
      const name =
        data && typeof data.name === 'string' && data.name.trim()
          ? data.name
          : data && typeof data.title === 'string' && data.title.trim()
            ? data.title
            : id;
      return { id, name, role };
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
        const role =
          parsed?._metadata?.role === 'worker' ||
          parsed?._metadata?.role === 'router' ||
          parsed?._metadata?.role === 'orchestrator'
            ? parsed._metadata.role
            : undefined;
        summaries.push({ id, name, role });
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
      const current = merged.get(entry.id);
      if (!current) {
        merged.set(entry.id, { ...entry });
        continue;
      }

      merged.set(entry.id, {
        id: current.id,
        name: current.name || entry.name,
        role: current.role || entry.role,
      });
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
        syncAgents: 'Requiere team activo',
      };
    }

    if (!activeTeamId) {
      return {
        createAgent: 'Selecciona un equipo para continuar',
        browseSkills: 'Selecciona un equipo para continuar',
        syncAgents: 'Selecciona un equipo para continuar',
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
      totalAgents: visibleAgents.length,
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
