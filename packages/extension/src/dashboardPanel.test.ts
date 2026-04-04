/**
 * DashboardPanel unit tests — opencode detection & models, _getSyncNeeded,
 * _getStats (R-002), _getWorkspaceStateSignature (R-003)
 *
 * Tests are organized following the TDD RED→GREEN cycle for:
 * - Phase 3: _isOpencodeInstalled() and _getOpencodeModels()
 * - sync-needed-from-unsynced-agents: _getSyncNeeded() fallback logic
 * - R-002: _getStats() passes agents to _getSyncNeeded()
 * - R-003: _getWorkspaceStateSignature() includes outputDirs: segment
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock child_process before importing DashboardPanel (which imports execSync at module load)
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import * as childProcess from 'node:child_process';
import { DashboardPanel } from './dashboardPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Bypass the private constructor by using Object.create on the prototype.
 * The methods under test (_isOpencodeInstalled, _getOpencodeModels) only call
 * execSync — they don't access `this` state set up by the constructor.
 */
function makePanel(): any {
  const panel = Object.create((DashboardPanel as any).prototype);
  panel._optimisticSyncNeeded = false;
  return panel;
}

/**
 * Build a minimal DashboardAgent-like object for use in _getSyncNeeded tests.
 */
function makeAgent(id: string, unsynced: boolean): any {
  return { id, name: id, role: 'worker', lastModified: '-', unsynced };
}

// ─── Phase 3.1: _isOpencodeInstalled ─────────────────────────────────────────

describe('DashboardPanel — _isOpencodeInstalled', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when opencode --version succeeds', () => {
    vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from('opencode 0.1.0'));
    const panel = makePanel();
    expect(panel._isOpencodeInstalled()).toBe(true);
  });

  it('returns false when opencode --version throws', () => {
    vi.mocked(childProcess.execSync).mockImplementation(() => {
      throw new Error('not found');
    });
    const panel = makePanel();
    expect(panel._isOpencodeInstalled()).toBe(false);
  });
});

// ─── Phase 3.1: _getOpencodeModels ───────────────────────────────────────────

describe('DashboardPanel — _getOpencodeModels', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns [] when execSync throws', () => {
    vi.mocked(childProcess.execSync).mockImplementation(() => {
      throw new Error('fail');
    });
    const panel = makePanel();
    expect(panel._getOpencodeModels()).toEqual([]);
  });

  it('returns parsed lines when execSync succeeds', () => {
    vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from('claude-sonnet\ngpt-4o\n'));
    const panel = makePanel();
    expect(panel._getOpencodeModels()).toEqual(['claude-sonnet', 'gpt-4o']);
  });
});

// ─── sync-needed-from-unsynced-agents: _getSyncNeeded ────────────────────────

