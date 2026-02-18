/**
 * Agent Team Extension Types
 */

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
    allowed_subagents?: string[];
  };
  skills?: {
    allowed?: string[];
  };
  verification?: boolean;
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
// v2.0 Kits & Teams System Types
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
  overrides?: {
    max_chars_per_file?: number;
    output_mode?: 'short+diff' | 'diff' | 'plan' | 'structured';
    [agentId: string]: any; // Agent-specific overrides
  };
}

/**
 * Kit Manifest - Reusable agent bundle metadata
 * Location: kits/{kit-id}/kit.yml
 */
export interface KitManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  requires?: {
    technologies?: string[];
    min_core_version?: string;
  };
  provides: {
    agents: string[]; // Agent IDs provided by this kit
    skills?: string[]; // Custom skills
    context_packs?: string[]; // Kit context packs
  };
  defaults?: {
    output_mode?: 'short+diff' | 'diff' | 'plan' | 'structured';
    max_files?: number;
    max_chars_per_file?: number;
  };
  placeholders?: {
    paths?: Record<
      string,
      {
        description: string;
        example: string;
        required?: boolean;
      }
    >;
    commands?: Record<
      string,
      {
        description: string;
        example: string;
        required?: boolean;
      }
    >;
  };
}

/**
 * Kit Agent Spec - Agent with placeholders (before composition)
 * Location: kits/{kit-id}/agents/{agent-id}.yml
 */
export interface KitAgentSpec extends AgentSpec {
  _metadata: AgentMetadata & {
    kit_id?: string; // Which kit this agent belongs to
    kit_version?: string;
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
    allowed_subagents?: string[];
  };
  skills?: {
    allowed?: string[];
  };
  intents?: string[];
  keywords?: string[];
  path_globs?: string[];
  [key: string]: any; // Allow additional properties
}

/**
 * Team Profile - Saved kit selections with overrides
 * Location: .agent-teams/teams/{team-id}.yml
 */
export interface TeamProfile {
  id: string;
  name: string;
  description?: string;
  version?: string;
  kits: Array<
    | string
    | {
        id: string;
        version?: string; // Semver range
      }
  >;
  agents?: {
    enable?: 'all' | string[];
    disable?: string[];
  };
  overrides?: Record<string, AgentOverride>; // Agent-specific overrides by agent ID
}

/**
 * Composed Agent Spec - Final spec after Kit + Profile merge
 * All placeholders resolved, ready for generation
 */
export interface ComposedAgentSpec extends AgentSpec {
  _composition_metadata?: {
    kit_id: string;
    kit_version: string;
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
  | 'kit-priority' // Kit values take precedence
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
}

/**
 * Placeholder Resolution Context
 */
export interface PlaceholderContext {
  paths: Record<string, string>;
  commands: Record<string, string>;
  project: Record<string, string>;
  kit?: Record<string, string>;
}
