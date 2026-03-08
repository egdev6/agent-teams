import { Badge } from '@components/ui/badge';
import { Checkbox } from '@components/ui/checkbox';
import { Label } from '@components/ui/label';
import type { ContextPackStateItem } from '../../../models';

type ContextPacksListProps = {
  packs: ContextPackStateItem[];
  selectedPacks: string[];
  onTogglePack: (pack: string) => void;
};

export const ContextPacksList: React.FC<ContextPacksListProps> = ({
  packs,
  selectedPacks,
  onTogglePack,
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
            <Badge variant='outline' className='ml-auto capitalize'>
              {pack.priority}
            </Badge>
          </div>
          {pack.description && (
            <p className='mt-1 pl-6 text-xs text-muted-foreground'>{pack.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};
