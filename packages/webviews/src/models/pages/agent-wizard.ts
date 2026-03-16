import type {
  AgentPermissions,
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
  permissions: AgentPermissions;
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
  engramAutonomous: boolean;
  mcpServers: AgentMcpServerForm[];
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
  permissions: AgentPermissions;
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
  engram?: { mode: 'autonomous' };
  mcpServers?: Array<{
    id: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
};
