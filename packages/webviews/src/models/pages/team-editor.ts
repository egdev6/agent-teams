import type { DashboardStats } from '../dashboard';

export type TeamTemplateData = {
  id: string;
  name: string;
  description?: string;
  agents?: string[];
  tags?: string[];
};

export type CreateTeamHostMessage =
  | { type: 'updateStats'; stats: DashboardStats }
  | { type: 'createTeamResult'; success: boolean; error?: string }
  | {
      type: 'teamTemplate';
      team: TeamTemplateData;
    }
  | { type: 'teamTemplateError'; error: string };

export type EditTeamDataMessage = {
  type: 'teamData';
  teamId: string;
  name?: string;
  description?: string;
  agents?: string[];
  tags?: string[];
  error?: string;
};

export type EditTeamHostMessage =
  | { type: 'updateStats'; stats: DashboardStats }
  | EditTeamDataMessage
  | { type: 'saveTeamResult'; success: boolean; error?: string }
  | { type: 'deleteTeamResult'; success: boolean; error?: string };
