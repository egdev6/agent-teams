import type { ProjectType, SyncTarget } from '../../pages/profile-editor/types';

export interface ExistingProfileUpdates {
  id: string | null;
  name: string | null;
  version: string | null;
  type: ProjectType | null;
  technologies: string[] | null;
  paths: Record<string, string> | null;
  commands: Record<string, string> | null;
  contextPacks: string[] | null;
  syncTargets: SyncTarget[] | null;
  gitignoreTargets: SyncTarget[] | null;
  bundledResources: {
    agents: Record<string, boolean> | null;
    skills: Record<string, boolean> | null;
  } | null;
}

export type ProfileEditorContextPacksState = {
  availablePacks?: unknown;
  selectedPacks?: unknown;
};

export interface ContextPackPreviewItem {
  id: string;
  priority: 'essential' | 'standard' | 'reference';
  charCount: number;
}

export interface ContextPacksBudgetedPreview {
  budget: number;
  charsUsed: number;
  inlined: ContextPackPreviewItem[];
  referenced: ContextPackPreviewItem[];
}

export interface ContextPacksPreviewResult {
  budgeted: ContextPacksBudgetedPreview;
  copilotLinked: ContextPackPreviewItem[];
}
