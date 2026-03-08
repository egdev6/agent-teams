import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { GripVertical, Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { AgentTool } from '../../../../models';
import { helpTextClass } from '../styles';

type WorkflowToolsStepProps = {
  workflowSteps: string[];
  setWorkflowSteps: (v: string[]) => void;
  tools: AgentTool[];
  setTools: (v: AgentTool[]) => void;
};

export const WorkflowToolsStep: React.FC<WorkflowToolsStepProps> = ({
  workflowSteps,
  setWorkflowSteps,
  tools,
  setTools,
}) => {
  const [newStepInput, setNewStepInput] = useState('');
  const [newToolName, setNewToolName] = useState('');
  const [newToolWhen, setNewToolWhen] = useState('');

  const addStep = () => {
    const value = newStepInput.trim();
    if (!value) return;
    setWorkflowSteps([...workflowSteps, value]);
    setNewStepInput('');
  };

  const removeStep = (index: number) => {
    setWorkflowSteps(workflowSteps.filter((_, currentIndex) => currentIndex !== index));
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= workflowSteps.length) return;
    const next = [...workflowSteps];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setWorkflowSteps(next);
  };

  const updateStep = (index: number, value: string) => {
    const next = [...workflowSteps];
    next[index] = value;
    setWorkflowSteps(next);
  };

  const addTool = () => {
    const name = newToolName.trim();
    if (!name) return;
    setTools([...tools, { name, when: newToolWhen.trim() || undefined }]);
    setNewToolName('');
    setNewToolWhen('');
  };

  const removeTool = (index: number) => {
    setTools(tools.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateToolWhen = (index: number, when: string) => {
    const next = [...tools];
    next[index] = { ...next[index], when: when || undefined };
    setTools(next);
  };

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-2'>
        <Label>Workflow Steps</Label>
        <p className={helpTextClass}>
          Ordered execution steps for this agent. Pre-filled based on role; edit or reorder as
          needed.
        </p>
        <div className='space-y-1.5'>
          {workflowSteps.map((step, index) => (
            <div key={step} className='flex items-center gap-2'>
              <button
                type='button'
                className='shrink-0 cursor-grab text-muted-foreground hover:text-foreground'
                title='Move up'
                onClick={() => moveStep(index, index - 1)}
              >
                <GripVertical className='h-4 w-4' />
              </button>
              <span className='shrink-0 w-5 text-xs text-muted-foreground text-right'>
                {index + 1}.
              </span>
              <Input
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                className='flex-1'
              />
              <button
                type='button'
                onClick={() => removeStep(index)}
                className='shrink-0 rounded-full p-0.5 hover:bg-muted-foreground/20'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            </div>
          ))}
        </div>
        <div className='flex gap-2 pt-1'>
          <Input
            placeholder='Add a workflow step...'
            value={newStepInput}
            onChange={(e) => setNewStepInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addStep();
              }
            }}
          />
          <Button type='button' variant='vscode' size='icon' onClick={addStep}>
            <Plus className='h-4 w-4' />
          </Button>
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <Label>Tools</Label>
        <p className={helpTextClass}>
          Environment capabilities available to this agent. Optionally specify a condition for when
          each tool should be used.
        </p>
        {tools.length > 0 && (
          <div className='space-y-2'>
            {tools.map((tool, index) => (
              <div
                key={tool.name}
                className='flex items-start gap-2 rounded-md border border-border p-2'
              >
                <div className='flex flex-1 flex-col gap-1'>
                  <p className='text-sm font-medium'>{tool.name}</p>
                  <Input
                    placeholder='When to use (optional)...'
                    value={tool.when ?? ''}
                    onChange={(e) => updateToolWhen(index, e.target.value)}
                    className='text-xs h-7'
                  />
                </div>
                <button
                  type='button'
                  onClick={() => removeTool(index)}
                  className='mt-0.5 shrink-0 rounded-full p-0.5 hover:bg-muted-foreground/20'
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className='flex gap-2'>
          <Input
            placeholder='Tool name (e.g. Bash, Read, Edit)...'
            value={newToolName}
            onChange={(e) => setNewToolName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTool();
              }
            }}
          />
          <Input
            placeholder='When to use (optional)...'
            value={newToolWhen}
            onChange={(e) => setNewToolWhen(e.target.value)}
            className='w-40'
          />
          <Button type='button' variant='vscode' size='icon' onClick={addTool}>
            <Plus className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  );
};
