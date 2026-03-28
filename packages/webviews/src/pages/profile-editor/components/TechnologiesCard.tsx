import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

type TechnologiesCardProps = {
  technologies: string[];
  onToggleTechnology: (technology: string) => void;
  onAddTechnology: (technology: string) => void;
  onDetectTechnologies: () => void;
  isDetecting: boolean;
  detectionError?: string | null;
};

export const TechnologiesCard: React.FC<TechnologiesCardProps> = ({
  technologies,
  onToggleTechnology,
  onAddTechnology,
  onDetectTechnologies,
  isDetecting,
  detectionError,
}) => {
  const [technologyInput, setTechnologyInput] = useState('');
  const technologyOptions = Array.from(new Set(technologies)).sort();

  const handleAddFromInput = () => {
    onAddTechnology(technologyInput);
    setTechnologyInput('');
  };

  return (
    <div className='space-y-3'>
      <div className='flex justify-between items-center'>
        <p className='text-xs text-muted-foreground'>Auto-detect or add technologies manually.</p>
        <Button variant='outline' size='sm' onClick={onDetectTechnologies} disabled={isDetecting}>
          {isDetecting ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Detecting...
            </>
          ) : (
            <>
              <RefreshCw className='mr-2 h-4 w-4' />
              Re-detect
            </>
          )}
        </Button>
      </div>
      {detectionError && <p className='text-sm text-destructive'>{detectionError}</p>}
      <div className='flex gap-2'>
        <Input
          value={technologyInput}
          placeholder='Add custom technology (e.g. elixir)'
          onChange={(event) => setTechnologyInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAddFromInput();
            }
          }}
        />
        <Button type='button' variant='vscode' onClick={handleAddFromInput}>
          <Plus className='mr-2 h-4 w-4' />
          Add
        </Button>
      </div>
      {technologyOptions.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {technologyOptions.map((tech) => (
            <span
              key={tech}
              className='inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border text-xs bg-muted/40'
            >
              {tech}
              <button
                type='button'
                onClick={() => onToggleTechnology(tech)}
                className='text-muted-foreground hover:text-foreground transition-colors'
                aria-label={`Remove ${tech}`}
              >
                <X className='h-3 w-3' />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
