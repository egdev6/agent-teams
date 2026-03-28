import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@components/ui/accordion';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Download, Loader2, Trash2, Upload } from 'lucide-react';
import { PageTitle } from '@/components/shared/PageTitle';
import { useImportExportLogic } from './useImportExportLogic';

type OperationResult = { success: boolean; message: string } | null;

const ResultMessage: React.FC<{ result: OperationResult }> = ({ result }) =>
  result ? (
    <p className={`text-sm ${result.success ? 'text-status-success' : 'text-destructive'}`}>
      {result.message}
    </p>
  ) : null;

const ImportExportPage: React.FC = () => {
  const {
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
  } = useImportExportLogic();

  return (
    <div className='w-full space-y-6 animate-fade-in m-auto'>
      <PageTitle
        title='Import / Export'
        description='Back up your agents, teams, and skills catalog or restore it on another machine.'
      />

      <Card className='overflow-hidden'>
        <Accordion type='single' defaultValue='json'>
          {/* Import / Export JSON */}
          <AccordionItem value='json'>
            <AccordionTrigger>
              <div className='flex flex-col items-start gap-0.5'>
                <span className='font-semibold text-sm'>Import / Export JSON</span>
                <span className='text-xs text-muted-foreground'>
                  Catalog snapshot (agents, teams, skills)
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className='space-y-6'>
                <div className='space-y-3'>
                  <p className='text-sm text-muted-foreground'>
                    Save a snapshot of your global catalog (agents, teams, skills) to a JSON file.
                    You can import this file later to restore or share your configuration.
                  </p>
                  <div className='flex items-center gap-3'>
                    <Button onClick={handleExport} disabled={isExporting} className='gap-2'>
                      {isExporting ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Download className='h-4 w-4' />
                      )}
                      {isExporting ? 'Exporting…' : 'Export Catalog'}
                    </Button>
                    <ResultMessage result={exportResult} />
                  </div>
                </div>

                <div className='border-t pt-4 space-y-3'>
                  <p className='text-sm text-muted-foreground'>
                    Load a previously exported catalog file. Only entries that do not already exist
                    will be added — existing agents, teams, and skills are never overwritten.
                  </p>
                  <div className='flex items-center gap-3'>
                    <Button
                      variant='outline'
                      onClick={handleImport}
                      disabled={isImporting}
                      className='gap-2'
                    >
                      {isImporting ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Upload className='h-4 w-4' />
                      )}
                      {isImporting ? 'Importing…' : 'Import Catalog'}
                    </Button>
                    <ResultMessage result={importResult} />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Import / Export ZIP */}
          <AccordionItem value='zip'>
            <AccordionTrigger>
              <div className='flex flex-col items-start gap-0.5'>
                <span className='font-semibold text-sm'>Import / Export ZIP</span>
                <span className='text-xs text-muted-foreground'>
                  Full project profile (.agent-teams/)
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className='space-y-6'>
                <div className='space-y-3'>
                  <p className='text-sm text-muted-foreground'>
                    Package the entire <code>.agent-teams/</code> directory — agents, teams, context
                    packs, skills and profile config — into a portable ZIP file. Useful for
                    onboarding new team members or creating project templates.
                  </p>
                  <div className='flex items-center gap-3'>
                    <Button
                      onClick={handleExportProfile}
                      disabled={isExportingProfile}
                      className='gap-2'
                    >
                      {isExportingProfile ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Download className='h-4 w-4' />
                      )}
                      {isExportingProfile ? 'Exporting…' : 'Export Profile as ZIP'}
                    </Button>
                    <ResultMessage result={exportProfileResult} />
                  </div>
                </div>

                <div className='border-t pt-4 space-y-3'>
                  <p className='text-sm text-muted-foreground'>
                    Restore a previously exported profile ZIP into the current workspace. Files that
                    already exist will prompt for confirmation before being overwritten.
                  </p>
                  <div className='flex items-center gap-3'>
                    <Button
                      variant='outline'
                      onClick={handleImportProfile}
                      disabled={isImportingProfile}
                      className='gap-2'
                    >
                      {isImportingProfile ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Upload className='h-4 w-4' />
                      )}
                      {isImportingProfile ? 'Importing…' : 'Import Profile from ZIP'}
                    </Button>
                    <ResultMessage result={importProfileResult} />
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Reset */}
          <AccordionItem value='reset'>
            <AccordionTrigger>
              <div className='flex flex-col items-start gap-0.5'>
                <span className='font-semibold text-sm text-destructive'>Reset Catalog</span>
                <span className='text-xs text-muted-foreground'>
                  Permanently delete all catalog data
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className='space-y-3'>
                <p className='text-sm text-muted-foreground'>
                  Permanently delete all agents, teams, and skills from the global catalog. This
                  action cannot be undone. You will be asked to confirm before proceeding.
                </p>
                <div className='flex items-center gap-3'>
                  <Button
                    variant='destructive'
                    onClick={handleReset}
                    disabled={isResetting}
                    className='gap-2'
                  >
                    {isResetting ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Trash2 className='h-4 w-4' />
                    )}
                    {isResetting ? 'Resetting…' : 'Reset Catalog'}
                  </Button>
                  <ResultMessage result={resetResult} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
};

export default ImportExportPage;
