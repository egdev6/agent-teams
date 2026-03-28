import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useState } from 'react';
import type { ImportExportHostMessage } from '../../models';

type OperationResult = { success: boolean; message: string } | null;

type SetResult = (result: OperationResult) => void;
type SetLoading = (loading: boolean) => void;

function handleExportDone(
  msg: Extract<ImportExportHostMessage, { type: 'catalogExportDone' }>,
  setIsExporting: SetLoading,
  setExportResult: SetResult,
): void {
  setIsExporting(false);
  setExportResult(
    msg.success
      ? { success: true, message: 'Catalog exported successfully.' }
      : { success: false, message: msg.error ?? 'Export failed.' },
  );
}

function handleImportDone(
  msg: Extract<ImportExportHostMessage, { type: 'catalogImportDone' }>,
  setIsImporting: SetLoading,
  setImportResult: SetResult,
): void {
  setIsImporting(false);
  if (msg.error === 'cancelled') {
    setImportResult(null);
    return;
  }
  setImportResult(
    msg.success
      ? {
          success: true,
          message: `Import complete. Added: ${msg.added}, skipped (already existed): ${msg.skipped}.`,
        }
      : { success: false, message: msg.error ?? 'Import failed.' },
  );
}

function handleResetDone(
  msg: Extract<ImportExportHostMessage, { type: 'catalogResetDone' }>,
  setIsResetting: SetLoading,
  setResetResult: SetResult,
): void {
  setIsResetting(false);
  if (msg.success) {
    setResetResult({ success: true, message: 'Catalog reset successfully.' });
  } else if (msg.error) {
    setResetResult({ success: false, message: msg.error });
  } else {
    setResetResult(null);
  }
}

function handleProfileExportDone(
  msg: Extract<ImportExportHostMessage, { type: 'profileExportDone' }>,
  setIsExportingProfile: SetLoading,
  setExportProfileResult: SetResult,
): void {
  setIsExportingProfile(false);
  setExportProfileResult(
    msg.success
      ? { success: true, message: 'Profile exported successfully.' }
      : { success: false, message: msg.error ?? 'Export failed.' },
  );
}

function handleProfileImportDone(
  msg: Extract<ImportExportHostMessage, { type: 'profileImportDone' }>,
  setIsImportingProfile: SetLoading,
  setImportProfileResult: SetResult,
): void {
  setIsImportingProfile(false);
  if (msg.error === 'cancelled') {
    setImportProfileResult(null);
    return;
  }
  setImportProfileResult(
    msg.success
      ? {
          success: true,
          message: `Profile imported successfully (${msg.filesWritten ?? 0} files written).`,
        }
      : { success: false, message: msg.error ?? 'Import failed.' },
  );
}

export const useImportExportLogic = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<OperationResult>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<OperationResult>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<OperationResult>(null);
  const [isExportingProfile, setIsExportingProfile] = useState(false);
  const [exportProfileResult, setExportProfileResult] = useState<OperationResult>(null);
  const [isImportingProfile, setIsImportingProfile] = useState(false);
  const [importProfileResult, setImportProfileResult] = useState<OperationResult>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ImportExportHostMessage>) => {
      const message = event.data;
      if (message.type === 'catalogExportDone') {
        handleExportDone(message, setIsExporting, setExportResult);
      } else if (message.type === 'catalogImportDone') {
        handleImportDone(message, setIsImporting, setImportResult);
      } else if (message.type === 'catalogResetDone') {
        handleResetDone(message, setIsResetting, setResetResult);
      } else if (message.type === 'profileExportDone') {
        handleProfileExportDone(message, setIsExportingProfile, setExportProfileResult);
      } else if (message.type === 'profileImportDone') {
        handleProfileImportDone(message, setIsImportingProfile, setImportProfileResult);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleExport = useCallback(() => {
    setExportResult(null);
    setIsExporting(true);
    vscode.postMessage({ type: 'exportCatalog' });
  }, []);

  const handleImport = useCallback(() => {
    setImportResult(null);
    setIsImporting(true);
    vscode.postMessage({ type: 'importCatalog' });
  }, []);

  const handleReset = useCallback(() => {
    setResetResult(null);
    setIsResetting(true);
    vscode.postMessage({ type: 'resetCatalog' });
  }, []);

  const handleExportProfile = useCallback(() => {
    setExportProfileResult(null);
    setIsExportingProfile(true);
    vscode.postMessage({ type: 'exportProfile' });
  }, []);

  const handleImportProfile = useCallback(() => {
    setImportProfileResult(null);
    setIsImportingProfile(true);
    vscode.postMessage({ type: 'importProfile' });
  }, []);

  return {
    isExporting,
    exportResult,
    handleExport,
    isImporting,
    importResult,
    handleImport,
    isResetting,
    resetResult,
    handleReset,
    isExportingProfile,
    exportProfileResult,
    handleExportProfile,
    isImportingProfile,
    importProfileResult,
    handleImportProfile,
  };
};
