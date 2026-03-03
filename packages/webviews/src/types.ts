export interface DashboardStats {
  hasProfile: boolean;
  profileStatus: 'Active' | 'Not configured' | 'Error';
  profileError?: string;
  totalAgents: number;
  agentYamlCount: number;
  validAgentYamlCount: number;
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
  role?: 'worker' | 'router' | 'orchestrator';
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

export interface BrowserSkill {
  id: string;
  name: string;
  description: string;
  category?: string;
  tags: string[];
  version?: string;
  source: 'workspace' | 'import' | 'community';
  installed: boolean;
}

export interface SkillUseDefinition {
  id: string;
  when?: string;
  tags?: string[];
  autoload?: boolean;
}

export interface CatalogSkillEntry {
  id: string;
  title: string;
  description?: string;
  source: { type: 'skills-lc' | 'git'; ref: string };
  version: string;
  tags: string[];
  materialized: boolean;
}

export interface CommunitySkillResult {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  stars?: number;
  githubUrl?: string;
  source?: string;
  version?: string;
}

export type MessageType =
  | { type: 'initProject' }
  | { type: 'importAgentSpec' }
  | {
      type: 'createAgent';
      name: string;
      role?: string;
      description?: string;
      domain?: string;
      subdomains?: string[];
      intents?: string[];
      pathGlobs?: string[];
      keywords?: string[];
      skillUses?: SkillUseDefinition[];
      output?: {
        modeDefault?: 'short+diff' | 'diff' | 'plan' | 'structured';
      };
      context?: {
        maxFiles?: number;
        maxCharsPerFile?: number;
      };
      delegation?: {
        strategy?: 'disabled' | 'router_split' | 'agent_handoff';
        maxHandoffs?: number;
        allowedSubagents?: string[] | 'all';
      };
    }
  | {
      type: 'saveAgent';
      agentId: string;
      name: string;
      role?: string;
      description?: string;
      domain?: string;
      subdomains?: string[];
      intents?: string[];
      pathGlobs?: string[];
      keywords?: string[];
      skillUses?: SkillUseDefinition[];
      output?: {
        modeDefault?: 'short+diff' | 'diff' | 'plan' | 'structured';
      };
      context?: {
        maxFiles?: number;
        maxCharsPerFile?: number;
      };
      delegation?: {
        strategy?: 'disabled' | 'router_split' | 'agent_handoff';
        maxHandoffs?: number;
        allowedSubagents?: string[] | 'all';
      };
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
  | { type: 'requestTeamData'; teamId: string }
  | { type: 'requestSkillsCatalog' }
  | { type: 'toggleSkill'; skillId: string }
  | {
      type: 'searchCommunitySkills';
      query: string;
      page?: number;
      limit?: number;
      sortBy?: 'stars' | 'recent';
    }
  | {
      type: 'installCommunitySkill';
      skillId: string;
      title: string;
      description?: string;
      tags: string[];
      version: string;
      githubUrl?: string;
    }
  | {
      type: 'createTeam';
      teamId: string;
      name: string;
      description?: string;
      agents?: string[];
      tags?: string[];
    }
  | {
      type: 'saveTeam';
      teamId: string;
      name: string;
      description?: string;
      agents?: string[];
      tags?: string[];
    }
  | { type: 'deleteTeam'; teamId: string }
  | { type: 'syncResult'; success: boolean; error?: string }
  | { type: 'requestCatalogSkills' }
  | {
      type: 'installCatalogSkill';
      skillId: string;
      title?: string;
      description?: string;
      sourceType?: 'skills-lc' | 'git';
      ref?: string;
      version?: string;
      tags?: string[];
    }
  | { type: 'openExternal'; url: string };
