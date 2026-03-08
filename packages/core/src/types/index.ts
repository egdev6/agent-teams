/**
 * Common types for Agent Teams
 */

// ─── New flat agent spec (v2) ────────────────────────────────────────────────

export type AgentRole = 'worker' | 'orchestrator' | 'router';
export type SyncTarget = 'copilot' | 'claude' | 'codex';
export type OutputTemplateId =
  | 'diff'
  | 'code-review'
  | 'planning'
  | 'analysis'
  | 'step-by-step'
  | 'structured-qa'
  | 'summary'
  | 'routing-decision'
  | 'custom';

export interface PathGlob {
  pattern: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface AgentTool {
  name: string;
  when?: string;
}

export interface AgentSkillRef {
  id: string;
  when?: string;
}

export interface AgentPermissions {
  can_create_files?: boolean;
  can_edit_files?: boolean;
  can_delete_files?: boolean;
  can_run_commands?: boolean;
  can_delegate?: boolean;
  can_modify_public_api?: boolean;
  can_touch_global_config?: boolean;
}

export interface AgentScope {
  topics?: string[];
  path_globs?: Array<string | PathGlob>;
  excludes?: string[];
}

export interface AgentConstraints {
  always?: string[];
  never?: string[];
  escalate?: string[];
}

export interface AgentHandoffs {
  receives_from?: string[];
  delegates_to?: string[];
  escalates_to?: string[];
}

export interface AgentOutput {
  template?: OutputTemplateId;
  extends?: string;
  sections?: string[];
  format_instructions?: string;
  mode?: 'short' | 'detailed';
  max_items?: number;
  never_include?: string[];
}

export interface AgentContextStrategy {
  max_files?: number;
  max_chars_per_file?: number;
  retrieval_mode?: 'semantic' | 'glob' | 'explicit';
}

export type ContextPackPriority = 'essential' | 'standard' | 'reference';

export interface ContextPackMeta {
  name: string;
  priority: ContextPackPriority;
  description?: string;
  filePath: string;
}

/**
 * Flat agent configuration spec (v2).
 * Persisted as {id}.yml in .agent-teams/agents/.
 * Compiled to an operational .md by AgentGenerator.
 */
export interface AgentSpec {
  id: string;
  name: string;
  version?: string;
  role: AgentRole;
  domain?: string;
  subdomain?: string;
  description: string;
  expertise?: string[];
  intents?: string[];
  scope?: AgentScope;
  workflow?: string[];
  tools?: AgentTool[];
  skills?: AgentSkillRef[];
  permissions?: AgentPermissions;
  constraints?: AgentConstraints;
  handoffs?: AgentHandoffs;
  output?: AgentOutput;
  context_packs?: string[];
  context_strategy?: AgentContextStrategy;
  targets?: SyncTarget[];
}

// ─── Legacy shim (kept for migration) ───────────────────────────────────────

/** @deprecated Use AgentSpec */
export interface AgentMetadata {
  id: string;
  name: string;
  role?: AgentRole;
  domain?: string;
  version?: string;
  targets?: Array<'claude_code' | 'github_copilot'>;
}

/** @deprecated Use AgentSpec */
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
  path?: string;
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
