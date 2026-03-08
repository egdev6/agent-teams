import type { DashboardStats } from '../dashboard';

export type AgentItem = {
  id: string;
  name: string;
  role?: 'worker' | 'router' | 'orchestrator';
  scope?: 'team' | 'global';
  teamId?: string | null;
};

export type AgentManagerHostMessage = {
  type: 'updateStats';
  stats: DashboardStats;
};