describe('DashboardPanel — _getSyncNeeded', () => {
  // Task 1.1: null cache + at least one unsynced agent → { syncNeeded: true }
  it('returns { syncNeeded: true } when cache is null and at least one agent is unsynced', () => {
    const panel = makePanel();
    panel._dryRunCache = null;
    const agents = [makeAgent('a1', false), makeAgent('a2', true)];
    expect(panel._getSyncNeeded(agents)).toEqual({ syncNeeded: true });
  });

  // Task 1.2: null cache + all agents synced → { syncNeeded: false }
  it('returns { syncNeeded: false } when cache is null and all agents are synced', () => {
    const panel = makePanel();
    panel._dryRunCache = null;
    const agents = [makeAgent('a1', false), makeAgent('a2', false)];
    expect(panel._getSyncNeeded(agents)).toEqual({ syncNeeded: false });
  });

  // Task 1.3: null cache + empty agents array → { syncNeeded: false }
  it('returns { syncNeeded: false } when cache is null and agents array is empty', () => {
    const panel = makePanel();
    panel._dryRunCache = null;
    expect(panel._getSyncNeeded([])).toEqual({ syncNeeded: false });
  });

  // Task 1.4: non-null cache with pending changes → result from cache (agents param ignored)
  it('uses cache when _dryRunCache is populated, ignoring agents param', () => {
    const panel = makePanel();
    panel._dryRunCache = {
      summary: { created: 1, updated: 0, deleted: 0 },
      changes: [{ action: 'create', agentId: 'agent-x' }],
    };
    // Even though no agents are unsynced, the cache says syncNeeded: true
    const agents = [makeAgent('a1', false)];
    const result = panel._getSyncNeeded(agents);
    expect(result.syncNeeded).toBe(true);
    expect(result.pendingChanges).toBeDefined();
    expect(result.pendingChanges?.items).toHaveLength(1);
  });

  // Triangulation: non-null cache with zero pending changes → syncNeeded: false (cache wins)
  it('returns { syncNeeded: true } when cache shows no pending changes but there are unsynced agents', () => {
    const panel = makePanel();
    panel._dryRunCache = {
      summary: { created: 0, updated: 0, deleted: 0 },
      changes: [],
    };
    const agents = [makeAgent('a1', true)];
    const result = panel._getSyncNeeded(agents);
    expect(result.syncNeeded).toBe(true);
    expect(result.pendingChanges).toBeUndefined();
  });

  it('returns { syncNeeded: false } when cache shows no pending changes and all agents are synced', () => {
    const panel = makePanel();
    panel._dryRunCache = {
      summary: { created: 0, updated: 0, deleted: 0 },
      changes: [],
    };
    const agents = [makeAgent('a1', false), makeAgent('a2', false)];
    const result = panel._getSyncNeeded(agents);
    expect(result.syncNeeded).toBe(false);
    expect(result.pendingChanges).toBeUndefined();
  });

  // Test C — dry-run error scenario (WARNING 3): after a dry-run error
  // _dryRunCache is null and the agents array reflects unsynced state.
  it('returns { syncNeeded: true } after dry-run error (cache null, one unsynced agent)', () => {
    const panel = makePanel();
    // Simulate post-error state: cache was cleared on dry-run failure
    panel._dryRunCache = null;
    const agents = [makeAgent('err-agent', true)];
    const result = panel._getSyncNeeded(agents);
    expect(result.syncNeeded).toBe(true);
    // No pendingChanges when falling back to unsynced-flag scan
    expect(result.pendingChanges).toBeUndefined();
  });
});

// ─── R-002: _getStats passes agents to _getSyncNeeded ────────────────────────

describe('DashboardPanel — _getStats syncNeeded integration (R-002)', () => {
  it('returns syncNeeded: true when at least one agent is unsynced', () => {
    const panel = makePanel();

    // No dry-run cache → falls back to unsynced-flag path
    panel._dryRunCache = null;

    // Stub every dependency _getStats calls so we don't need the real filesystem
    panel._dryRunError = null;
    panel._lastSyncError = null;
    panel._readProfileStatus = () => ({
      hasProfile: true,
      profileStatus: 'ok',
      profileError: undefined,
    });
    panel._loadTeams = () => [];
    panel._readActiveTeamId = () => 'team-a';
    panel._readProjectBindings = () => ({ teamId: 'team-a' });
    panel.catalogManager = {
      getCatalogSnapshot: () => ({ agents: {}, teams: {} }),
    };
    panel._detectOrphans = () => ({
      invalidOrphanAgents: [],
      invalidOrphanTeams: [],
      validOrphans: [],
    });
    panel._loadGlobalCatalogSummary = () => ({ agents: [], teams: [] });
    // Return one unsynced agent
    panel._loadAgents = () => ({
      agents: [makeAgent('unsynced-agent', true)],
      agentYamlCount: 1,
      validAgentYamlCount: 1,
    });
    panel._countProjectSkills = () => 0;
    panel._getSyncStatus = () => ({ syncStatus: 'IDLE', syncTime: null });
    panel._getTeamEnabledAgentIds = () => null;
    panel._getGatingReasons = () => ({});
    panel._isEngramInstalled = () => false;
    panel._isWorkspaceConfigured = () => false;
    panel._isOpencodeInstalled = () => false;
    panel._getOpencodeModels = () => [];
    panel._orphanSummaries = () => undefined;
    panel._extensionContext = { extension: { packageJSON: { version: '0.0.0' } } };
    panel._hasWorkspaceFiles = () => false;
    panel._getProjectMcpServers = () => [];
    panel._readExistingProfileYaml = () => undefined;

    const stats = panel._getStats();
    expect(stats.syncNeeded).toBe(true);
  });

  it('keeps syncNeeded: true when dry-run cache has zero pending but agent is unsynced', () => {
    const panel = makePanel();

    panel._dryRunCache = {
      summary: { total: 0, created: 0, updated: 0, skipped: 0, deleted: 0 },
      changes: [],
    };

    panel._dryRunError = null;
    panel._lastSyncError = null;
    panel._readProfileStatus = () => ({
      hasProfile: true,
      profileStatus: 'ok',
      profileError: undefined,
    });
    panel._loadTeams = () => [];
    panel._readActiveTeamId = () => 'team-a';
    panel._readProjectBindings = () => ({ teamId: 'team-a' });
    panel.catalogManager = {
      getCatalogSnapshot: () => ({ agents: {}, teams: {} }),
    };
    panel._detectOrphans = () => ({
      invalidOrphanAgents: [],
      invalidOrphanTeams: [],
      validOrphans: [],
    });
    panel._loadGlobalCatalogSummary = () => ({ agents: [], teams: [] });
    panel._loadAgents = () => ({
      agents: [makeAgent('unsynced-agent', true)],
      agentYamlCount: 1,
      validAgentYamlCount: 1,
    });
    panel._countProjectSkills = () => 0;
    panel._getSyncStatus = () => ({ syncStatus: 'SUCCESS', syncTime: 'just now' });
    panel._getTeamEnabledAgentIds = () => null;
    panel._getGatingReasons = () => ({});
    panel._isEngramInstalled = () => false;
    panel._isWorkspaceConfigured = () => false;
    panel._isOpencodeInstalled = () => false;
    panel._getOpencodeModels = () => [];
    panel._orphanSummaries = () => undefined;
    panel._extensionContext = { extension: { packageJSON: { version: '0.0.0' } } };
    panel._hasWorkspaceFiles = () => false;
    panel._getProjectMcpServers = () => [];
    panel._readExistingProfileYaml = () => undefined;

    const stats = panel._getStats();
    expect(stats.syncNeeded).toBe(true);
    expect(stats.pendingChanges).toBeUndefined();
  });
});

