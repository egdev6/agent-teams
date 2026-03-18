import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as https from 'node:https';
import * as path from 'node:path';
import {
  type ContextPackPriority,
  DEFAULT_AGENTS_MD_BUDGET,
  parseContextPackFrontmatter,
  setContextPackPriority,
} from '@agent-teams/core';
import * as vscode from 'vscode';
import * as YAML from 'yaml';
import { type CatalogData, CatalogManager } from './catalogManager';
import type { Logger } from './logger';
import { ProfileLoader } from './profileLoader';
import { SkillsCatalog } from './skillsCatalog';
import type { SyncResult } from './teamManager';
import { TeamManager } from './teamManager';
import type { ProjectProfile } from './types';

type AgentRole = 'worker' | 'router' | 'orchestrator';

interface AgentWizardPayload {
  id?: string;
  name: string;
  version?: string;
  role?: string;
  domain?: string;
  subdomain?: string;
  description?: string;
  expertise?: string[];
  intents?: string[];
  scope?: {
    topics?: string[];
    path_globs?: Array<{ pattern: string; priority?: 'high' | 'medium' | 'low' } | string>;
    excludes?: string[];
  };
  workflow?: string[];
  tools?: Array<{ name: string; when?: string }>;
  skills?: Array<{ id: string; when?: string }>;
  permissions?: Record<string, boolean>;
  constraints?: { always?: string[]; never?: string[]; escalate?: string[] };
  handoffs?: { receives_from?: string[]; delegates_to?: string[]; escalates_to?: string[] };
  output?: {
    template?: string;
    mode?: 'short' | 'detailed';
    max_items?: number;
    never_include?: string[];
    format_instructions?: string;
  };
  context_packs?: string[];
  targets?: string[];
  engram?: { mode?: string };
  mcpServers?: Array<{
    id: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
}

interface TeamSummary {
  id: string;
  name: string;
  description?: string;
  enabledAgentsCount?: number;
  enablesAllAgents?: boolean;
  agentIds?: string[];
}

interface DashboardAgent {
  id: string;
  name: string;
  role: AgentRole;
  teamId?: string | null;
  scope?: 'team' | 'global';
  lastModified: string;
  targets?: string[];
  description?: string;
  intents?: string[];
}

interface CatalogEntitySummary {
  id: string;
  name: string;
  role?: AgentRole;
  description?: string;
  intents?: string[];
  teamIds?: string[];
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
  canDelete: boolean;
  deleteDisabledReason?: string;
  assignedAgentIds?: string[];
}

interface ContextPackStateItem {
  id: string;
  priority: ContextPackPriority;
  description?: string;
}

interface OrphanEntry {
  id: string;
  name?: string;
  errors: string[];
}

/** @deprecated Use OrphanEntry instead */
type InvalidOrphanEntry = OrphanEntry;

interface DashboardStats {
  hasProfile: boolean;
  profileStatus: 'Active' | 'Not configured' | 'Error';
  profileError?: string;
  engramInstalled: boolean;
  engramConfigured: boolean;
  totalAgents: number;
  totalTeams: number;
  agentYamlCount: number;
  validAgentYamlCount: number;
  projectSkillsCount?: number;
  teamsCount: number;
  teams: TeamSummary[];
  activeTeamId: string | null;
  teamContext: 'no_teams' | 'no_active_team' | 'active_team';
  syncStatus: 'SUCCESS' | 'WARNING' | 'NOT_SYNCED' | 'ERROR';
  syncTime: string;
  syncError?: string;
  syncNeeded: boolean;
  pendingChanges?: {
    created: number;
    updated: number;
    skipped: number;
    deleted: number;
    total: number;
    items: Array<{ id: string; action: 'create' | 'update' | 'delete' }>;
  };
  warnings: string[];
  gatingReasons: {
    manageTeams?: string;
    createAgent?: string;
    browseSkills?: string;
    manageAgents?: string;
    manageSkills?: string;
    syncAgents?: string;
  };
  agents: DashboardAgent[];
  globalCatalog: GlobalCatalogSummary;
  bindings: ProjectBindings;
  invalidOrphanAgents?: InvalidOrphanEntry[];
  invalidOrphanTeams?: InvalidOrphanEntry[];
  validOrphanAgents?: OrphanEntry[];
  validOrphanTeams?: OrphanEntry[];
  extensionVersion?: string;
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
  private _dryRunCache: SyncResult | null = null;
  private _dryRunSignature: string | null = null;
  private _dryRunTimer: NodeJS.Timeout | undefined;
  private _dryRunInFlight = false;
  private logger: Logger;
  private workspaceRoot: string;
  private extensionUri: vscode.Uri;
  private _extensionContext: vscode.ExtensionContext;
  private catalogManager: CatalogManager;
  private skillsCatalog: SkillsCatalog;

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
    this._extensionContext = extensionContext;
    this.catalogManager = new CatalogManager(extensionContext, logger);
    this.skillsCatalog = new SkillsCatalog(this.catalogManager, logger);

    this._update();
    this._registerFileWatchers();
    this._startWebviewAssetsPolling();
    this._startWorkspaceStatePolling();
    this._scheduleDryRun();
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
    panel.iconPath = vscode.Uri.joinPath(extensionUri, 'media', 'icon.png');

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
      '.agent-team/agents/*.yml',
      '.agent-team/agents/*.yaml',
      '.agent-teams/agents/*.yml',
      '.agent-teams/agents/*.yaml',
      '.github/agents/*.agent.md',
      // Broad fallbacks for reliability across platforms/filesystems.
      '.agent-team/**/*',
      '.agent-teams/**/*',
    ];

    for (const glob of patterns) {
      this._registerWatcher(glob);
    }

    // Catch-all watcher so dashboard reacts to repository changes as well.
    this._registerWatcher('**/*');

