import { Button } from '@components/ui/button';
import { BookOpenText, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { ContextPackPreviewItem, ContextPacksPreviewResult } from '../../../models';

type ContextPacksSelectionCardProps = {
  availablePacks: string[];
  selectedPacks: string[];
  onTogglePack: (packId: string) => void;
  onManagePacks: () => void;
  onPreview: () => void;
  packPreview: ContextPacksPreviewResult | null;
  isPreviewLoading: boolean;
};

const priorityLabel: Record<ContextPackPreviewItem['priority'], string> = {
  essential: 'essential',
  standard: 'standard',
  reference: 'ref',
};

const PreviewSection: React.FC<{ preview: ContextPacksPreviewResult }> = ({ preview }) => {
  const { budgeted, copilotLinked } = preview;
  const budgetPercent = Math.min(100, Math.round((budgeted.charsUsed / budgeted.budget) * 100));

  return (
    <div className='mt-4 space-y-3 rounded-md border border-border bg-muted/40 p-3 text-xs'>
      <div>
        <p className='mb-1 font-medium text-foreground'>
          Budget targets (claude, gemini, openai, codex)
        </p>
        <div className='mb-2 flex items-center gap-2'>
          <div className='h-2 flex-1 overflow-hidden rounded-full bg-border'>
            <div
              className='h-full rounded-full bg-primary transition-all'
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
          <span className='shrink-0 text-muted-foreground'>
            {budgeted.charsUsed.toLocaleString()} / {budgeted.budget.toLocaleString()} chars
          </span>
        </div>
        {budgeted.inlined.length > 0 && (
          <div className='mb-1'>
            <span className='text-green-600 dark:text-green-400'>
              Inlined ({budgeted.inlined.length}):
            </span>{' '}
            {budgeted.inlined.map((p) => (
              <span key={p.id} className='mr-1 rounded bg-background px-1 py-0.5 font-mono'>
                {p.id}{' '}
                <span className='text-muted-foreground'>
                  [{priorityLabel[p.priority]}, {p.charCount.toLocaleString()}c]
                </span>
              </span>
            ))}
          </div>
        )}
        {budgeted.referenced.length > 0 && (
          <div>
            <span className='text-amber-600 dark:text-amber-400'>
              Referenced ({budgeted.referenced.length}):
            </span>{' '}
            {budgeted.referenced.map((p) => (
              <span key={p.id} className='mr-1 rounded bg-background px-1 py-0.5 font-mono'>
                {p.id}{' '}
                <span className='text-muted-foreground'>
                  [{priorityLabel[p.priority]}, {p.charCount.toLocaleString()}c]
                </span>
              </span>
            ))}
          </div>
        )}
        {budgeted.inlined.length === 0 && budgeted.referenced.length === 0 && (
          <span className='text-muted-foreground'>No packs selected.</span>
        )}
      </div>

      <div className='border-t border-border pt-2'>
        <p className='mb-1 font-medium text-foreground'>GitHub Copilot</p>
        {copilotLinked.length > 0 ? (
          <span className='text-muted-foreground'>
            All {copilotLinked.length} pack(s) copied as separate files in{' '}
            <code>.github/context/</code> (no budget limit).
          </span>
        ) : (
          <span className='text-muted-foreground'>No packs selected.</span>
        )}
      </div>
    </div>
  );
};

export const ContextPacksSelectionCard: React.FC<ContextPacksSelectionCardProps> = ({
  availablePacks,
  selectedPacks,
  onTogglePack,
  onManagePacks,
  onPreview,
  packPreview,
  isPreviewLoading,
}) => {
  const allPacks = Array.from(new Set([...availablePacks, ...selectedPacks])).sort();
  const [showPreview, setShowPreview] = useState(false);

  const handlePreviewClick = () => {
    if (!showPreview) {
      setShowPreview(true);
      onPreview();
    } else {
      setShowPreview(false);
    }
  };

  const handleTogglePack = (packId: string) => {
    onTogglePack(packId);
    if (showPreview) {
      onPreview();
    }
  };

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-end gap-2'>
        <Button
          variant='ghost'
          size='sm'
          onClick={handlePreviewClick}
          aria-label={showPreview ? 'Hide preview' : 'Preview budget usage'}
        >
          {isPreviewLoading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : showPreview ? (
            <EyeOff className='mr-2 h-4 w-4' />
          ) : (
            <Eye className='mr-2 h-4 w-4' />
          )}
          {showPreview ? 'Hide' : 'Preview'}
        </Button>
        <Button variant='vscode' size='sm' onClick={onManagePacks}>
          <BookOpenText className='mr-2 h-4 w-4' />
          Manage Packs
        </Button>
      </div>
      {allPacks.length === 0 ? (
        <p className='text-sm text-muted-foreground'>
          No context packs found. Use Manage Packs to create your first one.
        </p>
      ) : (
        <div className='space-y-2'>
          {allPacks.map((pack) => (
            <label key={pack} className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                className='h-4 w-4'
                checked={selectedPacks.includes(pack)}
                onChange={() => handleTogglePack(pack)}
              />
              <span>{pack}</span>
            </label>
          ))}
        </div>
      )}
      {showPreview && packPreview && <PreviewSection preview={packPreview} />}
      {showPreview && isPreviewLoading && !packPreview && (
        <div className='mt-4 flex items-center gap-2 text-sm text-muted-foreground'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading preview…
        </div>
      )}
    </div>
  );
};
