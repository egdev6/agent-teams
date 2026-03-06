import { Button } from '@components/ui/button';
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';

type EditAgentActionsProps = {
  saveError: string | null;
  isValid: boolean;
  isSaving: boolean;
  isDeleteDisabled: boolean;
  deleteDisabledReason: string | null;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
};

export const EditAgentActions: React.FC<EditAgentActionsProps> = ({
  saveError,
  isValid,
  isSaving,
  isDeleteDisabled,
  deleteDisabledReason,
  onSave,
  onCancel,
  onDelete,
}) => {
  return (
    <div className='flex flex-col gap-2'>
      {saveError && (
        <p className='rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive'>
          {saveError}
        </p>
      )}
      <Button className='w-full' disabled={!isValid || isSaving} onClick={onSave}>
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
        disabled={isDeleteDisabled}
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
