import type {
  AgentPermissions,
  AgentRole,
  AgentSkillRef,
  AgentTool,
  OutputTemplateId,
} from '../agents';

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
  contextPacks: string[];
  targets: string[];
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
  };
  context_packs?: string[];
  targets?: string[];
};
