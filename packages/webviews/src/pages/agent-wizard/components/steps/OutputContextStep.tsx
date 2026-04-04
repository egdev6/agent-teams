import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import { cn } from '@lib/utils';
import type { OutputTemplateId } from '../../../../models';
import { OUTPUT_TEMPLATE_OPTIONS } from '../../constants';
import { ChipInput } from '../ChipInput';
import { fieldClass, helpTextClass } from '../styles';

const SYNC_TARGETS: Array<{ id: string; label: string; group: 'agents' | 'context' }> = [
  { id: 'github_copilot', label: 'GitHub Copilot', group: 'agents' },
  { id: 'claude_code', label: 'Claude Code', group: 'agents' },
  { id: 'opencode', label: 'opencode', group: 'agents' },
];

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
  claudeEffort: 'low' | 'medium' | 'high' | 'max' | undefined;
  setClaudeEffort: (v: 'low' | 'medium' | 'high' | 'max' | undefined) => void;
  claudePermissionMode: 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | undefined;
  setClaudePermissionMode: (
    v: 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | undefined,
  ) => void;
  claudeDisallowedTools: string[];
  setClaudeDisallowedTools: (v: string[]) => void;
  claudeBackground: boolean;
  setClaudeBackground: (v: boolean) => void;
  opencodeModel: string;
  setOpencodeModel: (v: string) => void;
  opencodeInstalled: boolean;
  opencodeModels: string[];
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
  claudeEffort,
  setClaudeEffort,
  claudePermissionMode,
  setClaudePermissionMode,
  claudeDisallowedTools,
  setClaudeDisallowedTools,
  claudeBackground,
  setClaudeBackground,
  opencodeModel,
  setOpencodeModel,
  opencodeInstalled,
  opencodeModels,
}) => {
  const isRouter = role === 'router';
  const opencodeSelectOptions = Array.from(
    new Set([
      ...(opencodeModel.trim() ? [opencodeModel.trim()] : []),
      ...opencodeModels.filter((m) => m.trim().length > 0),
    ]),
  );

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
        <div className='flex flex-col gap-2'>
          {SYNC_TARGETS.map((item) => (
            <div key={item.id} className='flex items-center gap-2 text-sm'>
              <Switch
                checked={targets.includes(item.id)}
                onCheckedChange={() =>
                  setTargets(
                    targets.includes(item.id)
                      ? targets.filter((t) => t !== item.id)
                      : [...targets, item.id],
                  )
                }
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {targets.includes('claude_code') && (
        <div className='flex flex-col gap-4 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.025)] p-3'>
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

          <div className='flex flex-col gap-2'>
            <Label htmlFor='claude-effort'>Effort</Label>
            <p className={helpTextClass}>
              Thinking budget for this sub-agent. Leave unset to inherit from the session.
            </p>
            <select
              id='claude-effort'
              value={claudeEffort ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setClaudeEffort(v === '' ? undefined : (v as 'low' | 'medium' | 'high' | 'max'));
              }}
              className={cn(fieldClass, 'h-9')}
            >
              <option value=''>inherit (session default)</option>
              <option value='low'>low</option>
              <option value='medium'>medium</option>
              <option value='high'>high</option>
              <option value='max'>max</option>
            </select>
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='claude-permission-mode'>Permission Mode</Label>
            <p className={helpTextClass}>
              Controls file-edit and command permissions. Leave unset to use <code>default</code>.
            </p>
            <select
              id='claude-permission-mode'
              value={claudePermissionMode ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setClaudePermissionMode(
                  v === ''
                    ? undefined
                    : (v as 'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions'),
                );
              }}
              className={cn(fieldClass, 'h-9')}
            >
              <option value=''>inherit (default)</option>
              <option value='default'>default</option>
              <option value='acceptEdits'>acceptEdits</option>
              <option value='dontAsk'>dontAsk</option>
              <option value='bypassPermissions'>bypassPermissions</option>
            </select>
          </div>

          <ChipInput
            id='claude-disallowed-tools'
            label='Disallowed Tools'
            helpText='Tool names to deny for this sub-agent (e.g. Bash, Edit). Applied on top of inherited restrictions.'
            items={claudeDisallowedTools}
            setItems={setClaudeDisallowedTools}
            placeholder='e.g. Bash'
          />

          <div className='flex items-center gap-3'>
            <Switch checked={claudeBackground} onCheckedChange={setClaudeBackground} />
            <div className='flex flex-col gap-0.5'>
              <Label className='cursor-pointer'>Background task</Label>
              <p className={helpTextClass}>Run this sub-agent as a background task.</p>
            </div>
          </div>
        </div>
      )}

      {targets.includes('opencode') && (
        <div className='flex flex-col gap-4 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.025)] p-3'>
          <Label className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Opencode Settings
          </Label>

          {!opencodeInstalled ? (
            <p className={helpTextClass}>
              opencode is not installed.{' '}
              <a
                href='https://opencode.ai'
                target='_blank'
                rel='noreferrer'
                className='underline text-primary'
              >
                Install opencode
              </a>{' '}
              to configure model settings.
            </p>
          ) : (
            <div className='flex flex-col gap-2'>
              <Label htmlFor='opencode-model'>Default Model</Label>
              <p className={helpTextClass}>
                The model opencode will use for this agent. Leave empty to use the opencode default.
              </p>
              <select
                id='opencode-model'
                value={opencodeModel}
                onChange={(e) => setOpencodeModel(e.target.value)}
                className={cn(fieldClass, 'h-9')}
              >
                <option value=''>inherit (opencode default)</option>
                {opencodeSelectOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
