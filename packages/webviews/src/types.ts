export interface DashboardStats {
  hasProfile: boolean;
  profileStatus: 'Active' | 'Not configured' | 'Error';
  profileError?: string;
  totalAgents: number | '—';
  specCount: number | '—';
  validSpecs: number | '—';
  teamsCount: number;
  teams: TeamSummary[];
  activeTeamId: string | null;
  teamContext: 'no_teams' | 'no_active_team' | 'active_team';
  syncStatus: 'SUCCESS' | 'WARNING' | 'NOT_SYNCED' | 'ERROR';
  syncTime: string;
  syncError?: string;
  warnings: string[];
  gatingReasons: {
    manageTeams?: string;
    createAgent?: string;
    browseSkills?: string;
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

export interface Agent {
  id: string;
  name: string;
  role: 'worker' | 'router' | 'orchestrator';
  teamId?: string | null;
  scope?: 'team' | 'global';
  lastModified: string;
}

export interface CatalogEntitySummary {
  id: string;
  name: string;
}

export interface GlobalCatalogSummary {
  teams: CatalogEntitySummary[];
  agents: CatalogEntitySummary[];
  skills: CatalogEntitySummary[];
}

export interface ProjectBindings {
  teamId: string | null;
  agentIds: string[];
  skillIds: string[];
}

export type MessageType =
  | { type: 'initProject' }
  | {
      type: 'createAgent';
      name: string;
      role?: string;
      description?: string;
      skills?: string[];
    }
  | {
      type: 'saveAgent';
      agentId: string;
      name: string;
      role?: string;
      description?: string;
      skills?: string[];
    }
  | { type: 'requestAgentData'; agentId: string }
  | { type: 'syncAgents' }
  | { type: 'openChat' }
  | { type: 'editAgent'; agentId: string }
  | { type: 'deleteAgent'; agentId: string }
  | { type: 'viewSpec'; agentId: string }
  | { type: 'refresh' }
  | { type: 'saveProfile'; profile: any }
  | { type: 'requestDetectedConfig' }
  | { type: 'requestContextPacksState' }
  | { type: 'saveContextPacks'; contextPacks: string[] }
  | { type: 'createContextPack'; packId: string }
  | { type: 'openContextPacksFolder' }
  | { type: 'setActiveTeam'; teamId: string | null }
  | { type: 'loadTeamTemplate'; teamId: string }
  | {
      type: 'createTeam';
      teamId: string;
      name: string;
      description?: string;
      agents?: string[];
      tags?: string[];
    }
  | { type: 'browseTeams' }
  | { type: 'manageTeams' }
  | {
      type: 'saveGlobalBindings';
      teamId: string | null;
      agentIds: string[];
      skillIds: string[];
    }
  | { type: 'syncResult'; success: boolean; error?: string };
