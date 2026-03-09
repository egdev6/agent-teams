import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Download, Loader2, Upload } from 'lucide-react';
import { PageTitle } from '@/components/shared/PageTitle';
import { useImportExportLogic } from './useImportExportLogic';

const ImportExportPage: React.FC = () => {
  const { isExporting, exportResult, handleExport, isImporting, importResult, handleImport } =
    useImportExportLogic();

  return (
    <div className='w-full space-y-6 animate-fade-in m-auto'>
      <PageTitle
        title='Import / Export Catalog'
        description='Back up your agents, teams, and skills catalog or restore it on another machine.'
      />

      <Card>
        <CardHeader>
          <CardTitle>Export Catalog</CardTitle>
          <CardDescription>
            Save a snapshot of your global catalog (agents, teams, skills) to a JSON file. You can
            import this file later to restore or share your configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Button onClick={handleExport} disabled={isExporting} className='gap-2'>
            {isExporting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Download className='h-4 w-4' />
            )}
            {isExporting ? 'Exporting…' : 'Export Catalog'}
          </Button>
          {exportResult && (
            <p
              className={`text-sm ${exportResult.success ? 'text-status-success' : 'text-destructive'}`}
            >
              {exportResult.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Catalog</CardTitle>
          <CardDescription>
            Load a previously exported catalog file. Only entries that do not already exist in your
            catalog will be added — existing agents, teams, and skills are never overwritten.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Button variant='outline' onClick={handleImport} disabled={isImporting} className='gap-2'>
            {isImporting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Upload className='h-4 w-4' />
            )}
            {isImporting ? 'Importing…' : 'Import Catalog'}
          </Button>
          {importResult && (
            <p
              className={`text-sm ${importResult.success ? 'text-status-success' : 'text-destructive'}`}
            >
              {importResult.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportExportPage;
