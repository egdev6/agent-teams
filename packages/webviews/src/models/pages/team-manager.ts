import type { DashboardStats } from '../dashboard';

export type TeamItem = {
  id: string;
  name: string;
  description?: string;
  enabledAgentsCount?: number;
  enablesAllAgents?: boolean;
};

export type TeamManagerHostMessage = {
  type: 'updateStats';
  stats: DashboardStats;
};
