import { Button } from '@components/ui/button';
import { Separator } from '@components/ui/separator';
import { ArrowLeft, CheckCircle2, Save, Trash2 } from 'lucide-react';
import { memo, useEffect } from 'react';

type EditTeamActionsProps = {
  saveError: string | null;
  canSave: boolean;
  isActiveTeam: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSetActiveTeam: () => void;
};

export const EditTeamActions: React.FC<EditTeamActionsProps> = memo(
  ({ saveError, canSave, isActiveTeam, onSave, onCancel, onDelete, onSetActiveTeam }) => {
    useEffect(() => {
      console.log('[EditTeamActions] isActiveTeam changed to:', isActiveTeam);
    }, [isActiveTeam]);

    return (
      <>
        {saveError && <p className='text-sm text-destructive'>{saveError}</p>}
        <div className='flex flex-col gap-2'>
          <Button className='w-full' disabled={!canSave} onClick={onSave}>
            <Save className='mr-2 h-4 w-4' />
            Save Changes
          </Button>
          <Button
            variant='success'
            className='w-full'
            onClick={onSetActiveTeam}
            disabled={isActiveTeam}
          >
            <CheckCircle2 className='mr-2 h-4 w-4' />
            {isActiveTeam ? 'Active Team' : 'Set as Active Team'}
          </Button>
          <Separator />
          <Button variant='secondary' className='w-full' onClick={onDelete} disabled={isActiveTeam}>
            <Trash2 className='mr-2 h-4 w-4' />
            Delete Team
          </Button>
          <Button variant='outline' className='w-full' onClick={onCancel}>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Cancel
          </Button>
        </div>
      </>
    );
  },
);