    const onDidSave = vscode.workspace.onDidSaveTextDocument((document) => {
      const normalizedPath = document.uri.fsPath.replace(/\\/g, '/');
      if (normalizedPath.includes('/.agent-team/') || normalizedPath.includes('/.agent-teams/')) {
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
        this._scheduleDryRun();
        return;
      }
      this._pushStats();
      this._scheduleDryRun();
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

  private _safeFilesMtimeStamp(dirPath: string): string {
    if (!fs.existsSync(dirPath)) {
      return 'missing';
    }
    try {
      const files = fs.readdirSync(dirPath).sort();
      if (files.length === 0) {
        return 'empty';
      }
      return files
        .map((f) => {
          try {
            return `${f}:${fs.statSync(path.join(dirPath, f)).mtimeMs}`;
          } catch {
            return `${f}:error`;
          }
        })
        .join(',');
    } catch {
      return 'error';
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
    const agentsDirA = this._preferredAgentTeamsPath('agents');
    const agentsDirB = path.join(this._legacyAgentTeamDir(), 'agents');
    const contextPacksDirA = this._preferredAgentTeamsPath('context-packs');
    const contextPacksDirB = path.join(this._legacyAgentTeamDir(), 'context-packs');

    return [
      `profile:${this._safeStatStamp(profilePath)}`,
      `bindings:${this._safeStatStamp(bindingsPath)}`,
      `teamsA:${this._safeFilesMtimeStamp(teamsDirA)}`,
      `teamsB:${this._safeFilesMtimeStamp(teamsDirB)}`,
      `agentsA:${this._safeFilesMtimeStamp(agentsDirA)}`,
      `agentsB:${this._safeFilesMtimeStamp(agentsDirB)}`,
      `contextPacksA:${this._safeFilesMtimeStamp(contextPacksDirA)}`,
      `contextPacksB:${this._safeFilesMtimeStamp(contextPacksDirB)}`,
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
      case 'importAgentSpec':
        await this._importAgentSpec();
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
      case 'requestCatalogSkills':
        await this._sendCatalogSkills();
        break;
      case 'installCatalogSkill':
        await this._installCatalogSkill(message);
        break;
      case 'toggleSkill':
        await this._toggleProjectSkill(message.skillId);
        break;
      case 'deleteSkill':
        await this._deleteSkill(message.skillId);
        break;
      case 'searchCommunitySkills':
        await this._searchCommunitySkills(
          message.query,
          message.page,
          message.limit,
          message.sortBy,
        );
        break;
      case 'installCommunitySkill':
        await this._installCommunitySkill(message);
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
        await this._createContextPack(message.packId, message.priority);
        break;
      case 'updateContextPackPriority':
        await this._updateContextPackPriority(message.packId, message.priority);
        break;
      case 'importContextPackMd':
        await this._importContextPackMd();
        break;
      case 'openContextPacksFolder':
        await this._openContextPacksFolder();
        break;
      case 'requestAgentPacks':
        await this._sendAgentPacksState(message.agentId);
        break;
      case 'saveAgentPacks':
        await this._saveAgentContextPacks(message.agentId, message.packs);
        break;
      case 'saveProfile':
        await this._saveProfile(message.profile);
        break;
      case 'refresh':
        this._pushStats(undefined, true);
        this._scheduleDryRun();
        break;
      case 'preserveOrphans': {
        const snapshot = this.catalogManager.getCatalogSnapshot();
        const detected = this._detectOrphans(snapshot);
        if (detected.validOrphans.length > 0) {
          this.catalogManager.preserveOrphans(detected.validOrphans);
        }
        this._panel.webview.postMessage({
          type: 'preserveOrphansResult',
          success: true,
          count: detected.validOrphans.length,
        });
        this._pushStats(undefined, true);
        break;
      }
      case 'openExternal':
        if (typeof message.url === 'string') {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
        break;
      case 'setupEngram':
        await vscode.commands.executeCommand('agent-teams.setupEngram');
        this._pushStats(undefined, true);
        break;
      case 'exportCatalog':
        try {
          await this.catalogManager.exportCatalog();
          this._panel.webview.postMessage({ type: 'catalogExportDone', success: true });
        } catch (e) {
          this._panel.webview.postMessage({
            type: 'catalogExportDone',
            success: false,
            error: String(e),
          });
        }
        break;
      case 'importCatalog':
        try {
          const importResult = await this.catalogManager.importCatalogAdditive();
          if (importResult !== null) {
            this._panel.webview.postMessage({
              type: 'catalogImportDone',
              success: true,
              added: importResult.added,
              skipped: importResult.skipped,
            });
            this._pushStats(undefined, true);
          } else {
            // User cancelled the file dialog — reset the loading state
            this._panel.webview.postMessage({
              type: 'catalogImportDone',
              success: false,
              added: 0,
              skipped: 0,
              error: 'cancelled',
            });
          }
        } catch (e) {
          this._panel.webview.postMessage({
            type: 'catalogImportDone',
            success: false,
            added: 0,
            skipped: 0,
            error: String(e),
          });
        }
        break;
      case 'resetCatalog':
        try {
          const didReset = await this.catalogManager.resetCatalog();
          this._panel.webview.postMessage({ type: 'catalogResetDone', success: didReset });
          if (didReset) {
            this._pushStats(undefined, true);
          }
        } catch (e) {
          this._panel.webview.postMessage({
            type: 'catalogResetDone',
            success: false,
            error: String(e),
          });
        }
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
          const parts = [];
          if (result.summary.created) parts.push(`${result.summary.created} created`);
          if (result.summary.updated) parts.push(`${result.summary.updated} updated`);
          if (result.summary.deleted) parts.push(`${result.summary.deleted} deleted`);
          vscode.window.showInformationMessage(
            `✅ Sync complete (${result.targets.join(', ')}): ${parts.join(', ') || 'no changes'}.`,
          );
        },
      );
      this._lastSyncError = null;
      this._dryRunCache = null;
      this._dryRunSignature = null;
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

  /**
   * Schedule a debounced dry-run sync to compute pending changes.
   * Runs ~2s after the last workspace change to avoid thrashing.
   */
  private _scheduleDryRun(): void {
    if (this._dryRunTimer) {
      clearTimeout(this._dryRunTimer);
    }
    this._dryRunTimer = setTimeout(() => {
      this._runDryRunSync();
    }, 2000);
  }

  /**
   * Execute a dry-run sync to detect pending changes.
   * Results are cached and only recomputed when the workspace state signature changes.
   */
  private async _runDryRunSync(): Promise<void> {
    if (this._dryRunInFlight) {
      return;
    }

    const currentSignature = this._getWorkspaceStateSignature();
    if (this._dryRunSignature === currentSignature && this._dryRunCache !== null) {
      return;
    }

    const current = this._getStats();
    const teamId = current.activeTeamId || current.bindings.teamId;
    if (!teamId || current.gatingReasons.syncAgents) {
      this._dryRunCache = null;
      this._dryRunSignature = currentSignature;
      this._pushStats(undefined, true);
      return;
    }

    this._dryRunInFlight = true;
    try {
      const teamManager = new TeamManager();
      const result = await teamManager.syncTeam(this.workspaceRoot, teamId, {
        dryRun: true,
        showDiff: false,
      });
      this._dryRunCache = result;
      this._dryRunSignature = currentSignature;
    } catch (_error) {
      this._dryRunCache = null;
      this._dryRunSignature = currentSignature;
    } finally {
      this._dryRunInFlight = false;
    }

    this._pushStats(undefined, true);
  }

  private _normalizeCreateTeamPayload(message: any): {
    teamId: string;
    name: string;
    description?: string;
    agents?: string[];
    tags?: string[];
  } | null {
    if (typeof message?.teamId !== 'string' || typeof message?.name !== 'string') {
      return null;
    }
    return {
      teamId: message.teamId,
      name: message.name,
      description: typeof message.description === 'string' ? message.description : undefined,
      agents: Array.isArray(message.agents)
        ? message.agents.filter((agent: unknown): agent is string => typeof agent === 'string')
        : undefined,
      tags: Array.isArray(message.tags)
        ? message.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
        : undefined,
    };
  }

  private async _createTeam(message: any): Promise<void> {
    const current = this._getStats();
    if (current.gatingReasons.manageTeams) {
      vscode.window.showWarningMessage(current.gatingReasons.manageTeams);
      return;
    }
    try {
      const payload = this._normalizeCreateTeamPayload(message);

      if (payload) {
        const existingTeamIds = new Set(current.globalCatalog.teams.map((team) => team.id));
        if (existingTeamIds.has(payload.teamId)) {
          throw new Error(`Team "${payload.teamId}" already exists.`);
        }
        const teamData = this._buildTeamDocument({
          teamId: payload.teamId,
          name: payload.name,
          description: payload.description,
          agents: payload.agents,
          tags: payload.tags,
        });
        const hasProjectTeamAssigned = Boolean(current.activeTeamId || current.bindings.teamId);
        if (!hasProjectTeamAssigned) {
          this._writeTeamToWorkspace(teamData);
        }
        this.catalogManager.upsertTeam(payload.teamId, teamData, 'workspace');
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

    if (!id || !name) {
      return null;
    }

    const agents = this._extractTeamAgents(team);
    const tags = this._extractTeamTags(team);

    return {
      id,
      name,
      description,
      agents,
      tags,
    };
  }

  private _extractTeamAgents(team: Record<string, unknown>): string[] | undefined {
    const agentIdsRaw = Array.isArray(team.agentIds) ? team.agentIds : undefined;
    const enabledRaw = Array.isArray(team.agents)
      ? team.agents
      : team.agents && typeof team.agents === 'object'
        ? (team.agents as Record<string, unknown>).enable
        : agentIdsRaw;

    if (enabledRaw === 'all') {
      return this._allKnownAgentIds();
    }

    if (Array.isArray(enabledRaw)) {
      return Array.from(
        new Set(
          enabledRaw
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => Boolean(item)),
        ),
      );
    }

    return undefined;
  }

  private _extractTeamTags(team: Record<string, unknown>): string[] | undefined {
    if (!Array.isArray(team.tags)) {
      return undefined;
    }

    return Array.from(
      new Set(
        team.tags
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => Boolean(item)),
      ),
    );
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

  /**
   * Add an agent to a team's agents.enable list and keep bindings/agent YAMLs in sync.
   */
  private _addAgentToTeam(agentId: string, teamId: string): void {
    const teamFilePath = this._resolveTeamFilePath(teamId);
    if (!teamFilePath) return;

    try {
      const raw = fs.readFileSync(teamFilePath, 'utf-8');
      const parsed = YAML.parse(raw) as Record<string, unknown>;
      const agentsCfg = parsed?.agents;
      const enabledRaw =
        agentsCfg && typeof agentsCfg === 'object'
          ? (agentsCfg as Record<string, unknown>).enable
          : undefined;

      // If enable === 'all', the new agent is implicitly included
      if (enabledRaw === 'all') return;

      const enabledAgents: string[] = Array.isArray(enabledRaw)
        ? enabledRaw.filter((a): a is string => typeof a === 'string')
        : [];

      if (enabledAgents.includes(agentId)) return;

      enabledAgents.push(agentId);
      const updated: Record<string, unknown> = {
        ...parsed,
        agents: {
          ...(agentsCfg && typeof agentsCfg === 'object'
            ? (agentsCfg as Record<string, unknown>)
            : {}),
          enable: enabledAgents,
        },
      };
      fs.writeFileSync(teamFilePath, YAML.stringify(updated), 'utf-8');
      this.catalogManager.upsertTeam(teamId, updated, 'workspace');

      // Keep bindings and .agent-teams/agents/ in sync
      const bindings = this._readProjectBindings([]);
      if (bindings.teamId === teamId) {
        const updatedAgentIds = [...new Set([...bindings.agentIds, agentId])];
        this._writeProjectBindings({ ...bindings, agentIds: updatedAgentIds });
        this._syncActiveTeamAgentSpecs(updatedAgentIds);
      }
    } catch (error) {
      this.logger.warn(`Failed to add agent "${agentId}" to team "${teamId}": ${error}`);
    }
  }

  /**
   * Returns the set of agent IDs enabled in the given team.
   * Returns null when the team enables ALL agents (enable === 'all').
   */
  private _getTeamEnabledAgentIds(teamId: string): Set<string> | null {
    const teamFilePath = this._resolveTeamFilePath(teamId);

    if (teamFilePath) {
      try {
        const raw = fs.readFileSync(teamFilePath, 'utf-8');
        const parsed = YAML.parse(raw) as Record<string, unknown>;
        const agentsCfg = parsed?.agents;
        const enabledRaw =
          agentsCfg && typeof agentsCfg === 'object'
            ? (agentsCfg as Record<string, unknown>).enable
            : undefined;
        if (enabledRaw === 'all') return null;
        if (Array.isArray(enabledRaw)) {
          return new Set(enabledRaw.filter((a): a is string => typeof a === 'string'));
        }
        return new Set<string>();
      } catch (_error) {
        // fall through to catalog
      }
    }

    // Fallback: read from catalog
    const catalogTeam = this.catalogManager.getCatalogSnapshot().teams?.[teamId]?.data;
    const normalized = this._normalizeTeamTemplate(catalogTeam);
    if (!normalized) return new Set<string>();
    if (!normalized.agents) return null; // not set → treat as 'all'
    return new Set(normalized.agents);
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

  private _shouldDeleteTeamFile(file: string, teamIdToKeep: string): boolean {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.yml' && ext !== '.yaml') {
      return false;
    }
    const teamId = path.parse(file).name;
    return teamId !== teamIdToKeep;
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
        if (keep && !this._shouldDeleteTeamFile(file, keep)) {
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
      this._dryRunCache = null;
      this._dryRunSignature = null;
      this._pushStats(undefined, true);
      this._scheduleDryRun();
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
      const existsInCatalog = Boolean(this.catalogManager.getCatalogSnapshot().teams[teamId]);

      if (!teamPath && !existsInCatalog) {
        this._panel.webview.postMessage({
          type: 'deleteTeamResult',
          success: false,
          error: `Team "${teamId}" not found.`,
        });
        return;
      }

      // Only delete the file if it actually exists on disk (some teams are catalog-only)
      if (teamPath) {
        fs.unlinkSync(teamPath);
      }
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
      const gitignoreHasAgentTeams = this._gitignoreHasAgentTeams();

      this._panel.webview.postMessage({
        type: 'detectedConfig',
        config: detectedConfig,
        workspaceName: folderName,
        profile: existingProfile,
        gitignoreHasAgentTeams,
      });
    } catch (error) {
      this.logger.error(`Failed to detect config: ${error}`);
    }
  }

  private readonly _GITIGNORE_PATHS_BY_TARGET: Record<string, string[]> = {
    claude_code: ['.claude/'],
    codex: [],
    github_copilot: [
      '.github/copilot-instructions.md',
      '.github/agents/',
      '.github/skills/',
      '.github/context/',
    ],
  };

  private readonly _AGENTS_MD_TARGETS = new Set(['claude_code', 'codex']);

  private _updateGitignoreForTargets(gitignoreTargets: string[]): void {
    if (gitignoreTargets.length === 0) return;

    const pathsToAdd = new Set<string>();
    for (const target of gitignoreTargets) {
      for (const p of this._GITIGNORE_PATHS_BY_TARGET[target] ?? []) {
        pathsToAdd.add(p);
      }
      if (this._AGENTS_MD_TARGETS.has(target)) {
        pathsToAdd.add('AGENTS.md');
      }
    }

    if (pathsToAdd.size === 0) return;

    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    const content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';

    let additions = '';
    for (const entry of pathsToAdd) {
      const marker = `# agent-teams: ${entry} output`;
      if (!content.includes(marker)) {
        additions += `\n${marker}\n${entry}\n`;
      }
    }

    if (!additions) return;

    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, additions.trimStart(), 'utf-8');
    } else {
      fs.appendFileSync(gitignorePath, additions, 'utf-8');
    }
  }

  private _normalizeGitignoreTargets(
    input: unknown,
  ): Array<'claude_code' | 'codex' | 'github_copilot'> {
    const allowed = new Set<string>(['claude_code', 'codex', 'github_copilot']);
    if (!Array.isArray(input)) return [];
    return Array.from(
      new Set(
        input.filter(
          (item): item is 'claude_code' | 'codex' | 'github_copilot' =>
            typeof item === 'string' && allowed.has(item),
        ),
      ),
    );
  }

  private _updateGitignoreForAgentTeams(): void {
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    const marker = '.agent-teams';
    const block = '\n# Agent Teams local configuration\n.agent-teams/\n';

    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, block.trimStart(), 'utf-8');
      return;
    }

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes(marker)) {
      fs.appendFileSync(gitignorePath, block, 'utf-8');
    }
  }

