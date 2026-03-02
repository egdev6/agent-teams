import { Button } from '@components/ui/button';
import { ShieldHalf, Trash2 } from 'lucide-react';

type CreateTeamActionsProps = {
  createError: string | null;
  canCreate: boolean;
  onCreate: () => void;
  onDiscard: () => void;
};

export const CreateTeamActions: React.FC<CreateTeamActionsProps> = ({
  createError,
  canCreate,
  onCreate,
  onDiscard,
}) => {
  return (
    <>
      {createError && <p className='text-sm text-destructive'>{createError}</p>}

      <div className='flex flex-col gap-2'>
        <Button className='w-full' disabled={!canCreate} onClick={onCreate}>
          <ShieldHalf className='mr-2 h-4 w-4' />
          Create Team
        </Button>
        <Button variant='outline' className='w-full' onClick={onDiscard}>
          <Trash2 className='mr-2 h-4 w-4' />
          Discard
        </Button>
      </div>
    </>
  );
};
