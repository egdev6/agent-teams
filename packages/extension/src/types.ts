/**
 * Agent Team Extension Types
 */

import type { CatalogSkillEntry, SkillUseDefinition } from '@agent-teams/core';
export type { CatalogSkillEntry, SkillUseDefinition };

export type SyncTarget = 'claude_code' | 'codex' | 'github_copilot';

export interface RouteTaskRule {
  agentId: string;
  tasks: string[];
}

export interface AgentMetadata {
  id: string; // Slug without @
  role: 'worker' | 'orchestrator' | 'router';
  domain: string;
  subdomains?: string[];
  intents: string[];
  path_globs?: string[];
  keywords?: string[];
  invocation?: {
    aliases: string[]; // e.g., ["@backend-api"]
    entrypoint: string; // e.g., "agent:backend-api"
  };
  context?: {
    packs?: string[];
    max_files?: number;
    max_chars_per_file?: number;
  };
  output?: {
    mode_default: 'short+diff' | 'diff' | 'plan' | 'structured';
    max_bullets?: number;
    schema?: string[];
    never_include?: string[];
  };
  delegation?: {
    strategy?: 'router_split' | 'agent_handoff';
    max_handoffs?: number;
    allowed_subagents?: string[] | 'all';
  };
  permissions?: {
    filesystem?: {
      read?: boolean;
      write?: boolean;
    };
    commands?: {
      run?: boolean;
    };
    network?: {
      fetch?: boolean;
    };
  };
  skills?: {
    uses?: SkillUseDefinition[];
  };
  routing_rules?: RouteTaskRule[];
  orchestrator?: {
    planning?: boolean;
    max_tokens?: 'low' | 'medium' | 'high';
    capabilities?: string[];
  };
  worker?: {
    max_tokens?: 'low' | 'medium' | 'high';
    execution_enabled?: boolean;
    capabilities?: string[];
  };
  verification?: boolean;
  targets?: SyncTarget[];
}

export interface AgentSpec {
  name: string;
  description: string;
  _metadata: AgentMetadata;
  instructions?: string; // Full markdown content
}

export interface RoutingContext {
  userPrompt: string;
  currentFile?: string;
  workspaceFiles?: string[];
  detectedIntents: string[];
  matchedKeywords: string[];
}

export interface AgentScore {
  agentId: string;
  score: number;
  reasons: string[];
}

export interface DelegationRequest {
  targetAgentId: string;
  subTask: string;
  context: RoutingContext;
  reason: string;
  handoffDepth?: number; // Track delegation chain depth
  visitedAgents?: Set<string>; // Track visited agents to prevent loops
}

export interface DelegationResponse {
  agentId: string;
  response: string;
  success: boolean;
  metadata?: any;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ExtensionConfig {
  agentsPath: string;
  enableAutoRouting: boolean;
  enablePathMatching: boolean;
  logLevel: LogLevel;
}

// ============================================================================
// v2.0 Teams System Types
// ============================================================================

/**
 * Project Profile - Project-specific configuration
 * Location: .agent-teams/project.profile.yml
 */
export interface ProjectProfile {
  project: {
    id: string;
    name: string;
    version: string;
    type?: string; // frontend, backend, fullstack, library, monorepo
    description?: string;
  };
  technologies?: Record<string, boolean>; // Technology flags: { typescript: true, react: true }
  paths: Record<string, string>; // Placeholder values: { test_root: "src/__tests__" }
  commands: Record<string, string>; // Placeholder values: { test: "pnpm test" }
  context_packs?: string[]; // Context pack names: ["architecture", "conventions"]
  sync_targets?: Array<'claude_code' | 'codex' | 'github_copilot'>;
  overrides?: {
    max_chars_per_file?: number;
    output_mode?: 'short+diff' | 'diff' | 'plan' | 'structured';
    [agentId: string]: any; // Agent-specific overrides
  };
}

/**
 * Agent Override Configuration
 * Applied at team or profile level to customize agent behavior
 */
export interface AgentOverride {
  context?: {
    packs?: string[];
    max_files?: number;
    max_chars_per_file?: number;
  };
  output?: {
    mode_default?: 'short+diff' | 'diff' | 'plan' | 'structured';
    max_bullets?: number;
    never_include?: string[];
  };
  delegation?: {
    strategy?: 'router_split' | 'agent_handoff';
    max_handoffs?: number;
    allowed_subagents?: string[] | 'all';
  };
  permissions?: {
    filesystem?: {
      read?: boolean;
      write?: boolean;
    };
    commands?: {
      run?: boolean;
    };
    network?: {
      fetch?: boolean;
    };
  };
  skills?: {
    uses?: SkillUseDefinition[];
  };
  intents?: string[];
  keywords?: string[];
  path_globs?: string[];
  [key: string]: any; // Allow additional properties
}

/**
 * Team Profile - Saved team configuration
 * Location: .agent-teams/teams/{team-id}.yml
 */
export interface TeamProfile {
  id: string;
  name: string;
  description?: string;
  version?: string;
  agents?: {
    enable?: 'all' | string[];
    disable?: string[];
  };
  overrides?: Record<string, AgentOverride>; // Agent-specific overrides by agent ID
}

/**
 * Composed Agent Spec - Final spec after Profile + Team merge
 * All placeholders resolved, ready for generation
 */
export interface ComposedAgentSpec extends AgentSpec {
  _composition_metadata?: {
    profile_id: string;
    team_id?: string;
    composed_at: string; // ISO timestamp
    placeholders_resolved: string[]; // List of resolved placeholders
    overrides_applied?: string[]; // List of override keys applied
  };
}

/**
 * Merge Strategy for conflict resolution
 */
export type MergeStrategy =
  | 'profile-priority' // Profile values take precedence
  | 'team-priority' // Team values take precedence (default)
  | 'explicit-only'; // Only use explicitly set values

/**
 * Composition Options
 */
export interface CompositionOptions {
  validate?: boolean; // Validate final spec (default: true)
  strict?: boolean; // Fail on missing placeholders (default: false)
  overrides?: Record<string, AgentOverride>; // Additional overrides
  mergeStrategy?: MergeStrategy; // Conflict resolution strategy (default: team-priority)
  dryRun?: boolean; // Preview without writing files (default: false)
  workspacePath?: string; // Path to workspace root for loading agent specs
}

/**
 * Placeholder Resolution Context
 */
export interface PlaceholderContext {
  paths: Record<string, string>;
  commands: Record<string, string>;
  project: Record<string, string>;
}
