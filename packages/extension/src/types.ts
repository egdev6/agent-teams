/**
 * Agent Team Extension Types
 */

// Re-export the canonical AgentSpec and related types from core
import type { AgentSpec, CatalogSkillEntry } from '@agent-teams/core';

export type {
  AgentConstraints,
  AgentHandoffs,
  AgentOutput,
  AgentRole,
  AgentScope,
  AgentSkillRef,
  AgentSpec,
  AgentTool,
  CatalogSkillEntry,
  OutputTemplateId,
  PathGlob,
  SyncTarget,
} from '@agent-teams/core';

export type { CatalogSkillEntry as CatalogSkillEntryAlias };

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
  handoffDepth?: number;
  visitedAgents?: Set<string>;
}

export interface DelegationResponse {
  agentId: string;
  response: string;
  success: boolean;
  metadata?: unknown;
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
    type?: string;
    description?: string;
  };
  technologies?: Record<string, boolean>;
  paths: Record<string, string>;
  commands: Record<string, string>;
  context_packs?: string[];
  agents_md_budget?: number;
  sync_targets?: Array<'claude_code' | 'codex' | 'github_copilot' | 'gemini' | 'openai'>;
  gitignore_targets?: Array<'claude_code' | 'codex' | 'github_copilot' | 'gemini' | 'openai'>;
  overrides?: {
    max_chars_per_file?: number;
    [agentId: string]: unknown;
  };
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
  overrides?: Record<string, Record<string, unknown>>;
}

export type MergeStrategy = 'profile-priority' | 'team-priority' | 'explicit-only';

export interface CompositionOptions {
  validate?: boolean;
  strict?: boolean;
  mergeStrategy?: MergeStrategy;
  dryRun?: boolean;
  workspacePath?: string;
}

export interface RouteTaskRule {
  agentId: string;
  tasks: string[];
}

/**
 * @deprecated No longer used in the flat agent schema. Kept for legacy compatibility.
 */
export type AgentMetadata = Record<string, unknown>;

/**
 * Placeholder context for resolving template values during agent composition.
 */
export interface PlaceholderContext {
  project: {
    id: string;
    name: string;
    version: string;
    type?: string;
    description?: string;
  };
  context_packs?: string[];
  paths?: Record<string, string>;
  commands?: Record<string, string>;
  sync_targets?: string[];
  overrides?: Record<string, unknown>;
}

/**
 * @deprecated Use AgentSkillRef from @agent-teams/core instead.
 */
export interface SkillUseDefinition {
  id: string;
  description?: string;
  input?: Record<string, unknown>;
  output?: string;
}

/**
 * Agent-level override applied at team or profile level.
 */
export interface AgentOverride {
  context?: {
    packs?: string[];
    max_files?: number;
    max_chars_per_file?: number;
  };
  output?: {
    template?: string;
    mode?: string;
    max_items?: number;
    never_include?: string[];
  };
  intents?: string[];
  path_globs?: string[];
  [key: string]: unknown;
}

/**
 * Composed Agent Spec - Final spec after Profile + Team merge.
 * All placeholders resolved, ready for generation.
 */
export interface ComposedAgentSpec extends AgentSpec {
  _composition_metadata?: {
    profile_id: string;
    team_id?: string;
    composed_at: string;
    placeholders_resolved: string[];
    overrides_applied?: string[];
  };
}
