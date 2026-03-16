import type { AgentPermissions, AgentSkillRef, AgentTool, OutputTemplateId } from '../agents';
import type { CatalogSkillEntry } from '../catalog';
import type { DashboardStats } from '../dashboard';

export type CreateAgentHostMessage =
  | { type: 'updateStats'; stats: DashboardStats }
  | { type: 'createAgentResult'; success: boolean; error?: string }
  | { type: 'importAgentSpecResult'; success: boolean; canceled?: boolean; error?: string }
  | { type: 'catalogSkills'; skills: CatalogSkillEntry[] }
  | { type: 'installCatalogSkillResult'; success: boolean; skillId: string; error?: string }
  | { type: 'contextPacksState'; availablePacks?: unknown; selectedPacks?: unknown };

export type EditAgentDataMessage = {
  type: 'agentData';
  agentId: string;
  error?: string;
  name?: string;
  role?: string;
  description?: string;
  domain?: string;
  subdomain?: string;
  expertise?: string[];
  intents?: string[];
  scope?: {
    topics?: string[];
    path_globs?: Array<{ pattern: string; priority?: 'high' | 'medium' | 'low' }>;
    excludes?: string[];
  };
  workflow?: string[];
  tools?: AgentTool[];
  skills?: AgentSkillRef[];
  permissions?: AgentPermissions;
  constraints?: { always?: string[]; never?: string[]; escalate?: string[] };
  handoffs?: { receives_from?: string[]; delegates_to?: string[]; escalates_to?: string[] };
  output?: {
    template?: OutputTemplateId;
    mode?: 'short' | 'detailed';
    max_items?: number;
    never_include?: string[];
    format_instructions?: string;
  };
  context_packs?: string[];
  availableContextPacks?: string[];
  targets?: string[];
  assignedTeamIds?: string[];
  engram?: { mode?: string };
  mcpServers?: Array<{
    id: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
};

export type EditAgentHostMessage =
  | { type: 'updateStats'; stats: DashboardStats }
  | EditAgentDataMessage
  | { type: 'saveAgentResult'; success: boolean; error?: string }
  | { type: 'catalogSkills'; skills: CatalogSkillEntry[] }
  | { type: 'installCatalogSkillResult'; success: boolean; skillId: string; error?: string };
