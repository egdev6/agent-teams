import type { Agent } from './agents';
import type { GlobalCatalogSummary, ProjectBindings } from './catalog';

export interface DashboardStats {
  hasProfile: boolean;
  profileStatus: 'Active' | 'Not configured' | 'Error';
  profileError?: string;
  engramInstalled: boolean;
  engramConfigured: boolean;
  totalAgents: number;
  agentYamlCount: number;
  validAgentYamlCount: number;
  projectSkillsCount?: number;
  teamsCount: number;
  teams: TeamSummary[];
  activeTeamId: string | null;
  teamContext: 'no_teams' | 'no_active_team' | 'active_team';
  syncStatus: 'SUCCESS' | 'WARNING' | 'NOT_SYNCED' | 'ERROR';
  syncTime: string;
  syncError?: string;
  syncNeeded: boolean;
  pendingChanges?: {
    created: number;
    updated: number;
    skipped: number;
    total: number;
  };
  warnings: string[];
  gatingReasons: {
    manageTeams?: string;
    createAgent?: string;
    browseSkills?: string;
    manageAgents?: string;
    manageSkills?: string;
    syncAgents?: string;
  };
  agents: Agent[];
  globalCatalog: GlobalCatalogSummary;
  bindings: ProjectBindings;
}

export interface TeamSummary {
  id: string;
  name: string;
  description?: string;
  enabledAgentsCount?: number;
  enablesAllAgents?: boolean;
}
