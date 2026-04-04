import { Button } from '@components/ui/button';
import { ArrowLeft, Bot, FileUp, Loader2 } from 'lucide-react';

type CreateAgentActionsProps = {
  createError: string | null;
  isSaving: boolean;
  saveDisabledReason?: string | null;
  isImporting: boolean;
  onCreate: () => void;
  onImport: () => void;
  onDiscard: () => void;
  lockSave: boolean;
};

export const CreateAgentActions: React.FC<CreateAgentActionsProps> = ({
  createError,
  isSaving,
  saveDisabledReason,
  isImporting,
  onCreate,
  onImport,
  onDiscard,
  lockSave,
}) => {
  return (
    <div className='flex flex-col gap-2'>
      {createError && (
        <p className='rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive'>
          {createError}
        </p>
      )}
      <Button
        className='w-full'
        disabled={lockSave}
        title={saveDisabledReason ?? undefined}
        onClick={onCreate}
      >
        {isSaving ? (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        ) : (
          <Bot className='mr-2 h-4 w-4' />
        )}
        {isSaving ? 'Creating...' : 'Create Agent'}
      </Button>
      <Button
        variant='outline'
        className='w-full'
        disabled={isSaving || isImporting}
        onClick={onImport}
      >
        {isImporting ? (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        ) : (
          <FileUp className='mr-2 h-4 w-4' />
        )}
        {isImporting ? 'Importing...' : 'Import YAML'}
      </Button>
      <Button variant='outline' className='w-full' onClick={onDiscard}>
        <ArrowLeft className='mr-2 h-4 w-4' />
        Cancel
      </Button>
    </div>
  );
};
