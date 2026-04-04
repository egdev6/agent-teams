import type { DashboardStats } from '../dashboard';

export type TeamItem = {
  id: string;
  name: string;
  description?: string;
  enabledAgentsCount?: number;
  enablesAllAgents?: boolean;
  /** True when the team file exists on disk but is not yet registered in the catalog. */
  localOnly?: boolean;
  /** True when the team spec was modified after the last successful sync. */
  unsynced?: boolean;
};

export type TeamManagerHostMessage =
  | {
      type: 'updateStats';
      stats: DashboardStats;
    }
  | {
      type: 'teamActivationStarted';
      teamId: string | null;
    };
