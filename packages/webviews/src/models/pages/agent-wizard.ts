import type {
  AgentClaudeMcpServer,
  AgentRole,
  AgentSkillRef,
  AgentTool,
  OutputTemplateId,
} from '../agents';

/** MCP server entry as stored in the wizard form (args/env as raw strings for editing). */
export type AgentMcpServerForm = {
  id: string;
  command: string;
  /** One arg per line */
  args: string;
  /** Free JSON: { "TOKEN": "${TOKEN}" } */
  env: string;
};

/** Claude Code sub-agent scoped MCP server form entry. */
export type AgentClaudeMcpServerForm = {
  /** UI-only stable key for React rendering — not serialised to YAML. */
  _key: string;
  name: string;
  type: 'stdio' | 'http' | 'sse' | 'ws' | '';
  command: string;
  /** One arg per line */
  args: string;
  /** Free JSON: { "TOKEN": "${TOKEN}" } */
  env: string;
};

export type AgentWizardFormState = {
  name: string;
  role: string;
  description: string;
  domain: string;
  subdomain: string;
  expertise: string[];
  intents: string[];
  scopeTopics: string[];
  scopeGlobs: string;
  scopeExcludes: string[];
  workflowSteps: string[];
  tools: AgentTool[];
  skills: AgentSkillRef[];
  constraintsAlways: string[];
  constraintsNever: string[];
  constraintsEscalate: string[];
  receivesFrom: string[];
  delegatesTo: string[];
  escalatesTo: string[];
  outputTemplate: OutputTemplateId;
  outputMode: 'short' | 'detailed';
  outputMaxItems: number;
  outputNeverInclude: string[];
  outputFormatInstructions: string;
  contextPacks: string[];
  targets: string[];
  mcpServers: AgentMcpServerForm[];
  claudeModel: 'inherit' | 'sonnet' | 'opus' | 'haiku';
  claudeMaxTurns: number | undefined;
  claudeEffort: 'low' | 'medium' | 'high' | 'max' | undefined;
  claudePermissionMode: 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | undefined;
  claudeDisallowedTools: string[];
  claudeBackground: boolean;
  claudeMcpServers: AgentClaudeMcpServerForm[];
  opencodeModel: string;
};

export type AgentWizardMessagePayload = {
  id: string;
  name: string;
  version: string;
  role: AgentRole;
  domain: string;
  subdomain?: string;
  description: string;
  expertise: string[];
  intents: string[];
  scope?: {
    topics?: string[];
    path_globs?: Array<{ pattern: string; priority?: 'high' | 'medium' | 'low' }>;
    excludes?: string[];
  };
  workflow?: string[];
  tools?: AgentTool[];
  skills?: AgentSkillRef[];
  constraints?: {
    always?: string[];
    never?: string[];
    escalate?: string[];
  };
  handoffs?: {
    receives_from?: string[];
    delegates_to?: string[];
    escalates_to?: string[];
  };
  output: {
    template: OutputTemplateId;
    mode?: 'short' | 'detailed';
    max_items?: number;
    never_include?: string[];
    format_instructions?: string;
  };
  context_packs?: string[];
  targets?: string[];
  mcpServers?: Array<{
    id: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
  claude_model?: string;
  claude_max_turns?: number;
  claude_effort?: 'low' | 'medium' | 'high' | 'max';
  claude_permission_mode?: 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions';
  claude_disallowed_tools?: string[];
  claude_background?: boolean;
  claude_mcp_servers?: AgentClaudeMcpServer[];
  opencode_model?: string;
};
