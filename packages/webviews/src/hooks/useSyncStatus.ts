import { useEffect, useState } from 'react';
import { parseAgentIds } from './parseAgentIds';

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

/**
 * Pending changes object received from backend after dry run.
 */
type PendingChanges = {
  items: Array<{ id: string; action: 'create' | 'update' | 'delete' }>;
  total: number;
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
};

/**
 * Messages sent from backend (extension) to trigger state transitions.
 */
type SyncMessage =
  | { type: 'dryRunStarted' }
  | {
      type: 'dryRunComplete';
      pendingChanges?: PendingChanges;
      error?: string;
      lastSyncTime?: string;
    }
  | { type: 'syncComplete' }
  | { type: 'syncResult'; success: boolean; error?: string };

type UseSyncStatusReturn = {
  state: SyncState;
  isLoading: boolean;
  error?: string;
  startSync: () => void;
};

/**
 * React hook for managing sync status via a finite state machine.
 *
 * **State Machine Transitions:**
 * ```
 * (mount) → checking
 * dryRunStarted → checking
 * dryRunComplete (with changes) → needs_sync
 * dryRunComplete (no changes) → up_to_date
 * dryRunComplete (error) → error
 * syncComplete → checking (triggers immediate dryRunStarted)
 * syncResult (error) → error
 * ```
 *
 * **Backend Events:**
 * - `dryRunStarted`: Backend starts checking for pending changes
 * - `dryRunComplete`: Backend finished dry run, provides pending changes or error
 * - `syncComplete`: Sync operation finished, triggers re-check
 * - `syncResult`: Sync operation result (success/error)
 *
 * **Usage:**
 * ```tsx
 * const { state, isLoading, error } = useSyncStatus();
 * const hasPendingChanges = state.status === 'needs_sync';
 * const agentsToSync = state.pendingAgentIds; // Set<string>
 * ```
 *
 * @returns {UseSyncStatusReturn} Current sync state, loading flag, and error message
 */
export function useSyncStatus(): UseSyncStatusReturn {
  const [state, setState] = useState<SyncState>({
    status: 'checking',
    pendingCount: 0,
    pendingAgentIds: new Set(),
  });

  // Function to manually trigger syncing state
  const startSync = () => {
    setState((prev) => ({
      ...prev,
      status: 'syncing',
    }));
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as SyncMessage;

      switch (message.type) {
        case 'dryRunStarted':
          setState({
            status: 'checking',
            pendingCount: 0,
            pendingAgentIds: new Set(),
            pendingChanges: undefined,
          });
          break;

        case 'dryRunComplete':
          if (message.error) {
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: message.error,
            }));
          } else if (message.pendingChanges) {
            const { items } = message.pendingChanges;
            if (items.length > 0) {
              setState({
                status: 'needs_sync',
                pendingCount: items.length,
                pendingAgentIds: parseAgentIds(items),
                pendingChanges: message.pendingChanges,
              });
            } else {
              setState({
                status: 'up_to_date',
                pendingCount: 0,
                pendingAgentIds: new Set(),
                pendingChanges: undefined,
                lastSyncTime: message.lastSyncTime || new Date().toISOString(),
              });
            }
          }
          break;

        case 'syncComplete':
          setState({
            status: 'checking',
            pendingCount: 0,
            pendingAgentIds: new Set(),
            pendingChanges: undefined,
          });
          break;

        case 'syncResult':
          if (!message.success) {
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: message.error,
            }));
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const isLoading = state.status === 'checking' || state.status === 'syncing';

  return {
    state,
    isLoading,
    error: state.error,
    startSync,
  };
}
