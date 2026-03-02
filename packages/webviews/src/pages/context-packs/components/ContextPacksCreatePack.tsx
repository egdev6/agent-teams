import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Plus } from 'lucide-react';

type ContextPacksCreatePackProps = {
  newPackName: string;
  onNameChange: (value: string) => void;
  onCreate: () => void;
};

export const ContextPacksCreatePack: React.FC<ContextPacksCreatePackProps> = ({
  newPackName,
  onNameChange,
  onCreate,
}) => {
  return (
    <div className='space-y-2 border-t pt-3'>
      <div className='flex gap-2'>
        <Input
          placeholder='new pack id (e.g. backend-architecture)'
          value={newPackName}
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onCreate();
            }
          }}
        />
        <Button variant='outline' onClick={onCreate}>
          <Plus className='mr-2 h-4 w-4' />
          Create
        </Button>
      </div>
    </div>
  );
};
