import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import { ChevronDown, ChevronRight, GripVertical, Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { AgentMcpServerForm, AgentTool } from '../../../../models';
import { helpTextClass } from '../styles';

type WorkflowToolsStepProps = {
  role?: string;
  workflowSteps: string[];
  setWorkflowSteps: (v: string[]) => void;
  tools: AgentTool[];
  setTools: (v: AgentTool[]) => void;
  lockedToolNames?: ReadonlySet<string>;
  mcpServers: AgentMcpServerForm[];
  setMcpServers: (v: AgentMcpServerForm[]) => void;
};

export const WorkflowToolsStep: React.FC<WorkflowToolsStepProps> = ({
  role,
  workflowSteps,
  setWorkflowSteps,
  tools,
  setTools,
  lockedToolNames,
  mcpServers,
  setMcpServers,
}) => {
  const [newStepInput, setNewStepInput] = useState('');
  const [newToolName, setNewToolName] = useState('');
  const [newToolWhen, setNewToolWhen] = useState('');
  const [mcpOpen, setMcpOpen] = useState(false);
  const [newMcpId, setNewMcpId] = useState('');
  const [newMcpCommand, setNewMcpCommand] = useState('');
  const [newMcpArgs, setNewMcpArgs] = useState('');
  const [newMcpEnv, setNewMcpEnv] = useState('');

  const isRouter = role === 'router';
  const isOrchestrator = role === 'orchestrator';

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

  const addMcpServer = () => {
    const id = newMcpId.trim();
    const command = newMcpCommand.trim();
    if (!id || !command) return;
    setMcpServers([...mcpServers, { id, command, args: newMcpArgs, env: newMcpEnv }]);
    setNewMcpId('');
    setNewMcpCommand('');
    setNewMcpArgs('');
    setNewMcpEnv('');
  };

  const removeMcpServer = (index: number) => {
    setMcpServers(mcpServers.filter((_, i) => i !== index));
  };

  const updateMcpServer = (index: number, patch: Partial<AgentMcpServerForm>) => {
    const next = [...mcpServers];
    next[index] = { ...next[index], ...patch };
    setMcpServers(next);
  };

  return (
    <div className='flex flex-col gap-6'>
      {/* Workflow Steps */}
      {(isOrchestrator || isRouter) && (
        <div className='flex flex-col gap-2'>
          <Label>Workflow Steps</Label>
          <p className={helpTextClass}>Define the ordered steps this agent follows.</p>
          <div className='flex flex-col gap-1'>
            {workflowSteps.map((step, index) => (
              <div key={index} className='flex items-center gap-1 group'>
                <GripVertical className='h-4 w-4 text-muted-foreground shrink-0' />
                <Input
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                  className='flex-1 h-8 text-sm'
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 opacity-0 group-hover:opacity-100'
                  onClick={() => moveStep(index, index - 1)}
                  disabled={index === 0}
                >
                  <ChevronRight className='h-3 w-3 rotate-[-90deg]' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 opacity-0 group-hover:opacity-100'
                  onClick={() => moveStep(index, index + 1)}
                  disabled={index === workflowSteps.length - 1}
                >
                  <ChevronDown className='h-3 w-3' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive'
                  onClick={() => removeStep(index)}
                >
                  <X className='h-3 w-3' />
                </Button>
              </div>
            ))}
          </div>
          <div className='flex gap-2 mt-1'>
            <Input
              placeholder='Add a step...'
              value={newStepInput}
              onChange={(e) => setNewStepInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
              className='flex-1 h-8 text-sm'
            />
            <Button type='button' variant='outline' size='sm' onClick={addStep}>
              <Plus className='h-3 w-3 mr-1' />
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Tools */}
      <div className='flex flex-col gap-2'>
        <Label>Tools</Label>
        <p className={helpTextClass}>Tools this agent is allowed to call.</p>
        <div className='flex flex-col gap-1'>
          {tools.map((tool, index) => {
            const isLocked = lockedToolNames?.has(tool.name);
            return (
              <div key={index} className='flex items-center gap-1 group'>
                <Input
                  value={tool.name}
                  readOnly={isLocked}
                  onChange={(e) => {
                    const next = [...tools];
                    next[index] = { ...next[index], name: e.target.value };
                    setTools(next);
                  }}
                  className={cn('flex-1 h-8 text-sm', isLocked && 'opacity-60 cursor-not-allowed')}
                />
                <Input
                  placeholder='when (optional)'
                  value={tool.when ?? ''}
                  onChange={(e) => updateToolWhen(index, e.target.value)}
                  className='w-40 h-8 text-sm'
                />
                {!isLocked && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive'
                    onClick={() => removeTool(index)}
                  >
                    <X className='h-3 w-3' />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <div className='flex gap-2 mt-1'>
          <Input
            placeholder='Tool name...'
            value={newToolName}
            onChange={(e) => setNewToolName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
            className='flex-1 h-8 text-sm'
          />
          <Input
            placeholder='when (optional)'
            value={newToolWhen}
            onChange={(e) => setNewToolWhen(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
            className='w-40 h-8 text-sm'
          />
          <Button type='button' variant='outline' size='sm' onClick={addTool}>
            <Plus className='h-3 w-3 mr-1' />
            Add
          </Button>
        </div>
      </div>

      {/* MCP Servers */}
      <div className='flex flex-col gap-2'>
        <button
          type='button'
          className='flex items-center gap-1 text-sm font-medium text-left w-fit'
          onClick={() => setMcpOpen((prev) => !prev)}
        >
          {mcpOpen ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
          MCP Servers
          {mcpServers.length > 0 && (
            <span className='ml-1 text-xs text-muted-foreground'>({mcpServers.length})</span>
          )}
        </button>
        {mcpOpen && (
          <div className='flex flex-col gap-3 pl-5'>
            <p className={helpTextClass}>
              MCP servers required by this agent. They will be merged into the project MCP config on
              sync.
            </p>
            {mcpServers.map((server, index) => (
              <div key={index} className='flex flex-col gap-1 border rounded p-2 relative group'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive'
                  onClick={() => removeMcpServer(index)}
                >
                  <X className='h-3 w-3' />
                </Button>
                <div className='flex gap-2'>
                  <div className='flex flex-col gap-1 flex-1'>
                    <Label className='text-xs'>ID</Label>
                    <Input
                      value={server.id}
                      onChange={(e) => updateMcpServer(index, { id: e.target.value })}
                      className='h-7 text-xs'
                    />
                  </div>
                  <div className='flex flex-col gap-1 flex-1'>
                    <Label className='text-xs'>Command</Label>
                    <Input
                      value={server.command}
                      onChange={(e) => updateMcpServer(index, { command: e.target.value })}
                      className='h-7 text-xs'
                    />
                  </div>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-xs'>Args (one per line)</Label>
                  <textarea
                    value={server.args}
                    onChange={(e) => updateMcpServer(index, { args: e.target.value })}
                    rows={2}
                    className='w-full rounded border border-input bg-transparent px-2 py-1 text-xs resize-none'
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-xs'>Env (JSON object)</Label>
                  <textarea
                    value={server.env}
                    onChange={(e) => updateMcpServer(index, { env: e.target.value })}
                    rows={2}
                    className='w-full rounded border border-input bg-transparent px-2 py-1 text-xs resize-none font-mono'
                  />
                </div>
              </div>
            ))}
            {/* Add new MCP server */}
            <div className='flex flex-col gap-1 border border-dashed rounded p-2'>
              <div className='flex gap-2'>
                <div className='flex flex-col gap-1 flex-1'>
                  <Label className='text-xs'>ID</Label>
                  <Input
                    placeholder='my-server'
                    value={newMcpId}
                    onChange={(e) => setNewMcpId(e.target.value)}
                    className='h-7 text-xs'
                  />
                </div>
                <div className='flex flex-col gap-1 flex-1'>
                  <Label className='text-xs'>Command</Label>
                  <Input
                    placeholder='npx -y my-mcp-server'
                    value={newMcpCommand}
                    onChange={(e) => setNewMcpCommand(e.target.value)}
                    className='h-7 text-xs'
                  />
                </div>
              </div>
              <div className='flex flex-col gap-1'>
                <Label className='text-xs'>Args (one per line)</Label>
                <textarea
                  value={newMcpArgs}
                  onChange={(e) => setNewMcpArgs(e.target.value)}
                  rows={2}
                  className='w-full rounded border border-input bg-transparent px-2 py-1 text-xs resize-none'
                />
              </div>
              <div className='flex flex-col gap-1'>
                <Label className='text-xs'>Env (JSON object)</Label>
                <textarea
                  value={newMcpEnv}
                  onChange={(e) => setNewMcpEnv(e.target.value)}
                  rows={2}
                  className='w-full rounded border border-input bg-transparent px-2 py-1 text-xs resize-none font-mono'
                />
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='self-end mt-1'
                onClick={addMcpServer}
              >
                <Plus className='h-3 w-3 mr-1' />
                Add Server
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
