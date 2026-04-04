import { Button } from '@components/ui/button';
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';

type EditAgentActionsProps = {
  saveError: string | null;
  isSaving: boolean;
  saveDisabledReason?: string | null;
  isDeleteDisabled: boolean;
  isDeleting?: boolean;
  deleteDisabledReason: string | null;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  lockSave: boolean;
};

export const EditAgentActions: React.FC<EditAgentActionsProps> = ({
  saveError,
  isSaving,
  saveDisabledReason,
  isDeleteDisabled,
  isDeleting,
  deleteDisabledReason,
  onSave,
  onCancel,
  onDelete,
  lockSave,
}) => {
  return (
    <div className='flex flex-col gap-2'>
      {saveError && (
        <p className='rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive'>
          {saveError}
        </p>
      )}
      <Button
        className='w-full'
        disabled={lockSave}
        title={saveDisabledReason ?? undefined}
        onClick={onSave}
      >
        {isSaving ? (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        ) : (
          <Save className='mr-2 h-4 w-4' />
        )}
        {isSaving ? 'Saving…' : 'Save Changes'}
      </Button>
      <Button
        variant='secondary'
        className='w-full'
        disabled={isDeleteDisabled || isDeleting}
        title={deleteDisabledReason ?? undefined}
        onClick={onDelete}
      >
        <Trash2 className='mr-2 h-4 w-4' />
        Delete Agent
      </Button>
      {deleteDisabledReason && (
        <p className='rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground'>
          {deleteDisabledReason}
        </p>
      )}
      <Button variant='outline' className='w-full' onClick={onCancel}>
        <ArrowLeft className='mr-2 h-4 w-4' />
        Cancel
      </Button>
    </div>
  );
};
