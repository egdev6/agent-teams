/**
 * Common types for Agent Teams
 */

export interface AgentMetadata {
  id: string;
  name: string;
  role?: 'leader' | 'worker' | 'specialist';
  domain?: string;
  version?: string;
}

export interface Agent {
  _metadata: AgentMetadata;
  instructions?: string;
  skills?: string[];
  context_packs?: string[];
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
  kits?: string[];
  [key: string]: any;
}

export interface ProjectProfile {
  _metadata: {
    name: string;
    version: string;
  };
  technologies?: string[];
  kits?: string[];
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
