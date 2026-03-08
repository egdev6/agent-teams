export type ContextPackPriority = 'essential' | 'standard' | 'reference';

export type ContextPackStateItem = {
  id: string;
  priority: ContextPackPriority;
  description?: string;
};

export type ContextPacksStateMessage = {
  type: 'contextPacksState';
  availablePacks?: unknown;
  packsMeta?: unknown;
  selectedPacks?: unknown;
  agentsMdBudget?: unknown;
};

export type ContextPacksErrorMessage = {
  type: 'contextPacksError';
  error?: unknown;
};

export type ContextPacksSavedMessage = {
  type: 'contextPacksSaved';
  count?: unknown;
};

export type ContextPacksOpenedMessage = {
  type: 'contextPacksOpened';
  path?: unknown;
};

export type ContextPacksImportedMessage = {
  type: 'contextPacksImported';
  count?: unknown;
  packs?: unknown;
};

export type ContextPacksHostMessage =
  | ContextPacksStateMessage
  | ContextPacksErrorMessage
  | ContextPacksSavedMessage
  | ContextPacksOpenedMessage
  | ContextPacksImportedMessage;
