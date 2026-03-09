import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Plus } from 'lucide-react';
import type { ContextPackPriority } from '@/models/pages/context-packs';

type ContextPacksCreatePackProps = {
  newPackName: string;
  onNameChange: (value: string) => void;
  newPackPriority: ContextPackPriority;
  onPriorityChange: (value: ContextPackPriority) => void;
  onCreate: () => void;
};

export const ContextPacksCreatePack: React.FC<ContextPacksCreatePackProps> = ({
  newPackName,
  onNameChange,
  newPackPriority,
  onPriorityChange,
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
        <select
          value={newPackPriority}
          onChange={(event) => onPriorityChange(event.target.value as ContextPackPriority)}
          className='flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
        >
          <option value='essential'>Essential</option>
          <option value='standard'>Standard</option>
          <option value='reference'>Reference</option>
        </select>
        <Button variant='outline' onClick={onCreate}>
          <Plus className='mr-2 h-4 w-4' />
          Create
        </Button>
      </div>
    </div>
  );
};
