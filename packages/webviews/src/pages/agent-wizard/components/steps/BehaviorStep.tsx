import { Label } from '@components/ui/label';
import { AgentComboInput, type AgentOption } from '../AgentComboInput';
import { ChipInput } from '../ChipInput';

type BehaviorStepProps = {
  role?: string;
  currentAgentId?: string;
  availableAgents: AgentOption[];
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
};

export const BehaviorStep: React.FC<BehaviorStepProps> = ({
  role,
  currentAgentId,
  availableAgents,
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
}) => {
  const isRouter = role === 'router';
  const isWorker = role === 'worker';

  return (
    <div className='space-y-5'>
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
        <AgentComboInput
          id='handoffs-receives'
          label='Receives from'
          helpText='Agents or roles allowed to send tasks to this agent.'
          items={receivesFrom}
          setItems={setReceivesFrom}
          availableAgents={availableAgents}
          currentAgentId={currentAgentId}
          placeholder='Select an agent or type a role name…'
        />
        {!isWorker && (
          <AgentComboInput
            id='handoffs-delegates'
            label='Delegates to'
            helpText='Agents this agent can delegate sub-tasks to.'
            items={delegatesTo}
            setItems={setDelegatesTo}
            availableAgents={availableAgents}
            currentAgentId={currentAgentId}
            placeholder='Select an agent…'
          />
        )}
        <AgentComboInput
          id='handoffs-escalates'
          label='Escalates to'
          helpText='Agents to escalate blocked tasks to.'
          items={escalatesTo}
          setItems={setEscalatesTo}
          availableAgents={availableAgents}
          currentAgentId={currentAgentId}
          placeholder='Select an agent…'
        />
      </div>
    </div>
  );
};
