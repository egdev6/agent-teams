import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
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
            <Switch
              checked={selectedPacks.includes(pack.id)}
              onCheckedChange={() => onTogglePack(pack.id)}
            />
            <Label className='font-medium flex-1'>{pack.id}</Label>
            <select
              value={pack.priority}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onPriorityChange(pack.id, e.target.value as ContextPackPriority)}
              className='flex h-7 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.025)] px-2 py-0.5 text-xs transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:border-[rgba(255,0,54,0.55)] focus-visible:shadow-(--shadow-neon-ghost)'
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
