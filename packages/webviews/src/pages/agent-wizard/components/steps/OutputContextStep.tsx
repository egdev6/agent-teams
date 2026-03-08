import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import { ExternalLink } from 'lucide-react';
import type { OutputTemplateId } from '../../../../models';
import { OUTPUT_TEMPLATE_OPTIONS } from '../../constants';
import { ChipInput } from '../ChipInput';
import { fieldClass, helpTextClass } from '../styles';

const SYNC_TARGETS = ['copilot', 'claude'];

type OutputContextStepProps = {
  outputTemplate: OutputTemplateId;
  setOutputTemplate: (v: OutputTemplateId) => void;
  outputMode: 'short' | 'detailed';
  setOutputMode: (v: 'short' | 'detailed') => void;
  outputMaxItems: number;
  setOutputMaxItems: (v: number) => void;
  outputNeverInclude: string[];
  setOutputNeverInclude: (v: string[]) => void;
  contextPacks: string[];
  availableContextPacks: string[];
  onToggleContextPack: (packId: string) => void;
  onGoToContextPacks?: () => void;
  targets: string[];
  setTargets: (v: string[]) => void;
};

export const OutputContextStep: React.FC<OutputContextStepProps> = ({
  outputTemplate,
  setOutputTemplate,
  outputMode,
  setOutputMode,
  outputMaxItems,
  setOutputMaxItems,
  outputNeverInclude,
  setOutputNeverInclude,
  contextPacks,
  availableContextPacks,
  onToggleContextPack,
  onGoToContextPacks,
  targets,
  setTargets,
}) => {
  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='output-template'>Output Template</Label>
        <p className={helpTextClass}>
          Controls the response format and structure of this agent&apos;s outputs.
        </p>
        <select
          id='output-template'
          value={outputTemplate}
          onChange={(e) => setOutputTemplate(e.target.value as OutputTemplateId)}
          className={cn(fieldClass, 'h-9')}
        >
          {OUTPUT_TEMPLATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className='flex flex-col gap-2'>
        <Label>Output Mode</Label>
        <div className='flex gap-3'>
          {(['short', 'detailed'] as const).map((mode) => (
            <label key={mode} className='flex items-center gap-2 text-sm cursor-pointer'>
              <input
                type='radio'
                name='output-mode'
                value={mode}
                checked={outputMode === mode}
                onChange={() => setOutputMode(mode)}
                className='accent-primary'
              />
              {mode === 'short' ? 'Short (concise)' : 'Detailed (verbose)'}
            </label>
          ))}
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='output-max-items'>Max Items per Section</Label>
        <p className={helpTextClass}>Maximum number of items per output section (default: 5).</p>
        <Input
          id='output-max-items'
          type='number'
          min={1}
          max={20}
          value={outputMaxItems}
          onChange={(e) => setOutputMaxItems(Number(e.target.value) || 5)}
          className='w-24'
        />
      </div>

      <ChipInput
        id='output-never-include'
        label='Never Include'
        helpText='Content categories to always exclude from outputs (e.g. disclaimers, apologies, placeholders).'
        items={outputNeverInclude}
        setItems={setOutputNeverInclude}
        placeholder='e.g. disclaimers'
      />

      <div className='flex flex-col gap-2'>
        <Label>Context Packs</Label>
        <p className={helpTextClass}>Select which project context packs this agent should load.</p>
        {availableContextPacks.length === 0 ? (
          <div className='flex flex-col gap-2'>
            <p className={helpTextClass}>No context packs configured in the project profile.</p>
            {onGoToContextPacks && (
              <button
                type='button'
                className='flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline w-fit'
                onClick={onGoToContextPacks}
              >
                <ExternalLink className='h-3 w-3' />
                Set up context packs in Profile
              </button>
            )}
          </div>
        ) : (
          <div className='space-y-2'>
            {availableContextPacks.map((pack) => (
              <label key={pack} className='flex items-center gap-2 text-sm cursor-pointer'>
                <input
                  type='checkbox'
                  checked={contextPacks.includes(pack)}
                  onChange={() => onToggleContextPack(pack)}
                  className='h-4 w-4 rounded border border-input accent-primary'
                />
                {pack}
              </label>
            ))}
            {contextPacks.length > 0 && (
              <p className={helpTextClass}>
                {contextPacks.length} pack{contextPacks.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}
      </div>

      <div className='flex flex-col gap-2'>
        <Label>Sync Targets</Label>
        <p className={helpTextClass}>Platforms this agent&apos;s spec will be synced to.</p>
        <div className='flex gap-4'>
          {SYNC_TARGETS.map((target) => (
            <label key={target} className='flex items-center gap-2 text-sm cursor-pointer'>
              <input
                type='checkbox'
                checked={targets.includes(target)}
                onChange={() =>
                  setTargets(
                    targets.includes(target)
                      ? targets.filter((item) => item !== target)
                      : [...targets, target],
                  )
                }
                className='h-4 w-4 rounded border border-input accent-primary'
              />
              {target}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
