export type ProjectType = 'frontend' | 'backend' | 'fullstack' | 'monorepo' | 'library';
export type SyncTarget = 'claude_code' | 'codex' | 'github_copilot';

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
  addToGitignore: boolean;
}

export interface DetectedProjectConfig {
  technologies?: Record<string, boolean>;
  paths?: Record<string, string>;
  commands?: Record<string, string>;
  type?: string;
}
