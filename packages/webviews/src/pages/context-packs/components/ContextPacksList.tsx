import { Checkbox } from '@components/ui/checkbox';
import { Label } from '@components/ui/label';

type ContextPacksListProps = {
  packs: string[];
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
        <div key={pack} className='flex items-center gap-2 text-sm'>
          <Checkbox
            id={`context-pack-${pack}`}
            checked={selectedPacks.includes(pack)}
            onCheckedChange={() => onTogglePack(pack)}
          />
          <Label htmlFor={`context-pack-${pack}`} className='cursor-pointer'>
            {pack}
          </Label>
        </div>
      ))}
    </div>
  );
};
