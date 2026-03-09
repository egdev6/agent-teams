import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useState } from 'react';
import type { ImportExportHostMessage } from '../../models';

type OperationResult = { success: boolean; message: string } | null;

export const useImportExportLogic = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<OperationResult>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<OperationResult>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ImportExportHostMessage>) => {
      const message = event.data;
      if (message.type === 'catalogExportDone') {
        setIsExporting(false);
        setExportResult(
          message.success
            ? { success: true, message: 'Catalog exported successfully.' }
            : { success: false, message: message.error ?? 'Export failed.' },
        );
      } else if (message.type === 'catalogImportDone') {
        setIsImporting(false);
        if (message.error === 'cancelled') {
          setImportResult(null);
        } else {
          setImportResult(
            message.success
              ? {
                  success: true,
                  message: `Import complete. Added: ${message.added}, skipped (already existed): ${message.skipped}.`,
                }
              : { success: false, message: message.error ?? 'Import failed.' },
          );
        }
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

  return { isExporting, exportResult, handleExport, isImporting, importResult, handleImport };
};
