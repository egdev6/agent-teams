import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ContextPacksStateMessage = {
  type: 'contextPacksState';
  availablePacks?: unknown;
  selectedPacks?: unknown;
};

type ContextPacksErrorMessage = {
  type: 'contextPacksError';
  error?: unknown;
};

type ContextPacksSavedMessage = {
  type: 'contextPacksSaved';
  count?: unknown;
};

type ContextPacksOpenedMessage = {
  type: 'contextPacksOpened';
  path?: unknown;
};

type HostMessage =
  | ContextPacksStateMessage
  | ContextPacksErrorMessage
  | ContextPacksSavedMessage
  | ContextPacksOpenedMessage;

const normalizePackId = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const useContextPacksLogic = () => {
  const SAVE_TIMEOUT_MS = 12000;
  const [availablePacks, setAvailablePacks] = useState<string[]>([]);
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);
  const [newPackName, setNewPackName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
      setAvailablePacks(available);
      setSelectedPacks(selected);
      setError(null);
      setIsSaving(false);
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

  const onMessage = useCallback(
    (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'contextPacksState') handleStateMessage(message);
      else if (message.type === 'contextPacksError') handleErrorMessage(message);
      else if (message.type === 'contextPacksSaved') handleSavedMessage(message);
      else if (message.type === 'contextPacksOpened') setStatus('Context packs folder opened.');
    },
    [handleStateMessage, handleErrorMessage, handleSavedMessage],
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

  return {
    allPacks,
    selectedPacks,
    newPackName,
    setNewPackName,
    error,
    status,
    isSaving,
    togglePack,
    createPack,
    openFolder,
    refresh,
    saveSelection,
  };
};

export type ContextPacksModel = ReturnType<typeof useContextPacksLogic>;
