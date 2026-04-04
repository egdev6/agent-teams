import type { AgentSkillRef, AgentTool, OutputTemplateId } from './agents';
import type { ContextPackPriority } from './pages/context-packs';

export type MessageType =
  | { type: 'initProject' }
  | { type: 'importAgentSpec' }
  | { type: 'setupEngram' }
  | {
      type: 'createAgent';
      actionId?: string;
      // flat AgentSpec fields
      id: string;
      name: string;
      version?: string;
      role: string;
      domain?: string;
      subdomain?: string;
      description: string;
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
      targets?: string[];
      mcpServers?: Array<{
        id: string;
        command: string;
        args?: string[];
        env?: Record<string, string>;
      }>;
    }
  | {
      type: 'saveAgent';
      actionId?: string;
      // flat AgentSpec fields
      id: string;
      name: string;
      version?: string;
      role: string;
      domain?: string;
      subdomain?: string;
      description: string;
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
      claude_mcp_servers?: Array<{
        name: string;
        type?: string;
        command?: string;
        args?: string[];
        env?: Record<string, string>;
      }>;
      opencode_model?: string;
    }
  | { type: 'requestAgentData'; agentId: string }
  | { type: 'syncAgents' }
  | { type: 'openChat' }
  | { type: 'openProjectConfiguratorChat' }
  | { type: 'openAgentDesignerChat' }
  | { type: 'openConsultantChat' }
  | { type: 'editAgent'; agentId: string }
  | { type: 'deleteAgent'; agentId: string; actionId?: string }
  | { type: 'viewSpec'; agentId: string }
  | { type: 'refresh' }
  | { type: 'preserveOrphans' }
  | { type: 'saveProfile'; profile: any; actionId?: string }
  | { type: 'requestDetectedConfig' }
  | { type: 'requestContextPacksState' }
  | { type: 'saveContextPacks'; contextPacks: string[] }
  | { type: 'previewContextPacks'; selectedPacks: string[] }
  | { type: 'createContextPack'; packId: string; priority?: ContextPackPriority }
  | { type: 'updateContextPackPriority'; packId: string; priority: ContextPackPriority }
  | { type: 'importContextPackMd' }
  | { type: 'openContextPacksFolder' }
  | { type: 'requestAgentPacks'; agentId: string }
  | { type: 'saveAgentPacks'; agentId: string; packs: string[] }
  | { type: 'setActiveTeam'; teamId: string | null }
  | { type: 'loadTeamTemplate'; teamId: string }
  | { type: 'requestTeamData'; teamId: string }
  | { type: 'requestSkillsCatalog' }
  | { type: 'toggleSkill'; skillId: string }
  | { type: 'deleteSkill'; skillId: string }
  | {
      type: 'searchCommunitySkills';
      query: string;
      page?: number;
      limit?: number;
      sortBy?: 'stars' | 'recent';
    }
  | {
      type: 'installCommunitySkill';
      skillId: string;
      title: string;
      description?: string;
      tags: string[];
      version: string;
      githubUrl?: string;
    }
  | {
      type: 'createTeam';
      actionId?: string;
      teamId: string;
      name: string;
      description?: string;
      agents?: string[];
      tags?: string[];
    }
  | {
      type: 'saveTeam';
      actionId?: string;
      teamId: string;
      name: string;
      description?: string;
      agents?: string[];
      tags?: string[];
    }
  | { type: 'deleteTeam'; teamId: string; actionId?: string }
  | { type: 'syncResult'; success: boolean; error?: string }
  | { type: 'requestCatalogSkills' }
  | {
      type: 'installCatalogSkill';
      skillId: string;
      title?: string;
      description?: string;
      sourceType?: 'skills-lc' | 'git';
      ref?: string;
      version?: string;
      tags?: string[];
    }
  | { type: 'openExternal'; url: string }
  | { type: 'exportCatalog' }
  | { type: 'importCatalog' }
  | { type: 'resetCatalog' }
  | { type: 'exportProfile' }
  | { type: 'importProfile' };
