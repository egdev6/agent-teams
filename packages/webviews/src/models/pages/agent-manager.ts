import type { DashboardStats } from '../dashboard';

export type AgentItem = {
  id: string;
  name: string;
  role?: 'worker' | 'router' | 'orchestrator';
  scope?: 'team' | 'global';
  teamId?: string | null;
  teamIds?: string[];
  description?: string;
  intents?: string[];
  /** True when the agent spec exists on disk but is not yet registered in the catalog. */
  localOnly?: boolean;
};

export type AgentManagerHostMessage = {
  type: 'updateStats';
  stats: DashboardStats;
};
