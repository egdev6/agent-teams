export type ViewType = 'dashboard' | 'profile-editor' | 'team-browser' | 'kit-browser';

export interface NavigationState {
  currentView: ViewType;
  history: ViewType[];
  canGoBack: boolean;
}

export interface ProfileData {
  id: string;
  name: string;
  version: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'monorepo' | 'library';
  technologies: string[];
  paths: Record<string, string>;
  commands: Record<string, string>;
  context_packs: string[];
}

export interface DetectedConfig {
  type: string;
  technologies: Record<string, boolean>;
  paths: Record<string, string>;
  commands: Record<string, string>;
}