  private _gitignoreHasAgentTeams(): boolean {
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
    if (!fs.existsSync(gitignorePath)) return false;
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    return content.includes('.agent-teams');
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

  private _normalizeSyncTargets(input: unknown): Array<'copilot' | 'claude' | 'codex'> {
    const ALIAS: Record<string, 'copilot' | 'claude' | 'codex'> = {
      github_copilot: 'copilot',
      copilot: 'copilot',
      claude_code: 'claude',
      claude: 'claude',
      codex: 'codex',
    };
    const raw = Array.isArray(input)
      ? input.filter((item): item is string => typeof item === 'string')
      : [];
    const normalized = Array.from(
      new Set(
        raw
          .map((item) => ALIAS[item])
          .filter((v): v is 'copilot' | 'claude' | 'codex' => v !== undefined),
      ),
    );
    return normalized;
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

  private _contextPackTemplate(
    packId: string,
    priority: 'essential' | 'standard' | 'reference' = 'standard',
  ): string {
    return `---
priority: ${priority}
description: Describe what this context pack adds to the project.
---

# ${packId}

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
      const packsMeta: ContextPackStateItem[] = availablePacks.map((packId) => {
        const packPath = path.join(this._contextPacksDirPath(), `${packId}.md`);
        let priority: ContextPackPriority = 'standard';
        let description: string | undefined;

        if (fs.existsSync(packPath)) {
          const raw = fs.readFileSync(packPath, 'utf-8');
          const meta = parseContextPackFrontmatter(raw);
          if (meta.priority) {
            priority = meta.priority;
          }
          if (meta.description) {
            description = meta.description;
          }
        }

        return { id: packId, priority, description };
      });

      this._panel.webview.postMessage({
        type: 'contextPacksState',
        availablePacks,
        packsMeta,
        selectedPacks,
        agentsMdBudget:
          typeof profile?.agents_md_budget === 'number'
            ? profile.agents_md_budget
            : DEFAULT_AGENTS_MD_BUDGET,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'contextPacksError',
        error: `Failed to load context packs: ${String(error)}`,
      });
    }
  }

  private async _createContextPack(rawPackId: unknown, rawPriority?: unknown): Promise<void> {
    const packId = this._sanitizePackId(rawPackId);
    const _priority =
      rawPriority === 'essential' || rawPriority === 'standard' || rawPriority === 'reference'
        ? (rawPriority as 'essential' | 'standard' | 'reference')
        : 'standard';
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
        fs.writeFileSync(packPath, this._contextPackTemplate(packId, _priority), 'utf-8');
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

  private async _updateContextPackPriority(
    rawPackId: unknown,
    rawPriority: unknown,
  ): Promise<void> {
    const packId = this._sanitizePackId(rawPackId);
    const priority =
      rawPriority === 'essential' || rawPriority === 'standard' || rawPriority === 'reference'
        ? (rawPriority as ContextPackPriority)
        : null;
    if (!packId || !priority) {
      this._panel.webview.postMessage({
        type: 'contextPacksError',
        error: 'Invalid pack id or priority value.',
      });
      return;
    }
    try {
      const packPath = path.join(this._contextPacksDirPath(), `${packId}.md`);
      if (!fs.existsSync(packPath)) {
        this._panel.webview.postMessage({
          type: 'contextPacksError',
          error: `Context pack file not found: ${packId}.md`,
        });
        return;
      }
      const raw = fs.readFileSync(packPath, 'utf-8');
      const updated = setContextPackPriority(raw, priority);
      fs.writeFileSync(packPath, updated, 'utf-8');
      this._panel.webview.postMessage({
        type: 'contextPackPriorityUpdated',
        packId,
        priority,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'contextPacksError',
        error: `Failed to update priority: ${String(error)}`,
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

  private _resolveUniquePackId(basePackId: string, existing: Set<string>): string {
    let packId = basePackId;
    let counter = 2;
    while (existing.has(packId)) {
      packId = `${basePackId}-${counter}`;
      counter += 1;
    }
    return packId;
  }

  private async _importContextPackMd(): Promise<void> {
    try {
      const picked = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: true,
        openLabel: 'Import as Context Pack',
        filters: {
          'Markdown Files': ['md'],
        },
      });

      if (!picked || picked.length === 0) {
        return;
      }

      const packsDir = this._contextPacksDirPath();
      if (!fs.existsSync(packsDir)) {
        fs.mkdirSync(packsDir, { recursive: true });
      }

      const existingIds = new Set(this._listContextPacks());
      const importedPackIds: string[] = [];

      for (const fileUri of picked) {
        const sourcePath = fileUri.fsPath;
        const sourceName = path.basename(sourcePath);
        const rawMarkdown = fs.readFileSync(sourcePath, 'utf-8');

        const baseName = path.basename(sourceName, path.extname(sourceName));
        const basePackId = this._sanitizePackId(baseName) || 'imported-pack';
        const packId = this._resolveUniquePackId(basePackId, existingIds);
        existingIds.add(packId);

        fs.writeFileSync(path.join(packsDir, `${packId}.md`), rawMarkdown, 'utf-8');
        importedPackIds.push(packId);
      }

      if (importedPackIds.length > 0) {
        const profile = this._readExistingProfileYaml();
        const currentSelected =
          profile && Array.isArray(profile.context_packs)
            ? profile.context_packs.filter((item): item is string => typeof item === 'string')
            : [];
        const nextSelected = Array.from(new Set([...currentSelected, ...importedPackIds]));
        await this._saveContextPacks(nextSelected);
      }

      this._panel.webview.postMessage({
        type: 'contextPacksImported',
        count: importedPackIds.length,
        packs: importedPackIds,
      });
      await this._sendContextPacksState();
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'contextPacksError',
        error: `Failed to import Markdown context pack: ${String(error)}`,
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
      this._dryRunSignature = null;
      this._scheduleDryRun();
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'contextPacksError',
        error: `Failed to save context packs: ${String(error)}`,
      });
    }
  }

  private async _sendAgentPacksState(agentId: unknown): Promise<void> {
    if (typeof agentId !== 'string' || !agentId) {
      this._panel.webview.postMessage({
        type: 'agentPacksError',
        error: 'Invalid agent ID.',
      });
      return;
    }
    try {
      const available = this._listContextPacks();
      const profile = this._readExistingProfileYaml();
      const availableFromProfile = Array.isArray(profile?.context_packs)
        ? profile.context_packs.filter((p): p is string => typeof p === 'string')
        : available;

      const specPath = this._findAgentSpecByAgentId(agentId);
      let selected: string[] = [];
      if (specPath) {
        const raw = YAML.parse(fs.readFileSync(specPath, 'utf-8')) as Record<string, unknown>;
        selected = Array.isArray(raw.context_packs)
          ? (raw.context_packs as unknown[]).filter((p): p is string => typeof p === 'string')
          : [];
      }

      this._panel.webview.postMessage({
        type: 'agentPacksState',
        agentId,
        available: availableFromProfile,
        selected,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'agentPacksError',
        agentId,
        error: `Failed to load agent packs: ${String(error)}`,
      });
    }
  }

  private async _saveAgentContextPacks(agentId: unknown, packs: unknown): Promise<void> {
    if (typeof agentId !== 'string' || !agentId) {
      this._panel.webview.postMessage({
        type: 'agentPacksError',
        error: 'Invalid agent ID.',
      });
      return;
    }
    try {
      const sanitized = Array.isArray(packs)
        ? (packs as unknown[])
            .filter((p): p is string => typeof p === 'string')
            .map((p) => this._sanitizePackId(p))
            .filter(Boolean)
        : [];
      const unique = [...new Set(sanitized)];

      const specPath = this._findAgentSpecByAgentId(agentId);
      if (!specPath) {
        this._panel.webview.postMessage({
          type: 'agentPacksError',
          agentId,
          error: `Agent spec not found for "${agentId}".`,
        });
        return;
      }

      const existing = YAML.parse(fs.readFileSync(specPath, 'utf-8')) as Record<string, unknown>;

      const updated = { ...existing };
      if (unique.length > 0) {
        updated.context_packs = unique;
      } else {
        delete updated.context_packs;
      }
      fs.writeFileSync(specPath, YAML.stringify(updated), 'utf-8');

      this._panel.webview.postMessage({
        type: 'agentPacksSaved',
        agentId,
        count: unique.length,
      });
      await this._sendAgentPacksState(agentId);
      this._dryRunSignature = null;
      this._scheduleDryRun();
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'agentPacksError',
        agentId,
        error: `Failed to save agent packs: ${String(error)}`,
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

      if (profileData?.addToGitignore === true) {
        this._updateGitignoreForAgentTeams();
      }

      const gitignoreTargets = this._normalizeGitignoreTargets(profileData?.gitignoreTargets);
      if (gitignoreTargets.length > 0) {
        this._updateGitignoreForTargets(gitignoreTargets);
      }

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
      sync_targets: this._mapSyncTargetsToProfileFormat(
        this._resolveFinalSyncTargets(syncTargets, existingProfile),
      ),
      gitignore_targets: this._normalizeGitignoreTargets(profileData?.gitignoreTargets),
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
  ): Array<'copilot' | 'claude' | 'codex'> {
    if (syncTargets.length > 0) return this._normalizeSyncTargets(syncTargets);
    if (existingProfile && Array.isArray(existingProfile.sync_targets)) {
      return this._normalizeSyncTargets(existingProfile.sync_targets);
    }
    return ['copilot', 'claude'];
  }

  private _mapSyncTargetsToProfileFormat(
    targets: Array<'copilot' | 'claude' | 'codex'>,
  ): Array<'github_copilot' | 'claude_code' | 'codex'> {
    const mapping: Record<
      'copilot' | 'claude' | 'codex',
      'github_copilot' | 'claude_code' | 'codex'
    > = {
      copilot: 'github_copilot',
      claude: 'claude_code',
      codex: 'codex',
    };
    return targets.map((t) => mapping[t]);
  }

  private async _sendAgentData(agentId: string): Promise<void> {
    const specPath = this._findAgentSpecByAgentId(agentId);
    if (!specPath) {
      // Fall back to catalog data for import-sourced agents that have no local spec file
      const catalogData = this.catalogManager.getCatalogSnapshot().agents?.[agentId]?.data;
      if (catalogData && typeof catalogData === 'object') {
        this._panel.webview.postMessage(
          this._toAgentDataMessage(agentId, catalogData as Record<string, any>),
        );
        return;
      }
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

  private _getAvailableContextPacks(): string[] {
    const profile = this._readExistingProfileYaml();
    return Array.isArray(profile?.context_packs)
      ? profile.context_packs.filter((p): p is string => typeof p === 'string')
      : this._listContextPacks();
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: maps many agent schema fields including legacy _metadata format
  private _toAgentDataMessage(agentId: string, spec: Record<string, any>): Record<string, unknown> {
    const assignedTeamIds = this._getTeamsContainingAgent(agentId);
    const availableContextPacks = this._getAvailableContextPacks();

    // Support legacy _metadata format: many fields may be nested under _metadata
    const meta =
      spec._metadata && typeof spec._metadata === 'object'
        ? (spec._metadata as Record<string, any>)
        : null;

    // Build scope: prefer flat spec.scope (normalizing path_globs); fall back to
    // legacy _metadata.path_globs for old-format agents.
    let scope: Record<string, unknown> | undefined;
    if (spec.scope && typeof spec.scope === 'object') {
      const rawScope = spec.scope as Record<string, unknown>;
      scope = {
        topics: this._ensureArray(rawScope.topics),
        path_globs: this._normalizePathGlobs(rawScope.path_globs),
        excludes: this._ensureArray(rawScope.excludes),
      };
    } else if (meta?.path_globs && Array.isArray(meta.path_globs) && meta.path_globs.length > 0) {
      scope = { path_globs: this._normalizePathGlobs(meta.path_globs) };
    }

    return {
      type: 'agentData',
      agentId,
      name: spec.name || agentId,
      role: spec.role || meta?.role || '',
      version: spec.version ?? '1.0.0',
      description: spec.description || '',
      domain: spec.domain || meta?.domain || '',
      subdomain:
        spec.subdomain ||
        (Array.isArray(meta?.subdomains) && meta.subdomains.length > 0 ? meta.subdomains[0] : '') ||
        '',
      expertise: this._ensureArray(spec.expertise),
      intents: this._ensureArray(spec.intents ?? meta?.intents),
      scope,
      workflow: this._ensureArray(spec.workflow),
      tools: this._ensureArray(spec.tools),
      skills: this._ensureArray(spec.skills ?? meta?.skills?.uses),
      permissions: this._ensureObject(spec.permissions),
      constraints: spec.constraints ?? undefined,
      handoffs: spec.handoffs ?? undefined,
      output: spec.output ?? undefined,
      context_packs: this._ensureArray(spec.context_packs ?? meta?.context?.packs),
      availableContextPacks,
      targets: this._ensureArray(spec.targets ?? meta?.targets, ['copilot', 'claude']),
      assignedTeamIds,
      isAssignedToAnyTeam: assignedTeamIds.length > 0,
      engram: spec.engram ?? undefined,
      mcpServers: this._ensureArray(spec.mcpServers),
    };
  }

  /** Normalises path_globs items to `{pattern, priority?}` objects (schema also allows bare strings). */
  private _normalizePathGlobs(
    globs: unknown,
  ): Array<{ pattern: string; priority?: 'high' | 'medium' | 'low' }> {
    return this._ensureArray<unknown>(globs)
      .map((g) => {
        if (typeof g === 'string') return { pattern: g };
        if (g && typeof g === 'object') {
          const obj = g as Record<string, unknown>;
          if (typeof obj.pattern === 'string') {
            return obj as { pattern: string; priority?: 'high' | 'medium' | 'low' };
          }
        }
        return null;
      })
      .filter((g): g is { pattern: string; priority?: 'high' | 'medium' | 'low' } => g !== null);
  }

  private _ensureArray<T = unknown>(value: unknown, fallback: T[] = []): T[] {
    return Array.isArray(value) ? (value as T[]) : fallback;
  }

  private _ensureObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private _buildCreateAgentSpec(
    name: string,
    message: AgentWizardPayload,
  ): {
    agentId: string;
    spec: Record<string, unknown>;
  } {
    const agentId = this._resolveAgentId(message.id, name);
    const spec = this._buildAgentSpecWithOptionals(agentId, name, message);
    return { agentId, spec };
  }

  private _resolveAgentId(messageId: string | undefined, name: string): string {
    return (
      messageId ||
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    );
  }

  private _buildAgentSpecWithOptionals(
    agentId: string,
    name: string,
    message: AgentWizardPayload,
  ): Record<string, unknown> {
    const spec: Record<string, unknown> = {
      id: agentId,
      name: name.trim(),
      version: message.version ?? '1.0.0',
      role: message.role ?? 'worker',
      domain: message.domain || 'general',
      description: message.description ?? '',
    };

    this._addOptionalAgentFieldsForCreate(spec, message);
    return spec;
  }

  private _addOptionalAgentFieldsForCreate(
    spec: Record<string, unknown>,
    message: AgentWizardPayload,
  ): void {
    if (message.subdomain) spec.subdomain = message.subdomain;
    if (message.expertise?.length) spec.expertise = message.expertise;
    if (message.intents?.length) spec.intents = message.intents;
    if (message.scope) spec.scope = message.scope;
    if (message.workflow?.length) spec.workflow = message.workflow;
    if (message.tools?.length) spec.tools = message.tools;
    if (message.skills?.length) spec.skills = message.skills;
    if (message.permissions) spec.permissions = message.permissions;
    if (message.constraints) spec.constraints = message.constraints;
    if (message.handoffs) spec.handoffs = message.handoffs;
    if (message.output) spec.output = message.output;
    if (message.context_packs?.length) spec.context_packs = message.context_packs;
    if (message.targets?.length) spec.targets = message.targets;
    if (message.engram) spec.engram = message.engram;
    if (message.mcpServers?.length) spec.mcpServers = message.mcpServers;
  }

  private async _createAgentFromPayload(message: AgentWizardPayload): Promise<void> {
    const gating = this._getStats().gatingReasons.createAgent;
    if (gating) {
      this._panel.webview.postMessage({ type: 'createAgentResult', success: false, error: gating });
      return;
    }
    const { name } = message;
    if (!name?.trim()) {
      this._panel.webview.postMessage({
        type: 'createAgentResult',
        success: false,
        error: 'Agent name is required',
      });
      return;
    }
    try {
      const { agentId, spec } = this._buildCreateAgentSpec(name, message);

      const agentSpecsDir = this._preferredAgentTeamsPath('agents');
      if (!fs.existsSync(agentSpecsDir)) {
        fs.mkdirSync(agentSpecsDir, { recursive: true });
      }
      const specPath = path.join(agentSpecsDir, `${agentId}.yml`);
      fs.writeFileSync(specPath, YAML.stringify(spec), 'utf-8');

      await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot);
      // Auto-link the new agent to the active team so it stays enabled
      const activeTeamId = this._getSelectedProjectTeamId();
      if (activeTeamId) {
        this._addAgentToTeam(agentId, activeTeamId);
      }
      this._pushStats(undefined, true);
      this._panel.webview.postMessage({ type: 'createAgentResult', success: true });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'createAgentResult',
        success: false,
        error: String(error),
      });
    }
  }

  private async _importAgentSpec(): Promise<void> {
    const gating = this._getStats().gatingReasons.createAgent;
    if (gating) {
      this._panel.webview.postMessage({
        type: 'importAgentSpecResult',
        success: false,
        error: gating,
      });
      return;
    }

    const selected = await vscode.window.showOpenDialog({
      title: 'Import Agent Spec',
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'Spec Files': ['yml', 'yaml', 'json'],
      },
      openLabel: 'Import Spec',
      defaultUri: vscode.Uri.file(this._preferredAgentTeamsPath('agents')),
    });

    if (!selected || selected.length === 0) {
      this._panel.webview.postMessage({
        type: 'importAgentSpecResult',
        success: false,
        canceled: true,
      });
      return;
    }

    try {
      const specPath = selected[0].fsPath;
      const imported = this._readStructuredFile(specPath);
      if (!imported || typeof imported !== 'object') {
        this._panel.webview.postMessage({
          type: 'importAgentSpecResult',
          success: false,
          error: 'Could not parse spec file',
        });
        return;
      }

      const specObj = imported as Record<string, any>;
      // Support both old (_metadata.id) and new (root id) spec formats
      const agentId: string =
        (specObj._metadata?.id as string | undefined)?.trim() ||
        (specObj.id as string | undefined)?.trim() ||
        path.basename(specPath, path.extname(specPath));

      const targetPath = this._preferredAgentTeamsPath('agents', `${agentId}.yml`);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, YAML.stringify(specObj), 'utf-8');

      await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot);

      const activeTeamId = this._getSelectedProjectTeamId();
      if (activeTeamId) {
        this._addAgentToTeam(agentId, activeTeamId);
      }

      this._pushStats(undefined, true);
      this._panel.webview.postMessage({
        type: 'importAgentSpecResult',
        success: true,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'importAgentSpecResult',
        success: false,
        error: String(error),
      });
    }
  }

  private async _saveAgentFromPayload(message: AgentWizardPayload): Promise<void> {
    // The webview sends `id` for the agent identifier
    const agentId = message.id;
    const { name } = message;
    if (!agentId || !name?.trim()) {
      this._panel.webview.postMessage({
        type: 'saveAgentResult',
        success: false,
        error: 'Agent ID and name are required',
      });
      return;
    }
    try {
      let specPath = this._findAgentSpecByAgentId(agentId);
      let existing: Record<string, unknown> = {};

      if (specPath) {
        existing = YAML.parse(fs.readFileSync(specPath, 'utf-8')) as Record<string, unknown>;
      } else {
        // No local spec file — agent may be import-sourced. Create the file now so edits persist.
        const agentSpecsDir = this._preferredAgentTeamsPath('agents');
        if (!fs.existsSync(agentSpecsDir)) {
          fs.mkdirSync(agentSpecsDir, { recursive: true });
        }
        specPath = path.join(agentSpecsDir, `${agentId}.yml`);
        // Seed existing from catalog data so that fields not exposed in the wizard are preserved
        const catalogData = this.catalogManager.getCatalogSnapshot().agents?.[agentId]?.data;
        if (catalogData && typeof catalogData === 'object') {
          existing = catalogData as Record<string, unknown>;
        }
      }

      const updated = this._buildAgentUpdatePayload(agentId, name, message, existing);

      fs.writeFileSync(specPath, YAML.stringify(updated), 'utf-8');

      await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot, { notify: false });
      this._dryRunCache = null;
      this._dryRunSignature = null;
      this._pushStats(undefined, true);
      this._scheduleDryRun();
      this._panel.webview.postMessage({ type: 'saveAgentResult', success: true });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'saveAgentResult',
        success: false,
        error: String(error),
      });
    }
  }

  private _buildAgentUpdatePayload(
    agentId: string,
    name: string,
    message: AgentWizardPayload,
    existing: Record<string, unknown>,
  ): Record<string, unknown> {
    const updated: Record<string, unknown> = {
      id: agentId,
      name: name.trim(),
      version: message.version ?? (existing.version as string) ?? '1.0.0',
      role: message.role ?? (existing.role as string) ?? 'worker',
      domain: message.domain || (existing.domain as string) || 'general',
    };
    updated.description = message.description ?? (existing.description as string) ?? '';
    this._addOptionalAgentFields(updated, message);
    return updated;
  }

  private _addOptionalAgentFields(
    updated: Record<string, unknown>,
    message: AgentWizardPayload,
  ): void {
    this._addOptionalAgentFieldsBasics(updated, message);
    this._addOptionalAgentFieldsAdvanced(updated, message);
    this._addOptionalAgentFieldsSpecial(updated, message);
  }

  private _addOptionalAgentFieldsBasics(
    updated: Record<string, unknown>,
    message: AgentWizardPayload,
  ): void {
    if (message.subdomain) updated.subdomain = message.subdomain;
    if (message.expertise?.length) updated.expertise = message.expertise;
    if (message.intents?.length) updated.intents = message.intents;
    if (message.scope) updated.scope = message.scope;
    if (message.workflow?.length) updated.workflow = message.workflow;
    if (message.tools?.length) updated.tools = message.tools;
    if (message.skills?.length) updated.skills = message.skills;
  }

  private _addOptionalAgentFieldsAdvanced(
    updated: Record<string, unknown>,
    message: AgentWizardPayload,
  ): void {
    if (message.permissions) updated.permissions = message.permissions;
    if (message.constraints) updated.constraints = message.constraints;
    if (message.handoffs) updated.handoffs = message.handoffs;
    if (message.output) updated.output = message.output;
    if (message.context_packs?.length) updated.context_packs = message.context_packs;
    if (message.targets?.length) updated.targets = message.targets;
  }

  private _addOptionalAgentFieldsSpecial(
    updated: Record<string, unknown>,
    message: AgentWizardPayload,
  ): void {
    if (message.engram) updated.engram = message.engram;
    else delete updated.engram;
    if (message.mcpServers?.length) updated.mcpServers = message.mcpServers;
    else delete updated.mcpServers;
  }

  private async _deleteAgent(agentId: string): Promise<void> {
    const assignedTeamIds = this._getTeamsContainingAgent(agentId);
    if (assignedTeamIds.length > 0) {
      const teamList = assignedTeamIds.join(', ');
      vscode.window.showWarningMessage(
        `Cannot delete "${agentId}" because it is assigned to team(s): ${teamList}.`,
      );
      this._panel.webview.postMessage({ type: 'deleteAgentResult', success: false });
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `Delete agent "${agentId}"?`,
      'Delete',
      'Cancel',
    );

    if (confirm !== 'Delete') {
      this._panel.webview.postMessage({ type: 'deleteAgentResult', success: false });
      return;
    }

    try {
      const specPath = this._findAgentSpecByAgentId(agentId);
      const agentPath = path.join(this.workspaceRoot, 'agents', `${agentId}.md`);
      const githubPath = path.join(this.workspaceRoot, '.github', 'agents', `${agentId}.agent.md`);

      if (specPath && fs.existsSync(specPath)) fs.unlinkSync(specPath);
      if (fs.existsSync(agentPath)) fs.unlinkSync(agentPath);
      if (fs.existsSync(githubPath)) fs.unlinkSync(githubPath);
      this.catalogManager.removeAgent(agentId);

      vscode.window.showInformationMessage(`✅ Deleted agent "${agentId}"`);
      this._panel.webview.postMessage({ type: 'deleteAgentResult', success: true });
      this._pushStats();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete agent: ${error}`);
      this._panel.webview.postMessage({
        type: 'deleteAgentResult',
        success: false,
        error: String(error),
      });
    }
  }

