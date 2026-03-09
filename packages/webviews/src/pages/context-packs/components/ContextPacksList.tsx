import { Checkbox } from '@components/ui/checkbox';
import { Label } from '@components/ui/label';
import type { ContextPackPriority, ContextPackStateItem } from '../../../models';

type ContextPacksListProps = {
  packs: ContextPackStateItem[];
  selectedPacks: string[];
  onTogglePack: (pack: string) => void;
  onPriorityChange: (packId: string, priority: ContextPackPriority) => void;
};

export const ContextPacksList: React.FC<ContextPacksListProps> = ({
  packs,
  selectedPacks,
  onTogglePack,
  onPriorityChange,
}) => {
  if (packs.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        No context packs found. Create one to get started.
      </p>
    );
  }

  return (
    <div className='space-y-2'>
      {packs.map((pack) => (
        <div key={pack.id} className='rounded-md border p-2'>
          <div className='flex items-center gap-2 text-sm'>
            <Checkbox
              id={`context-pack-${pack.id}`}
              checked={selectedPacks.includes(pack.id)}
              onCheckedChange={() => onTogglePack(pack.id)}
            />
            <Label htmlFor={`context-pack-${pack.id}`} className='cursor-pointer font-medium'>
              {pack.id}
            </Label>
            <select
              value={pack.priority}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onPriorityChange(pack.id, e.target.value as ContextPackPriority)}
              className='ml-auto flex h-7 rounded-md border border-input bg-transparent px-2 py-0.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            >
              <option value='essential'>Essential</option>
              <option value='standard'>Standard</option>
              <option value='reference'>Reference</option>
            </select>
          </div>
          {pack.description && (
            <p className='mt-1 pl-6 text-xs text-muted-foreground'>{pack.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};
