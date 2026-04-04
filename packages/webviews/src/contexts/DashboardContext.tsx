/**
 * Dashboard Context - Global state for dashboard stats
 * Shared across all pages to avoid re-fetching on every navigation
 */

import { vscode } from '@lib/vscode';
import { Loader2 } from 'lucide-react';
import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { parseAgentIds } from '@/hooks/parseAgentIds';
import type { DashboardHostMessage, DashboardStats, PendingChanges } from '@/models';

/**
 * Represents the current state of the sync status machine.
 *
 * @property status - Current sync state:
 *   - `idle`: Never synced
 *   - `checking`: Running dry run to detect changes
 *   - `needs_sync`: Changes detected, waiting for user to sync
 *   - `up_to_date`: No changes detected
 *   - `syncing`: Currently performing sync operation
 *   - `error`: An error occurred during dry run or sync
 * @property pendingCount - Number of pending agent changes
 * @property pendingAgentIds - Set of agent IDs that have pending changes
 * @property pendingChanges - Full pending changes object from backend (optional)
 * @property error - Error message if status is 'error' (optional)
 * @property lastSyncTime - ISO timestamp of last successful sync (optional)
 */
type SyncState = {
  status: 'idle' | 'checking' | 'needs_sync' | 'up_to_date' | 'syncing' | 'error';
  pendingCount: number;
  pendingAgentIds: Set<string>;
  pendingChanges?: PendingChanges;
  error?: string;
  lastSyncTime?: string;
};

const EMPTY_STATS: DashboardStats = {
  hasProfile: false,
  profileStatus: 'Not configured',
  engramInstalled: false,
  engramConfigured: false,
  totalAgents: 0,
  totalTeams: 0,
  agentYamlCount: 0,
  validAgentYamlCount: 0,
  teamsCount: 0,
  teams: [],
  activeTeamId: null,
  teamContext: 'no_teams',
  syncStatus: 'NOT_SYNCED',
  syncTime: 'Never',
  syncNeeded: false,
  warnings: ['Could not load the initial dashboard state.'],
  gatingReasons: {
    manageTeams: 'Requires Profile Config',
    createAgent: 'Requires Profile Config',
    browseSkills: 'Requires Profile Config',
    manageAgents: 'Requires Profile Config',
    manageSkills: 'Requires Profile Config',
    syncAgents: 'Requires Profile Config',
  },
  agents: [],
  globalCatalog: {
    teams: [],
    agents: [],
    skills: [],
  },
  bindings: {
    teamId: null,
    agentIds: [],
    skillIds: [],
  },
};

interface DashboardContextValue {
  stats: DashboardStats;
  optimisticActiveTeamId: string | null;
  setOptimisticActiveTeamId: (teamId: string | null) => void;
  refresh: () => void;
  isLoading: boolean;
  syncState: SyncState;
  startSync: () => void;
  isBlocking: boolean;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);

  // Initialize optimistic state, but clear it if it matches the backend state
  const [optimisticActiveTeamId, setOptimisticActiveTeamId] = useState<string | null>(() => {
    const stored = sessionStorage.getItem('optimisticActiveTeamId');
    const initialStats = window.__INITIAL_STATE__;

    // If we have initial stats and the optimistic state matches backend, clear it
    if (stored && initialStats?.activeTeamId === stored) {
      sessionStorage.removeItem('optimisticActiveTeamId');
      return null;
    }

    return stored;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Initialize syncState - always start as 'checking' because backend runs dry run on mount
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'checking',
    pendingCount: 0,
    pendingAgentIds: new Set(),
  });

  // Listen for messages from backend
  useEffect(() => {
    const handleMessage = (event: MessageEvent<DashboardHostMessage>) => {
      const message = event.data;

      if (message.type === 'updateStats') {
        setStats(message.stats);
        setIsLoading(false);

        // Only clear optimistic state if backend confirms our optimistic choice
        setOptimisticActiveTeamId((current) => {
          if (current && message.stats.activeTeamId === current) {
            sessionStorage.removeItem('optimisticActiveTeamId');
            return null;
          }
          return current;
        });
      } else if (message.type === 'dryRunStarted') {
        setSyncState({
          status: 'checking',
          pendingCount: 0,
          pendingAgentIds: new Set(),
          pendingChanges: undefined,
        });
      } else if (message.type === 'dryRunComplete') {
        if (message.error) {
          setSyncState((prev) => ({
            ...prev,
            status: 'error',
            error: message.error,
          }));
        } else if (message.pendingChanges) {
          const { items } = message.pendingChanges;
          if (items.length > 0) {
            setSyncState({
              status: 'needs_sync',
              pendingCount: items.length,
              pendingAgentIds: parseAgentIds(items),
              pendingChanges: message.pendingChanges,
            });
          } else {
            setSyncState({
              status: 'up_to_date',
              pendingCount: 0,
              pendingAgentIds: new Set(),
              pendingChanges: undefined,
              lastSyncTime: message.lastSyncTime || new Date().toISOString(),
            });
          }
        }
      } else if (message.type === 'syncComplete') {
        setSyncState({
          status: 'checking',
          pendingCount: 0,
          pendingAgentIds: new Set(),
          pendingChanges: undefined,
        });
      } else if (message.type === 'syncResult') {
        if (!message.success) {
          setSyncState((prev) => ({
            ...prev,
            status: 'error',
            error: message.error,
          }));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    vscode.postMessage({ type: 'refresh' });
  }, []);

  const startSync = useCallback(() => {
    setSyncState((prev) => ({
      ...prev,
      status: 'syncing',
    }));
  }, []);

  // Derive blocking state from all conditions that should lock the UI
  // NOTE: We DON'T block on 'checking' status because that's a background operation
  // We only block on user-initiated actions (loading, syncing, team activation)
  const isBlocking =
    isLoading || // Initial load or refresh in progress (user-initiated)
    syncState.status === 'syncing' || // Sync operation in progress (user-initiated)
    optimisticActiveTeamId !== null; // Team activation in progress (user-initiated)

  // Request initial data on mount (only once)
  useEffect(() => {
    const initialStats = window.__INITIAL_STATE__;
    if (!initialStats?.hasProfile) {
      // No initial state - need full refresh (this will block UI)
      setIsLoading(true);
      vscode.postMessage({ type: 'refresh' });
    }
    // Backend will automatically run dry run in background - this won't block the UI
  }, []);

  const value: DashboardContextValue = {
    stats,
    optimisticActiveTeamId,
    setOptimisticActiveTeamId,
    refresh,
    isLoading,
    syncState,
    startSync,
    isBlocking,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
      {isBlocking && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '24px',
              backgroundColor: 'var(--vscode-editor-background)',
              borderRadius: '8px',
              border: '1px solid var(--vscode-panel-border)',
            }}
          >
            <Loader2 className='w-8 h-8 animate-spin stroke-brand-primary' />
            <span style={{ color: 'var(--vscode-foreground)', fontSize: '14px' }}>
              {optimisticActiveTeamId
                ? 'Activating team...'
                : syncState.status === 'syncing'
                  ? 'Synchronizing...'
                  : 'Loading...'}
            </span>
          </div>
        </div>
      )}
    </DashboardContext.Provider>
  );
};

export const useDashboard = (): DashboardContextValue => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};