  private async _viewSpec(agentId: string): Promise<void> {
    const specPath = this._findAgentSpecByAgentId(agentId);
    if (specPath) {
      const doc = await vscode.workspace.openTextDocument(specPath);
      await vscode.window.showTextDocument(doc, { preview: true });
    }
  }

  private _findAgentSpecByAgentId(agentId: string): string | null {
    for (const agentSpecsDir of this._agentSpecDirectories()) {
      if (!fs.existsSync(agentSpecsDir)) {
        continue;
      }
      const specs = this._findSpecFiles(agentSpecsDir);
      for (const spec of specs) {
        try {
          const content = fs.readFileSync(spec, 'utf-8');
          const parsed = YAML.parse(content);
          if (parsed?._metadata?.id === agentId || parsed?.id === agentId) {
            return spec;
          }
        } catch (_error) {
          // Ignore invalid spec files
        }
      }
    }
    return null;
  }

  private _agentSpecDirectories(): string[] {
    return [
      this._preferredAgentTeamsPath('agents'),
      path.join(this._legacyAgentTeamDir(), 'agents'),
    ];
  }

  private _readStructuredFile(filePath: string): unknown {
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (path.extname(filePath).toLowerCase() === '.json') {
      return JSON.parse(raw);
    }
    return YAML.parse(raw);
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

    this._writeSelectedAgentSpecs(targetDir, selected);
    this._removeUnselectedAgentSpecs(targetDir, selected);
  }

