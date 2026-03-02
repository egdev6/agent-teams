import { Button } from '@components/ui/button';
import { Loader2, Trash2, User } from 'lucide-react';

type CreateAgentActionsProps = {
  createError: string | null;
  isValid: boolean;
  isSaving: boolean;
  onCreate: () => void;
  onDiscard: () => void;
};

export const CreateAgentActions: React.FC<CreateAgentActionsProps> = ({
  createError,
  isValid,
  isSaving,
  onCreate,
  onDiscard,
}) => {
  return (
    <div className='flex flex-col gap-2'>
      {createError && (
        <p className='rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive'>
          {createError}
        </p>
      )}
      <Button className='w-full' disabled={!isValid || isSaving} onClick={onCreate}>
        {isSaving ? (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        ) : (
          <User className='mr-2 h-4 w-4' />
        )}
        {isSaving ? 'Creating...' : 'Create Agent'}
      </Button>
      <Button variant='outline' className='w-full' onClick={onDiscard}>
        <Trash2 className='mr-2 h-4 w-4' />
        Discard
      </Button>
    </div>
  );
};
