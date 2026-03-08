import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ContextPackPriority,
  ContextPackStateItem,
  ContextPacksErrorMessage,
  ContextPacksHostMessage,
  ContextPacksImportedMessage,
  ContextPacksSavedMessage,
  ContextPacksStateMessage,
} from '../../models';

const normalizePackId = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const useContextPacksLogic = () => {
  const SAVE_TIMEOUT_MS = 12000;
  const [availablePacks, setAvailablePacks] = useState<string[]>([]);
  const [packsMeta, setPacksMeta] = useState<ContextPackStateItem[]>([]);
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);
  const [agentsMdBudget, setAgentsMdBudget] = useState<number>(8000);
  const [newPackName, setNewPackName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);

  const clearSaveTimeout = useCallback(() => {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const refresh = useCallback(() => {
    setError(null);
    setStatus(null);
    vscode.postMessage({ type: 'requestContextPacksState' });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleStateMessage = useCallback(
    (message: ContextPacksStateMessage) => {
      clearSaveTimeout();
      const available = Array.isArray(message.availablePacks)
        ? message.availablePacks.filter((item): item is string => typeof item === 'string')
        : [];
      const selected = Array.isArray(message.selectedPacks)
        ? message.selectedPacks.filter((item): item is string => typeof item === 'string')
        : [];
      const normalizedMeta = Array.isArray(message.packsMeta)
        ? message.packsMeta
            .map((item): ContextPackStateItem | null => {
              if (!item || typeof item !== 'object') return null;
              const raw = item as {
                id?: unknown;
                priority?: unknown;
                description?: unknown;
              };
              if (typeof raw.id !== 'string') return null;
              const priority =
                raw.priority === 'essential' ||
                raw.priority === 'standard' ||
                raw.priority === 'reference'
                  ? (raw.priority as ContextPackPriority)
                  : 'standard';
              return {
                id: raw.id,
                priority,
                description: typeof raw.description === 'string' ? raw.description : undefined,
              };
            })
            .filter((item): item is ContextPackStateItem => item !== null)
        : [];
      const nextBudget =
        typeof message.agentsMdBudget === 'number' && Number.isFinite(message.agentsMdBudget)
          ? Math.max(0, Math.floor(message.agentsMdBudget))
          : 8000;

      setAvailablePacks(available);
      setPacksMeta(normalizedMeta);
      setSelectedPacks(selected);
      setAgentsMdBudget(nextBudget);
      setError(null);
      setIsSaving(false);
      setIsImporting(false);
    },
    [clearSaveTimeout],
  );

  const handleErrorMessage = useCallback(
    (message: ContextPacksErrorMessage) => {
      clearSaveTimeout();
      setError(
        typeof message.error === 'string' ? message.error : 'Context packs operation failed.',
      );
      setIsSaving(false);
      setIsImporting(false);
    },
    [clearSaveTimeout],
  );

  const handleSavedMessage = useCallback(
    (message: ContextPacksSavedMessage) => {
      clearSaveTimeout();
      const count = typeof message.count === 'number' ? message.count : 0;
      setStatus(`Saved ${count} selected context pack(s).`);
      setIsSaving(false);
    },
    [clearSaveTimeout],
  );

  const handleImportedMessage = useCallback((message: ContextPacksImportedMessage) => {
    const importedPacks = Array.isArray(message.packs)
      ? message.packs.filter((item): item is string => typeof item === 'string')
      : [];
    const count = typeof message.count === 'number' ? message.count : importedPacks.length;
    if (count > 0) {
      setStatus(`Imported ${count} context pack(s): ${importedPacks.join(', ')}`);
    } else {
      setStatus('No Markdown files were imported.');
    }
    setIsImporting(false);
  }, []);

  const onMessage = useCallback(
    (event: MessageEvent<ContextPacksHostMessage>) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'contextPacksState') handleStateMessage(message);
      else if (message.type === 'contextPacksError') handleErrorMessage(message);
      else if (message.type === 'contextPacksSaved') handleSavedMessage(message);
      else if (message.type === 'contextPacksOpened') setStatus('Context packs folder opened.');
      else if (message.type === 'contextPacksImported') handleImportedMessage(message);
    },
    [handleStateMessage, handleErrorMessage, handleSavedMessage, handleImportedMessage],
  );

  useEffect(() => {
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      clearSaveTimeout();
    };
  }, [onMessage, clearSaveTimeout]);

  const allPacks = useMemo(
    () => Array.from(new Set([...availablePacks, ...selectedPacks])).sort(),
    [availablePacks, selectedPacks],
  );

  const allPackItems = useMemo(() => {
    const byId = new Map<string, ContextPackStateItem>();
    for (const item of packsMeta) {
      byId.set(item.id, item);
    }
    return allPacks.map((id) => byId.get(id) ?? { id, priority: 'standard' as const });
  }, [allPacks, packsMeta]);

  const togglePack = (packId: string) => {
    setSelectedPacks((current) =>
      current.includes(packId) ? current.filter((item) => item !== packId) : [...current, packId],
    );
  };

  const createPack = () => {
    const packId = normalizePackId(newPackName);
    if (!packId) return;
    vscode.postMessage({ type: 'createContextPack', packId });
    setSelectedPacks((current) => (current.includes(packId) ? current : [...current, packId]));
    setNewPackName('');
    setStatus(`Created context pack "${packId}".`);
    refresh();
  };

  const openFolder = () => {
    vscode.postMessage({ type: 'openContextPacksFolder' });
  };

  const saveSelection = () => {
    clearSaveTimeout();
    setIsSaving(true);
    setError(null);
    setStatus(null);
    vscode.postMessage({ type: 'saveContextPacks', contextPacks: selectedPacks });
    saveTimeoutRef.current = window.setTimeout(() => {
      setIsSaving(false);
      setError('Save operation timed out. Please try again and check extension logs.');
    }, SAVE_TIMEOUT_MS);
  };

  const importMd = () => {
    setError(null);
    setStatus(null);
    setIsImporting(true);
    vscode.postMessage({ type: 'importContextPackMd' });
  };

  return {
    allPacks,
    allPackItems,
    selectedPacks,
    agentsMdBudget,
    newPackName,
    setNewPackName,
    error,
    status,
    isSaving,
    isImporting,
    togglePack,
    createPack,
    importMd,
    openFolder,
    refresh,
    saveSelection,
  };
};

export type ContextPacksModel = ReturnType<typeof useContextPacksLogic>;