  private _writeSelectedAgentSpecs(targetDir: string, selected: Set<string>): void {
    for (const agentId of selected) {
      const specPath = this._findAgentSpecByAgentId(agentId);
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
  }

  private _removeUnselectedAgentSpecs(targetDir: string, selected: Set<string>): void {
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

  private _getTeamsContainingAgent(agentId: string): string[] {
    const teamIds = new Set<string>();
    for (const team of this._loadTeams([])) {
      teamIds.add(team.id);
    }
    const catalogTeams = this.catalogManager.getCatalogSnapshot().teams ?? {};
    for (const teamId of Object.keys(catalogTeams)) {
      if (teamId.trim()) {
        teamIds.add(teamId);
      }
    }

    const assignedTeamIds: string[] = [];
    for (const teamId of teamIds) {
      const enabledAgentIds = this._getTeamEnabledAgentIds(teamId);
      if (enabledAgentIds === null || enabledAgentIds.has(agentId)) {
        assignedTeamIds.push(teamId);
      }
    }

    return assignedTeamIds.sort((a, b) => a.localeCompare(b));
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
        agentIds: Array.isArray(parsed?.agents?.enable)
          ? (parsed.agents.enable as unknown[]).filter((x): x is string => typeof x === 'string')
          : undefined,
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

  private async _sendCatalogSkills(): Promise<void> {
    try {
      const skills = this.skillsCatalog
        .getInstalledSkillsWithStatus(this.workspaceRoot)
        .map((s) => ({ ...s, tags: Array.isArray(s.tags) ? s.tags : [] }));
      this._panel.webview.postMessage({ type: 'catalogSkills', skills });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'catalogSkills',
        skills: [],
        error: String(error),
      });
    }
  }

  private async _installCatalogSkill(message: any): Promise<void> {
    const entry = {
      id: typeof message.skillId === 'string' ? message.skillId : '',
      title: typeof message.title === 'string' ? message.title : (message.skillId ?? ''),
      description: typeof message.description === 'string' ? message.description : undefined,
      source: {
        type: (message.sourceType === 'git' ? 'git' : 'skills-lc') as 'git' | 'skills-lc',
        ref: typeof message.ref === 'string' ? message.ref : '',
      },
      version: typeof message.version === 'string' ? message.version : '0.0.0',
      tags: Array.isArray(message.tags) ? message.tags : [],
    };

    if (!entry.id || !entry.source.ref) {
      this._panel.webview.postMessage({
        type: 'installCatalogSkillResult',
        success: false,
        skillId: entry.id,
        error: 'Missing required fields: skillId or ref',
      });
      return;
    }

    try {
      await this.skillsCatalog.installSkill(entry, this.workspaceRoot);
      await this.catalogManager.captureWorkspaceToCatalog(this.workspaceRoot, { notify: false });
      this._panel.webview.postMessage({
        type: 'installCatalogSkillResult',
        success: true,
        skillId: entry.id,
      });
      // Refresh catalog skills for the wizard
      await this._sendCatalogSkills();
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'installCatalogSkillResult',
        success: false,
        skillId: entry.id,
        error: String(error),
      });
    }
  }

  private async _sendSkillsCatalog(): Promise<void> {
    try {
      const bindings = this._readProjectBindings([]);
      const installedIds = new Set(bindings.skillIds);
      const skillAssignments = this._getSkillAssignmentsByAgent();
      const skills = this.skillsCatalog
        .getInstalledSkillsWithStatus(this.workspaceRoot)
        .map((entry) => {
          const assignedAgentIds = skillAssignments.get(entry.id) ?? [];
          return {
            id: entry.id,
            name: entry.title || entry.id,
            description: entry.description || 'Skill from workspace catalog',
            category: undefined,
            tags: Array.isArray(entry.tags) ? entry.tags : [],
            version: entry.version,
            source: 'workspace' as const,
            installed: installedIds.has(entry.id),
            canDelete: assignedAgentIds.length === 0,
            deleteDisabledReason:
              assignedAgentIds.length > 0
                ? `Assigned to agent(s): ${assignedAgentIds.join(', ')}`
                : undefined,
            assignedAgentIds,
          } satisfies BrowserSkill;
        })
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

  private async _deleteSkill(rawSkillId: unknown): Promise<void> {
    const skillId = typeof rawSkillId === 'string' ? rawSkillId.trim() : '';
    if (!skillId) {
      return;
    }

    const assignedAgentIds = this._getSkillAssignmentsByAgent().get(skillId) ?? [];
    if (assignedAgentIds.length > 0) {
      const reason = `Cannot delete "${skillId}" because it is assigned to agent(s): ${assignedAgentIds.join(', ')}.`;
      vscode.window.showWarningMessage(reason);
      this._panel.webview.postMessage({
        type: 'deleteSkillResult',
        success: false,
        skillId,
        error: reason,
      });
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `Delete skill "${skillId}"?`,
      'Delete',
      'Cancel',
    );
    if (confirm !== 'Delete') {
      return;
    }

    try {
      this.skillsCatalog.removeSkillContent(skillId, this.workspaceRoot);
      this._removeLegacySkillContent(skillId);

      this.catalogManager.removeSkill(skillId);

      const bindings = this._readProjectBindings([]);
      if (bindings.skillIds.includes(skillId)) {
        this._writeProjectBindings({
          ...bindings,
          skillIds: bindings.skillIds.filter((id) => id !== skillId),
        });
      }

      await this._sendSkillsCatalog();
      this._pushStats(undefined, true);
      vscode.window.showInformationMessage(`✅ Deleted skill "${skillId}"`);
      this._panel.webview.postMessage({
        type: 'deleteSkillResult',
        success: true,
        skillId,
      });
    } catch (error) {
      const errorMessage = `Failed to delete skill: ${String(error)}`;
      vscode.window.showErrorMessage(errorMessage);
      this._panel.webview.postMessage({
        type: 'deleteSkillResult',
        success: false,
        skillId,
        error: errorMessage,
      });
    }
  }

  private _removeLegacySkillContent(skillId: string): void {
    const legacySkillsRoot = path.join(this.workspaceRoot, '.agent-team', 'skills');
    if (!fs.existsSync(legacySkillsRoot)) {
      return;
    }

    const directById = path.join(legacySkillsRoot, skillId);
    if (fs.existsSync(directById)) {
      fs.rmSync(directById, { recursive: true, force: true });
    }

    for (const entry of fs.readdirSync(legacySkillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const metadataPath = path.join(legacySkillsRoot, entry.name, 'metadata.yml');
      if (!fs.existsSync(metadataPath)) continue;
      try {
        const parsed = YAML.parse(fs.readFileSync(metadataPath, 'utf-8')) as
          | { id?: unknown }
          | undefined;
        if (typeof parsed?.id === 'string' && parsed.id.trim() === skillId) {
          fs.rmSync(path.join(legacySkillsRoot, entry.name), { recursive: true, force: true });
          return;
        }
      } catch (_error) {
        // Ignore malformed metadata files.
      }
    }
  }

  private _getSkillAssignmentsByAgent(): Map<string, string[]> {
    const assigned = new Map<string, Set<string>>();

    for (const agentSpecsDir of this._agentSpecDirectories()) {
      if (!fs.existsSync(agentSpecsDir)) continue;
      const specs = this._findSpecFiles(agentSpecsDir);
      for (const spec of specs) {
        this._recordSkillAssignmentsForSpec(spec, assigned);
      }
    }

    return new Map(
      [...assigned.entries()].map(([skillId, agentIds]) => [skillId, [...agentIds].sort()]),
    );
  }

  private _recordSkillAssignmentsForSpec(spec: string, assigned: Map<string, Set<string>>): void {
    try {
      const content = fs.readFileSync(spec, 'utf-8');
      const parsed = YAML.parse(content) as Record<string, any>;
      const agentIdRaw = parsed?._metadata?.id;
      const agentId =
        typeof agentIdRaw === 'string' && agentIdRaw.trim()
          ? agentIdRaw.trim()
          : path.basename(spec, path.extname(spec));

      const skillUses = parsed?._metadata?.skills?.uses;
      if (!Array.isArray(skillUses)) return;

      for (const use of skillUses) {
        const skillId =
          use && typeof use === 'object' && typeof (use as { id?: unknown }).id === 'string'
            ? ((use as { id: string }).id || '').trim()
            : '';
        if (!skillId) continue;

        const agents = assigned.get(skillId) ?? new Set<string>();
        agents.add(agentId);
        assigned.set(skillId, agents);
      }
    } catch (_error) {
      // Ignore invalid skill metadata on agent specs.
    }
  }

  private static httpsPostJson(
    host: string,
    urlPath: string,
    body: Record<string, unknown>,
    timeoutMs = 10000,
  ): void {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: host,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        res.resume(); // discard response body
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy());
    req.on('error', () => {
      // fire-and-forget — ignore errors silently
    });
    req.write(payload);
    req.end();
  }

  private static httpsGetJson(
    host: string,
    urlPath: string,
    headers: Record<string, string> = {},
    timeoutMs = 15000,
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const req = https.get(
        { hostname: host, path: urlPath, headers: { Accept: 'application/json', ...headers } },
        (res) => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 400) {
            res.resume();
            reject(new Error(`HTTP ${res.statusCode ?? 'unknown'}`));
            return;
          }
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(body) as Record<string, unknown>);
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          });
        },
      );
      req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timed out')));
      req.on('error', reject);
    });
  }

  private static mapSkillItem(item: Record<string, unknown>) {
    return {
      id: String(item.skillId ?? item.id ?? ''),
      title: String(item.name ?? item.skillId ?? ''),
      description: typeof item.description === 'string' ? item.description : undefined,
      tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
      // v1 API uses `stars`; public API uses `installs`
      stars:
        typeof item.stars === 'number'
          ? item.stars
          : typeof item.installs === 'number'
            ? item.installs
            : undefined,
      // v1 API provides githubUrl directly; public API derives it from `source`
      githubUrl:
        typeof item.githubUrl === 'string'
          ? item.githubUrl
          : typeof item.source === 'string'
            ? `https://github.com/${item.source}`
            : undefined,
      source: typeof item.source === 'string' ? item.source : undefined,
      version: typeof item.version === 'string' ? item.version : undefined,
    };
  }

  private async _searchCommunitySkillsAuthenticated(
    query: string,
    page: number,
    limit: number,
    sortBy: string,
    apiKey: string,
  ): Promise<{ skills: ReturnType<typeof DashboardPanel.mapSkillItem>[]; total: number }> {
    const urlPath =
      `/api/v1/skills/search?q=${encodeURIComponent(query)}` +
      `&page=${page}&limit=${limit}&sortBy=${sortBy}`;
    const json = await DashboardPanel.httpsGetJson('skills.lc', urlPath, {
      Authorization: `Bearer ${apiKey}`,
    });
    const dataObj =
      typeof json.data === 'object' && json.data !== null
        ? (json.data as Record<string, unknown>)
        : {};
    const raw = Array.isArray(dataObj.skills) ? (dataObj.skills as Record<string, unknown>[]) : [];
    const skills = raw.map(DashboardPanel.mapSkillItem).filter((s) => s.id);
    const pagination =
      typeof dataObj.pagination === 'object' && dataObj.pagination !== null
        ? (dataObj.pagination as Record<string, unknown>)
        : {};
    const total = typeof pagination.total === 'number' ? pagination.total : skills.length;
    return { skills, total };
  }

  private async _searchCommunitySkillsPublic(
    query: string,
    page: number,
    limit: number,
    sortBy: string,
  ): Promise<{ skills: ReturnType<typeof DashboardPanel.mapSkillItem>[]; total: number }> {
    // Public /api/skills ignores `q` — fetch full catalog and filter client-side
    const json = await DashboardPanel.httpsGetJson('skills.lc', '/api/skills?limit=500');
    const raw = Array.isArray(json.data) ? (json.data as Record<string, unknown>[]) : [];
    const allSkills = raw.map(DashboardPanel.mapSkillItem).filter((s) => s.id);

    const normalized = query.toLowerCase();
    const filtered = allSkills.filter(
      (s) =>
        s.id.toLowerCase().includes(normalized) ||
        s.title.toLowerCase().includes(normalized) ||
        (s.description?.toLowerCase().includes(normalized) ?? false) ||
        s.tags.some((t) => t.toLowerCase().includes(normalized)) ||
        (s.source?.toLowerCase().includes(normalized) ?? false),
    );
    if (sortBy === 'stars') filtered.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));

    const total = filtered.length;
    const start = (page - 1) * limit;
    return { skills: filtered.slice(start, start + limit), total };
  }

  private async _searchCommunitySkills(
    rawQuery: unknown,
    page = 1,
    limit = 20,
    sortBy: 'stars' | 'recent' = 'stars',
  ): Promise<void> {
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
    if (!query) {
      this._panel.webview.postMessage({
        type: 'communitySkillsResult',
        query: '',
        skills: [],
        total: 0,
      });
      return;
    }
    const apiKey = vscode.workspace
      .getConfiguration('agentTeams')
      .get<string>('skillsLcApiKey', '');
    try {
      const { skills, total } = apiKey
        ? await this._searchCommunitySkillsAuthenticated(query, page, limit, sortBy, apiKey)
        : await this._searchCommunitySkillsPublic(query, page, limit, sortBy);
      this._panel.webview.postMessage({
        type: 'communitySkillsResult',
        query,
        skills,
        total,
        page,
      });
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'communitySkillsResult',
        query,
        skills: [],
        total: 0,
        error: String(error),
      });
    }
  }

  private async _installCommunitySkill(message: Record<string, unknown>): Promise<void> {
    const skillId = typeof message.skillId === 'string' ? message.skillId.trim() : '';
    if (!skillId) return;

    try {
      const githubUrl = typeof message.githubUrl === 'string' ? message.githubUrl : undefined;
      const hasGitHubSource = Boolean(githubUrl?.startsWith('https://github.com/'));
      const gitRef = hasGitHubSource
        ? githubUrl?.replace('https://github.com/', '').replace(/\/$/, '')
        : '';
      const source =
        hasGitHubSource && gitRef
          ? {
              type: 'git' as const,
              ref: gitRef,
            }
          : { type: 'skills-lc' as const, ref: skillId };
      const entry = {
        id: skillId,
        title: typeof message.title === 'string' ? message.title : skillId,
        description: typeof message.description === 'string' ? message.description : undefined,
        source,
        version: typeof message.version === 'string' ? message.version : '1.0.0',
        tags: Array.isArray(message.tags) ? (message.tags as string[]) : [],
      };

      await this.skillsCatalog.installSkill(entry, this.workspaceRoot);

      // Fire-and-forget telemetry — no auth required per skills.lc API docs
      DashboardPanel.httpsPostJson('skills.lc', '/api/install', { skillId });

      this._panel.webview.postMessage({
        type: 'communitySkillImportResult',
        skillId,
        success: true,
      });
      await this._sendCatalogSkills();
    } catch (error) {
      this._panel.webview.postMessage({
        type: 'communitySkillImportResult',
        skillId,
        success: false,
        error: String(error),
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

  private _readSpecField(parsed: Record<string, any>, key: string): string | undefined {
    const direct = parsed?.[key];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
    const nested = parsed?._metadata?.[key];
    return typeof nested === 'string' && nested.trim() ? nested.trim() : undefined;
  }

  private _readSpecStringArray(parsed: Record<string, any>, key: string): string[] {
    const raw = Array.isArray(parsed?.[key]) ? parsed[key] : parsed?._metadata?.[key];
    return Array.isArray(raw)
      ? (raw as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];
  }

  private _parseAgentFromSpec(file: string): DashboardAgent {
    const content = fs.readFileSync(file, 'utf-8');
    const parsed = YAML.parse(content);
    const fileStat = fs.statSync(file);
    const role = parsed?._metadata?.role ?? parsed?.role;
    const description = this._readSpecField(parsed, 'description');
    const intents = this._readSpecStringArray(parsed, 'intents');
    const targets = this._readSpecStringArray(parsed, 'targets');

    return {
      id: parsed?._metadata?.id || parsed?.id || path.basename(file, path.extname(file)),
      name: parsed?.name || 'Unknown',
      role: role === 'router' || role === 'orchestrator' ? role : 'worker',
      teamId: parsed?._metadata?.team_id ?? null,
      scope: 'team',
      lastModified: this._formatRelativeTime(fileStat.mtime),
      targets: targets.length ? targets : undefined,
      description,
      intents: intents.length ? intents : undefined,
    };
  }

  private _loadAgents(warnings: string[]): {
    agentYamlCount: number;
    validAgentYamlCount: number;
    agents: DashboardAgent[];
  } {
    // Read from .agent-teams/agents/ — these are the YMLs written by
    // _syncActiveTeamAgentSpecs when a team is activated, so they always
    // represent the agents that are currently active in the project.
    const agentsDir = this._preferredAgentTeamsPath('agents');
    if (!fs.existsSync(agentsDir)) {
      return { agentYamlCount: 0, validAgentYamlCount: 0, agents: [] };
    }

    try {
      const files = this._findSpecFiles(agentsDir);
      let validAgentYamlCount = 0;
      const agents: DashboardAgent[] = [];

      for (const file of files) {
        try {
          agents.push(this._parseAgentFromSpec(file));
          validAgentYamlCount++;
        } catch (error) {
          warnings.push(`Invalid agent file: ${path.basename(file)} (${String(error)})`);
        }
      }

      return { agentYamlCount: files.length, validAgentYamlCount, agents };
    } catch (error) {
      warnings.push(`Failed to load agents: ${String(error)}`);
      return { agentYamlCount: 0, validAgentYamlCount: 0, agents: [] };
    }
  }

  private _countProjectSkills(warnings: string[]): number {
    const skillsDir = this._preferredAgentTeamsPath('skills');
    if (!fs.existsSync(skillsDir)) {
      return 0;
    }

    try {
      return fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .filter((entry) => {
          const base = path.join(skillsDir, entry.name);
          return (
            fs.existsSync(path.join(base, 'SKILL.md')) ||
            fs.existsSync(path.join(base, 'metadata.yml'))
          );
        }).length;
    } catch (error) {
      warnings.push(`Failed to read project skills: ${String(error)}`);
      return 0;
    }
  }

  private _resolveSyncTargetDirs(): string[] {
    const profile = this._readExistingProfileYaml();
    const targets =
      Array.isArray(profile?.sync_targets) && profile.sync_targets.length > 0
        ? profile.sync_targets
        : ['claude_code', 'github_copilot'];
    const targetDirs: string[] = [];
    for (const target of targets) {
      if (target === 'github_copilot') {
        targetDirs.push(path.join(this.workspaceRoot, '.github', 'agents'));
      } else if (target === 'claude_code') {
        targetDirs.push(path.join(this.workspaceRoot, '.claude', 'agents'));
      }
    }
    return targetDirs;
  }

  private _getLatestSyncTime(targetDirs: string[]): { latestTime: number; syncedFiles: number } {
    let latestTime = 0;
    let syncedFiles = 0;

    for (const dir of targetDirs) {
      if (!fs.existsSync(dir)) {
        continue;
      }
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.agent.md') || f.endsWith('.md'));
      syncedFiles += files.length;
      for (const file of files) {
        const stats = fs.statSync(path.join(dir, file));
        if (stats.mtime.getTime() > latestTime) {
          latestTime = stats.mtime.getTime();
        }
      }
    }

    return { latestTime, syncedFiles };
  }

  private _getSyncStatus(): { syncStatus: DashboardStats['syncStatus']; syncTime: string } {
    if (this._lastSyncError) {
      return { syncStatus: 'ERROR', syncTime: 'Failed' };
    }

    try {
      const targetDirs = this._resolveSyncTargetDirs();
      const { latestTime, syncedFiles } = this._getLatestSyncTime(targetDirs);

      if (syncedFiles === 0 || latestTime === 0) {
        return { syncStatus: 'NOT_SYNCED', syncTime: 'Never' };
      }

      return { syncStatus: 'SUCCESS', syncTime: this._formatRelativeTime(new Date(latestTime)) };
    } catch (_error) {
      return { syncStatus: 'WARNING', syncTime: 'Unknown' };
    }
  }

  private _getSyncNeeded(): {
    syncNeeded: boolean;
    pendingChanges?: DashboardStats['pendingChanges'];
  } {
    if (!this._dryRunCache) {
      return { syncNeeded: false };
    }

    const { created, updated, deleted } = this._dryRunCache.summary;
    const hasPending = created > 0 || updated > 0 || deleted > 0;

    const items = hasPending
      ? this._dryRunCache.changes
          .filter((c) => c.action === 'create' || c.action === 'update' || c.action === 'delete')
          .map((c) => ({ id: c.agentId, action: c.action as 'create' | 'update' | 'delete' }))
      : [];

    return {
      syncNeeded: hasPending,
      pendingChanges: hasPending ? { ...this._dryRunCache.summary, items } : undefined,
    };
  }

  private _extractValidRole(value: unknown): AgentRole | undefined {
    if (value === 'worker' || value === 'router' || value === 'orchestrator') {
      return value;
    }
    return undefined;
  }

  private _parseCatalogEntryData(entry: unknown): Record<string, unknown> | undefined {
    if (!entry || typeof entry !== 'object') return undefined;
    const e = entry as Record<string, unknown>;
    if ('data' in e) return e.data as Record<string, unknown> | undefined;
    return undefined;
  }

  private _extractCatalogMeta(
    data: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
    if (!data?._metadata || typeof data._metadata !== 'object') return undefined;
    return data._metadata as Record<string, unknown>;
  }

  private _catalogSummaryFromMap(map: Record<string, unknown>): CatalogEntitySummary[] {
    const entities = Object.entries(map).map(([id, entry]) => {
      const data = this._parseCatalogEntryData(entry);
      const meta = this._extractCatalogMeta(data);
      const role = this._extractValidRole(meta?.role ?? data?.role);
      const name =
        data && typeof data.name === 'string' && data.name.trim()
          ? data.name
          : data && typeof data.title === 'string' && data.title.trim()
            ? data.title
            : id;
      const description =
        typeof data?.description === 'string' && data.description.trim()
          ? data.description
          : undefined;
      const intentsRaw = meta?.intents ?? data?.intents;
      const intents = Array.isArray(intentsRaw)
        ? intentsRaw.filter((i): i is string => typeof i === 'string')
        : undefined;
      return { id, name, role, description, intents };
    });
    return entities.sort((a, b) => a.name.localeCompare(b.name));
  }

  private _readWorkspaceAgentSummaries(): CatalogEntitySummary[] {
    const specFiles = this._agentSpecDirectories().flatMap((dir) => this._findSpecFiles(dir));
    const summaries = new Map<string, CatalogEntitySummary>();

    for (const specFile of specFiles) {
      try {
        const raw = fs.readFileSync(specFile, 'utf-8');
        const parsed = YAML.parse(raw);
        // Support both old (_metadata.id) and new (root id) spec formats
        const id =
          (typeof parsed?._metadata?.id === 'string' && parsed._metadata.id.trim()
            ? parsed._metadata.id
            : null) ??
          (typeof parsed?.id === 'string' && parsed.id.trim() ? parsed.id : null) ??
          path.basename(specFile, path.extname(specFile));
        const name = typeof parsed?.name === 'string' && parsed.name.trim() ? parsed.name : id;
        const role = this._extractValidRole(parsed?._metadata?.role ?? parsed?.role);
        summaries.set(id, { id, name, role });
      } catch (_error) {
        // Ignore malformed agent YAML files.
      }
    }

    return [...summaries.values()];
  }

  private _buildCatalogTeamsByAgent(catalog: CatalogData): Map<string, string[]> {
    const teamsByAgent = new Map<string, string[]>();
    for (const [teamId, entry] of Object.entries(catalog.teams)) {
      const data = this._parseCatalogEntryData(entry);
      if (!data) continue;
      const agentIds = this._extractTeamAgents(data);
      if (!agentIds) continue;
      for (const agentId of agentIds) {
        const existing = teamsByAgent.get(agentId);
        if (existing) existing.push(teamId);
        else teamsByAgent.set(agentId, [teamId]);
      }
    }
    return teamsByAgent;
  }

  private _loadGlobalCatalogSummary(snapshot?: CatalogData): GlobalCatalogSummary {
    const catalog: CatalogData = snapshot ?? this.catalogManager.getCatalogSnapshot();
    const agentSummaries = this._catalogSummaryFromMap(catalog.agents);
    const teamsByAgent = this._buildCatalogTeamsByAgent(catalog);
    const enrichedAgents = agentSummaries.map((a) =>
      teamsByAgent.has(a.id) ? { ...a, teamIds: teamsByAgent.get(a.id) } : a,
    );
    return {
      teams: this._catalogSummaryFromMap(catalog.teams),
      agents: enrichedAgents,
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
        manageAgents: 'Requiere Profile Config',
        manageSkills: 'Requiere Profile Config',
        syncAgents: 'Requiere Profile Config',
      };
    }

    if (teamsCount === 0) {
      return {
        createAgent: 'Requiere team activo',
        browseSkills: 'Requiere team activo',
        manageAgents: 'Requiere team activo',
        manageSkills: 'Requiere team activo',
        syncAgents: 'Requiere team activo',
      };
    }

    if (!activeTeamId) {
      return {
        createAgent: 'Selecciona un equipo para continuar',
        browseSkills: 'Selecciona un equipo para continuar',
        manageAgents: 'Selecciona un equipo para continuar',
        manageSkills: 'Selecciona un equipo para continuar',
        syncAgents: 'Selecciona un equipo para continuar',
      };
    }

    return {};
  }

  private _extractAgentId(obj: Record<string, unknown>, filePath: string): string {
    const meta = obj._metadata as Record<string, unknown> | undefined;
    return (
      (typeof meta?.id === 'string' && meta.id.trim() ? meta.id : null) ??
      (typeof obj.id === 'string' && obj.id.trim() ? obj.id : null) ??
      path.basename(filePath, path.extname(filePath))
    );
  }

  private _validateAgentOrphan(parsed: unknown): string[] {
    if (!parsed || typeof parsed !== 'object') return ['not a valid YAML object'];
    const obj = parsed as Record<string, unknown>;
    const errors: string[] = [];
    if (!obj.name || typeof obj.name !== 'string') errors.push('missing required field: name');
    // Support both old (_metadata.role) and new (root role) spec formats
    const meta = obj._metadata as Record<string, unknown> | undefined;
    const role = (obj.role as string | undefined) ?? (meta?.role as string | undefined);
    if (!role || !['worker', 'router', 'orchestrator'].includes(role))
      errors.push('missing or invalid field: role (must be worker, router, or orchestrator)');
    if (!obj.description || typeof obj.description !== 'string')
      errors.push('missing required field: description');
    return errors;
  }

  private _validateTeamOrphan(parsed: unknown): string[] {
    if (!parsed || typeof parsed !== 'object') return ['not a valid YAML object'];
    const obj = parsed as Record<string, unknown>;
    const errors: string[] = [];
    if (!obj.id || typeof obj.id !== 'string') errors.push('missing required field: id');
    if (!obj.name || typeof obj.name !== 'string') errors.push('missing required field: name');
    return errors;
  }

  private _detectOrphanAgents(catalog: CatalogData['agents']): {
    validOrphans: Array<{ type: 'agents'; id: string; data: unknown }>;
    invalid: InvalidOrphanEntry[];
  } {
    const validOrphans: Array<{ type: 'agents'; id: string; data: unknown }> = [];
    const invalid: InvalidOrphanEntry[] = [];
    const specFiles = this._agentSpecDirectories().flatMap((dir) => this._findSpecFiles(dir));
    for (const specFile of specFiles) {
      try {
        const parsed = YAML.parse(fs.readFileSync(specFile, 'utf-8')) as Record<
          string,
          unknown
        > | null;
        const obj = parsed ?? {};
        const id = this._extractAgentId(obj, specFile);
        if (catalog[id]) continue;
        const errors = this._validateAgentOrphan(parsed);
        if (errors.length > 0) {
          invalid.push({ id, name: typeof obj.name === 'string' ? obj.name : id, errors });
        } else {
          validOrphans.push({ type: 'agents', id, data: parsed });
        }
      } catch {
        // skip malformed files
      }
    }
    return { validOrphans, invalid };
  }

  private _checkTeamFileOrphan(
    filePath: string,
    file: string,
    catalog: CatalogData['teams'],
  ):
    | { valid: true; id: string; data: unknown }
    | { valid: false; entry: InvalidOrphanEntry }
    | null {
    try {
      const parsed = YAML.parse(fs.readFileSync(filePath, 'utf-8')) as Record<
        string,
        unknown
      > | null;
      const obj = parsed ?? {};
      const id =
        typeof obj.id === 'string' && obj.id.trim()
          ? obj.id
          : path.basename(file, path.extname(file));
      if (catalog[id]) return null;
      const errors = this._validateTeamOrphan(parsed);
      if (errors.length > 0) {
        return {
          valid: false,
          entry: { id, name: typeof obj.name === 'string' ? obj.name : id, errors },
        };
      }
      return { valid: true, id, data: parsed };
    } catch {
      return null;
    }
  }

  private _detectOrphanTeams(catalog: CatalogData['teams']): {
    validOrphans: Array<{ type: 'teams'; id: string; data: unknown }>;
    invalid: InvalidOrphanEntry[];
  } {
    const validOrphans: Array<{ type: 'teams'; id: string; data: unknown }> = [];
    const invalid: InvalidOrphanEntry[] = [];
    for (const teamsDir of this._teamDirectories()) {
      if (!fs.existsSync(teamsDir)) continue;
      try {
        const files = fs
          .readdirSync(teamsDir)
          .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
        for (const file of files) {
          const result = this._checkTeamFileOrphan(path.join(teamsDir, file), file, catalog);
          if (result === null) continue;
          if (result.valid) {
            validOrphans.push({ type: 'teams', id: result.id, data: result.data });
          } else {
            invalid.push(result.entry);
          }
        }
      } catch {
        // skip unreadable directory
      }
    }
    return { validOrphans, invalid };
  }

  private _detectOrphans(catalogSnapshot: CatalogData): {
    validOrphans: Array<{ type: 'agents' | 'teams'; id: string; data: unknown }>;
    invalidOrphanAgents: InvalidOrphanEntry[];
    invalidOrphanTeams: InvalidOrphanEntry[];
  } {
    const agents = this._detectOrphanAgents(catalogSnapshot.agents);
    const teams = this._detectOrphanTeams(catalogSnapshot.teams);
    return {
      validOrphans: [...agents.validOrphans, ...teams.validOrphans],
      invalidOrphanAgents: agents.invalid,
      invalidOrphanTeams: teams.invalid,
    };
  }

  private _getStats(): DashboardStats {
    const warnings: string[] = [];

    const profile = this._readProfileStatus(warnings);
    const teams = this._loadTeams(warnings);
    const activeTeamId = profile.hasProfile ? this._readActiveTeamId(teams, warnings) : null;
    const bindings = this._readProjectBindings(warnings);
    const catalogSnapshot = this.catalogManager.getCatalogSnapshot();
    const orphans = this._detectOrphans(catalogSnapshot);
    const globalCatalog = this._loadGlobalCatalogSummary(catalogSnapshot);
    const agentsData = this._loadAgents(warnings);
    const projectSkillsCount = this._countProjectSkills(warnings);
    const syncData = this._getSyncStatus();
    const syncNeeded = this._getSyncNeeded();

    // Filter disk agents to only those explicitly enabled by the active team, then
    // supplement with catalog-only entries for IDs not yet written to disk.
    // When enabledAgentIds is null the team uses enable:'all', so every disk agent qualifies.
    const enabledAgentIds = activeTeamId ? this._getTeamEnabledAgentIds(activeTeamId) : null;
    let visibleAgents: DashboardAgent[] = agentsData.agents;
    if (activeTeamId && enabledAgentIds !== null) {
      // Keep only disk agents whose IDs are listed in the team's enable set.
      const enabledOnDisk = agentsData.agents.filter((a) => enabledAgentIds.has(a.id));
      const foundOnDisk = new Set(enabledOnDisk.map((a) => a.id));
      const catalogFallbacks: DashboardAgent[] = globalCatalog.agents
        .filter((a) => enabledAgentIds.has(a.id) && !foundOnDisk.has(a.id))
        .map((a) => ({
          id: a.id,
          name: a.name,
          role: (a.role ?? 'worker') as AgentRole,
          teamId: activeTeamId,
          scope: 'team' as const,
          lastModified: '—',
        }));
      visibleAgents = [...enabledOnDisk, ...catalogFallbacks];
    }

    return {
      hasProfile: profile.hasProfile,
      profileStatus: profile.profileStatus,
      profileError: profile.profileError,
      // totalAgents reflects only the persisted catalog (source of truth),
      // so workspace-only entries or ID mismatches never inflate the count.
      totalAgents: Object.keys(catalogSnapshot.agents).length,
      totalTeams: Object.keys(catalogSnapshot.teams).length,
      agentYamlCount: agentsData.agentYamlCount,
      validAgentYamlCount: agentsData.validAgentYamlCount,
      projectSkillsCount,
      teamsCount: teams.length,
      teams,
      activeTeamId,
      teamContext:
        teams.length === 0 ? 'no_teams' : activeTeamId ? 'active_team' : 'no_active_team',
      syncStatus: syncData.syncStatus,
      syncTime: syncData.syncTime,
      syncError: this._lastSyncError || undefined,
      syncNeeded: syncNeeded.syncNeeded,
      pendingChanges: syncNeeded.pendingChanges,
      warnings,
      gatingReasons: this._getGatingReasons(profile.hasProfile, teams.length, activeTeamId),
      agents: activeTeamId ? visibleAgents : [],
      globalCatalog,
      bindings,
      engramInstalled: this._isEngramInstalled(),
      engramConfigured: this._isWorkspaceConfigured(),
      invalidOrphanAgents:
        orphans.invalidOrphanAgents.length > 0 ? orphans.invalidOrphanAgents : undefined,
      invalidOrphanTeams:
        orphans.invalidOrphanTeams.length > 0 ? orphans.invalidOrphanTeams : undefined,
      validOrphanAgents: this._orphanSummaries(orphans.validOrphans, 'agents'),
      validOrphanTeams: this._orphanSummaries(orphans.validOrphans, 'teams'),
      extensionVersion: this._extensionContext.extension.packageJSON.version as string,
    };
  }

  private _orphanSummaries(
    orphans: Array<{ type: 'agents' | 'teams'; id: string; data: unknown }>,
    kind: 'agents' | 'teams',
  ): OrphanEntry[] | undefined {
    const filtered = orphans.filter((o) => o.type === kind);
    if (filtered.length === 0) return undefined;
    return filtered.map((o) => {
      const obj = o.data as Record<string, unknown> | null;
      return {
        id: o.id,
        name: typeof obj?.name === 'string' ? obj.name : o.id,
        errors: [],
      };
    });
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

  private _isEngramInstalled(): boolean {
    try {
      execSync('engram -v', { stdio: 'ignore', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  private _isWorkspaceConfigured(): boolean {
    const mcpJsonPath = path.join(this.workspaceRoot, '.vscode', 'mcp.json');
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
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
    if (this._dryRunTimer) {
      clearTimeout(this._dryRunTimer);
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
