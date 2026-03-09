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
};

export type AgentManagerHostMessage = {
  type: 'updateStats';
  stats: DashboardStats;
};
