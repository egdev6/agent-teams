export type ProjectType = 'frontend' | 'backend' | 'fullstack' | 'monorepo' | 'library';
export type SyncTarget =
  | 'claude_code'
  | 'codex'
  | 'github_copilot'
  | 'gemini'
  | 'openai'
  | 'opencode';

export type BundledAgentId = 'agent-designer' | 'consultant' | 'project-configurator';
export type BundledSkillId = 'agent-spec-authoring' | 'project-spec-authoring';

export interface BundledResourcesConfig {
  agents: Record<BundledAgentId, boolean>;
  skills: Record<BundledSkillId, boolean>;
}

export interface ProfileFormData {
  id: string;
  name: string;
  version: string;
  type: ProjectType;
  technologies: string[];
  paths: Record<string, string>;
  commands: Record<string, string>;
  contextPacks: string[];
  syncTargets: SyncTarget[];
  gitignoreTargets: SyncTarget[];
  addToGitignore: boolean;
  bundledResources: BundledResourcesConfig;
}

export interface DetectedProjectConfig {
  technologies?: Record<string, boolean>;
  paths?: Record<string, string>;
  commands?: Record<string, string>;
  type?: string;
}
