export type AgentRole = 'worker' | 'router' | 'orchestrator';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  teamId?: string | null;
  scope?: 'team' | 'global';
  lastModified: string;
  targets?: string[];
  description?: string;
  intents?: string[];
}

/** @deprecated Use AgentSkillRef */
export interface SkillUseDefinition {
  id: string;
  when?: string;
  tags?: string[];
  autoload?: boolean;
}

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

export type RouteTaskRule = {
  agentId: string;
  tasks: string[];
};