describe('DashboardPanel — opencode_model persistence mapping', () => {
  it('maps opencode_model from spec into agentData message', () => {
    const panel = makePanel();
    panel._getTeamsContainingAgent = () => [];
    panel._getAvailableContextPacks = () => [];
    panel._ensureArray = (v: unknown, fallback: unknown[] = []) =>
      Array.isArray(v) ? v : fallback;
    panel._ensureObject = (v: unknown) => (v && typeof v === 'object' ? v : {});
    panel._normalizePathGlobs = () => [];

    const message = panel._toAgentDataMessage('agent-a', {
      id: 'agent-a',
      name: 'Agent A',
      role: 'worker',
      description: 'desc',
      opencode_model: 'claude-sonnet-4-5',
      targets: ['opencode'],
    });

    expect(message.opencode_model).toBe('claude-sonnet-4-5');
  });

  it('writes opencode_model and advanced claude fields into updated payload', () => {
    const panel = makePanel();
    const updated: Record<string, unknown> = {};

    panel._addOptionalAgentFieldsSpecial(updated, {
      opencode_model: 'gpt-4o',
      claude_effort: 'high',
      claude_permission_mode: 'acceptEdits',
      claude_disallowed_tools: ['Bash'],
      claude_background: true,
      claude_mcp_servers: [{ name: 'engram', type: 'stdio', command: 'uvx' }],
    });

    expect(updated.opencode_model).toBe('gpt-4o');
    expect(updated.claude_effort).toBe('high');
    expect(updated.claude_permission_mode).toBe('acceptEdits');
    expect(updated.claude_disallowed_tools).toEqual(['Bash']);
    expect(updated.claude_background).toBe(true);
    expect(updated.claude_mcp_servers).toEqual([{ name: 'engram', type: 'stdio', command: 'uvx' }]);
  });
});

// ─── R-003: _getWorkspaceStateSignature includes outputDirs ──────────────────

describe('DashboardPanel — _getWorkspaceStateSignature outputDirs (R-003)', () => {
  it('includes outputDirs: segment in the returned signature string', () => {
    const panel = makePanel();

    // Stub helpers so no real filesystem access is needed
    panel.workspaceRoot = '/fake/root';
    panel._resolveReadableAgentTeamsPath = (..._args: string[]) => '/fake/missing-path';
    panel._preferredAgentTeamsPath = (..._args: string[]) => '/fake/missing-path';
    panel._legacyAgentTeamDir = () => '/fake/legacy';
    // All stat/file helpers return 'missing' (paths don't exist)
    panel._safeStatStamp = (_p: string) => 'missing';
    panel._safeFilesMtimeStamp = (_p: string) => 'missing';

    const signature: string = panel._getWorkspaceStateSignature();
    expect(signature).toContain('outputDirs:');
  });
});
