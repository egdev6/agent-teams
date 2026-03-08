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
}

export type ProfileEditorContextPacksState = {
  availablePacks?: unknown;
  selectedPacks?: unknown;
};
