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
  canDelete: boolean;
  deleteDisabledReason?: string;
  assignedAgentIds?: string[];
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
