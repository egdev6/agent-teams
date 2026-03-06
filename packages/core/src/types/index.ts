/**
 * Common types for Agent Teams
 */

export interface AgentMetadata {
  id: string;
  name: string;
  role?: 'worker' | 'orchestrator' | 'router';
  domain?: string;
  version?: string;
  targets?: Array<'claude_code' | 'codex' | 'github_copilot'>;
}

export interface Agent {
  _metadata: AgentMetadata;
  instructions?: string;
  skills?: string[];
  [key: string]: any;
}

export interface Kit {
  _metadata: {
    id: string;
    name: string;
    version: string;
  };
  instructions?: string;
  skills?: string[];
  context_packs?: string[];
  [key: string]: any;
}

export interface Team {
  _metadata: {
    id: string;
    name: string;
    version: string;
  };
  agents: string[];
  [key: string]: any;
}

export interface ProjectProfile {
  _metadata: {
    name: string;
    version: string;
  };
  technologies?: Record<string, boolean>;
  context_packs?: string[];
  [key: string]: any;
}

export interface SkillDefinition {
  skill_id: string;
  name: string;
  category?: string;
  role?: string;
  domain?: string;
  requires_technology?: string[];
  [key: string]: any;
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
  source: {
    type: 'skills-lc' | 'git';
    ref: string;
  };
  version: string;
  tags: string[];
}
