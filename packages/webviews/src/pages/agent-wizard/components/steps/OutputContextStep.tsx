import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import type { OutputTemplateId } from '../../../../models';
import { OUTPUT_TEMPLATE_OPTIONS } from '../../constants';
import { ChipInput } from '../ChipInput';
import { fieldClass, helpTextClass } from '../styles';

const SYNC_TARGETS = ['github_copilot', 'claude_code'];

type OutputContextStepProps = {
  role?: string;
  outputTemplate: OutputTemplateId;
  setOutputTemplate: (v: OutputTemplateId) => void;
  outputMode: 'short' | 'detailed';
  setOutputMode: (v: 'short' | 'detailed') => void;
  outputMaxItems: number;
  setOutputMaxItems: (v: number) => void;
  outputNeverInclude: string[];
  setOutputNeverInclude: (v: string[]) => void;
  outputFormatInstructions: string;
  setOutputFormatInstructions: (v: string) => void;
  targets: string[];
  setTargets: (v: string[]) => void;
  claudeModel: 'inherit' | 'sonnet' | 'opus' | 'haiku';
  setClaudeModel: (v: 'inherit' | 'sonnet' | 'opus' | 'haiku') => void;
  claudeMaxTurns: number | undefined;
  setClaudeMaxTurns: (v: number | undefined) => void;
};

export const OutputContextStep: React.FC<OutputContextStepProps> = ({
  role,
  outputTemplate,
  setOutputTemplate,
  outputMode,
  setOutputMode,
  outputMaxItems,
  setOutputMaxItems,
  outputNeverInclude,
  setOutputNeverInclude,
  outputFormatInstructions,
  setOutputFormatInstructions,
  targets,
  setTargets,
  claudeModel,
  setClaudeModel,
  claudeMaxTurns,
  setClaudeMaxTurns,
}) => {
  const isRouter = role === 'router';

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
          disabled={isRouter}
        >
          {OUTPUT_TEMPLATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {outputTemplate === 'custom' && (
        <div className='flex flex-col gap-2'>
          <Label htmlFor='format-instructions'>Format Instructions</Label>
          <p className={helpTextClass}>
            Free-form instructions that describe the expected output format for this custom
            template.
          </p>
          <textarea
            id='format-instructions'
            value={outputFormatInstructions}
            onChange={(e) => setOutputFormatInstructions(e.target.value)}
            rows={4}
            placeholder='e.g. Output exactly one fenced YAML code block containing a complete, valid AgentSpec.'
            className={cn(fieldClass, 'resize-y min-h-20')}
          />
        </div>
      )}

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

      {!isRouter && (
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
      )}

      {!isRouter && (
        <ChipInput
          id='output-never-include'
          label='Never Include'
          helpText='Content categories to always exclude from outputs (e.g. disclaimers, apologies, placeholders).'
          items={outputNeverInclude}
          setItems={setOutputNeverInclude}
          placeholder='e.g. disclaimers'
        />
      )}

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

      {targets.includes('claude_code') && (
        <div className='flex flex-col gap-4 rounded-md border border-input p-3'>
          <Label className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Claude Code Settings
          </Label>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='claude-model'>Model</Label>
            <p className={helpTextClass}>
              Which model this sub-agent uses. &ldquo;inherit&rdquo; uses the parent session model.
            </p>
            <select
              id='claude-model'
              value={claudeModel}
              onChange={(e) =>
                setClaudeModel(e.target.value as 'inherit' | 'sonnet' | 'opus' | 'haiku')
              }
              className={cn(fieldClass, 'h-9')}
            >
              <option value='inherit'>inherit (parent session)</option>
              <option value='sonnet'>sonnet</option>
              <option value='opus'>opus</option>
              <option value='haiku'>haiku</option>
            </select>
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='claude-max-turns'>Max Turns</Label>
            <p className={helpTextClass}>
              Maximum agentic turns. Leave empty to use the Claude Code default.
            </p>
            <Input
              id='claude-max-turns'
              type='number'
              min={1}
              placeholder='default'
              value={claudeMaxTurns ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                const v = Number(raw);
                setClaudeMaxTurns(raw === '' ? undefined : v >= 1 ? Math.floor(v) : undefined);
              }}
              className='w-24'
            />
          </div>
        </div>
      )}
    </div>
  );
};
