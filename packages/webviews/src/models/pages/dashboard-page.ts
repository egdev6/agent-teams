import type { DashboardStats } from '../dashboard';

/**
 * Pending changes object received from backend after dry run.
 */
export type PendingChanges = {
  items: Array<{ id: string; action: 'create' | 'update' | 'delete' }>;
  total: number;
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
};

export type DashboardHostMessage =
  | { type: 'updateStats'; stats: DashboardStats }
  | { type: 'syncResult'; success: boolean; error?: string }
  | { type: 'syncAgents' }
  | { type: 'preserveOrphansResult'; success: boolean; count: number }
  | { type: 'dryRunStarted' }
  | {
      type: 'dryRunComplete';
      pendingChanges?: PendingChanges;
      error?: string;
      lastSyncTime?: string;
    }
  | { type: 'syncComplete' };
