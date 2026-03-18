import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import { cn } from '@lib/utils';
import type { AgentPermissions } from '../../../../models';
import { ChipInput } from '../ChipInput';
import { helpTextClass } from '../styles';

const PERMISSION_LABELS: Array<{ key: keyof AgentPermissions; label: string }> = [
  { key: 'can_create_files', label: 'Create files' },
  { key: 'can_edit_files', label: 'Edit files' },
  { key: 'can_delete_files', label: 'Delete files' },
  { key: 'can_run_commands', label: 'Run commands' },
  { key: 'can_delegate', label: 'Delegate to other agents' },
  { key: 'can_modify_public_api', label: 'Modify public API' },
  { key: 'can_touch_global_config', label: 'Touch global config' },
];

type RulesStepProps = {
  role?: string;
  permissions: AgentPermissions;
  setPermissions: (v: AgentPermissions) => void;
  constraintsAlways: string[];
  setConstraintsAlways: (v: string[]) => void;
  constraintsNever: string[];
  setConstraintsNever: (v: string[]) => void;
  constraintsEscalate: string[];
  setConstraintsEscalate: (v: string[]) => void;
  receivesFrom: string[];
  setReceivesFrom: (v: string[]) => void;
  delegatesTo: string[];
  setDelegatesTo: (v: string[]) => void;
  escalatesTo: string[];
  setEscalatesTo: (v: string[]) => void;
  engramConfigured?: boolean;
  engramAutonomous?: boolean;
  setEngramAutonomous?: (v: boolean) => void;
};

export const RulesStep: React.FC<RulesStepProps> = ({
  role,
  permissions,
  setPermissions,
  constraintsAlways,
  setConstraintsAlways,
  constraintsNever,
  setConstraintsNever,
  constraintsEscalate,
  setConstraintsEscalate,
  receivesFrom,
  setReceivesFrom,
  delegatesTo,
  setDelegatesTo,
  escalatesTo,
  setEscalatesTo,
  engramConfigured,
  engramAutonomous,
  setEngramAutonomous,
}) => {
  const isRouter = role === 'router';
  const isOrchestrator = role === 'orchestrator';
  const isWorker = role === 'worker';

  const togglePermission = (key: keyof AgentPermissions) => {
    setPermissions({ ...permissions, [key]: !permissions[key] });
  };

  const isLockedOn = (key: keyof AgentPermissions): boolean => {
    if (key === 'can_edit_files' || key === 'can_create_files') return isWorker;
    if (key === 'can_delegate') return isRouter || isOrchestrator || isWorker;
    return false;
  };

  return (
    <div className='space-y-5'>
      {!isRouter && (
        <div className='flex flex-col gap-2'>
          <Label>Permissions</Label>
          <p className={helpTextClass}>
            {isOrchestrator
              ? 'Permissions are pre-configured for orchestrator agents.'
              : isWorker
                ? 'Pre-configured for worker agents (create & edit files); adjust as needed.'
                : 'Capabilities this agent is allowed to exercise.'}
          </p>
          <div className='space-y-1.5'>
            {PERMISSION_LABELS.map(({ key, label }) => {
              const locked = isLockedOn(key);
              return (
                <label
                  key={key}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    (isOrchestrator || locked) && 'opacity-60',
                  )}
                >
                  <input
                    type='checkbox'
                    checked={permissions[key] ?? false}
                    onChange={() => togglePermission(key)}
                    disabled={isOrchestrator || locked}
                    className='h-4 w-4 rounded border border-input accent-primary disabled:cursor-not-allowed'
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {isWorker && engramConfigured && (
        <div className='flex flex-col gap-2'>
          <Label>Engram</Label>
          <div className='flex items-start gap-3'>
            <Switch
              checked={engramAutonomous ?? false}
              onCheckedChange={(v) => setEngramAutonomous?.(v)}
              className='mt-0.5'
            />
            <span className='text-sm'>
              Autonomous task context — Recall task context from Engram on session start and report
              completion automatically. Enables direct dispatch without a router or orchestrator.
            </span>
          </div>
        </div>
      )}

      {!isRouter && (
        <div className='flex flex-col gap-4'>
          <Label>Constraints</Label>
          <ChipInput
            id='constraints-always'
            label='Always'
            helpText='Rules this agent must always follow.'
            items={constraintsAlways}
            setItems={setConstraintsAlways}
            placeholder='e.g. Validate inputs before processing'
          />
          <ChipInput
            id='constraints-never'
            label='Never'
            helpText='Actions this agent must never take.'
            items={constraintsNever}
            setItems={setConstraintsNever}
            placeholder='e.g. Delete files without confirmation'
          />
          <ChipInput
            id='constraints-escalate'
            label='Escalate when'
            helpText='Conditions under which this agent should escalate instead of proceeding.'
            items={constraintsEscalate}
            setItems={setConstraintsEscalate}
            placeholder='e.g. Task requires cross-domain changes'
          />
        </div>
      )}

      <div className='flex flex-col gap-4'>
        <Label>Handoffs</Label>
        <ChipInput
          id='handoffs-receives'
          label='Receives from'
          helpText='Agent IDs or roles allowed to send tasks to this agent.'
          items={receivesFrom}
          setItems={setReceivesFrom}
          placeholder='e.g. router or orchestrator-main'
        />
        {!isWorker && (
          <div className={cn(!permissions.can_delegate && 'pointer-events-none opacity-50')}>
            <ChipInput
              id='handoffs-delegates'
              label='Delegates to'
              helpText='Agent IDs this agent can delegate sub-tasks to.'
              items={delegatesTo}
              setItems={setDelegatesTo}
              placeholder='e.g. backend-worker'
            />
          </div>
        )}
        <ChipInput
          id='handoffs-escalates'
          label='Escalates to'
          helpText='Agent IDs to escalate blocked tasks to.'
          items={escalatesTo}
          setItems={setEscalatesTo}
          placeholder='e.g. orchestrator-main'
        />
      </div>
    </div>
  );
};
