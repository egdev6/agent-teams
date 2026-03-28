/**
 * Common types for Agent Teams
 */

// ─── New flat agent spec (v2) ────────────────────────────────────────────────

export type AgentRole = 'worker' | 'orchestrator' | 'router';
// Canonical names — match the schema (project.profile.schema.json) and the UI.
// Use these everywhere; no internal aliases needed.
export type SyncTarget = 'github_copilot' | 'claude_code' | 'codex' | 'gemini' | 'openai';
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
  format_instructions?: string;
  mode?: 'short' | 'detailed';
  max_items?: number;
  never_include?: string[];
}

export interface AgentMcpServer {
  id: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
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
  constraints?: AgentConstraints;
  handoffs?: AgentHandoffs;
  output?: AgentOutput;
  context_packs?: string[];
  targets?: SyncTarget[];
  mcpServers?: AgentMcpServer[];
  claude_model?: 'inherit' | 'sonnet' | 'opus' | 'haiku';
  claude_max_turns?: number;
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
