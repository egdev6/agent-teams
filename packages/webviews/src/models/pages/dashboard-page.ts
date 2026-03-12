import type { DashboardStats } from '../dashboard';

export type DashboardHostMessage =
  | { type: 'updateStats'; stats: DashboardStats }
  | { type: 'syncResult'; success: boolean; error?: string }
  | { type: 'syncAgents' }
  | { type: 'preserveOrphansResult'; success: boolean; count: number };
