import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import {
  ArrowRightLeft,
  Bot,
  Brain,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Code2,
  FileText,
  FolderOpen,
  GitFork,
  Globe,
  GripVertical,
  Info,
  Lightbulb,
  ListChecks,
  type LucideIcon,
  Pencil,
  Plus,
  Search,
  Terminal,
  Wifi,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { AgentClaudeMcpServerForm, AgentMcpServerForm, AgentTool } from '../../../../models';
import type { ProjectMcpServer } from '../../../../models/dashboard';
import {
  TOOL_DESCRIPTIONS,
  TOOL_DISPLAY_NAMES,
  TOOL_GROUPS,
  TOOL_ICON_NAMES,
} from '../../constants';
import { detectEnabledProjectMcpIds } from '../../projectMcpUtils';
import type { AgentFieldErrors } from '../../useAgentFieldErrors';
import { helpTextClass } from '../styles';

type WorkflowToolsStepProps = {
  workflowSteps: string[];
  setWorkflowSteps: (_v: string[]) => void;
  tools: AgentTool[];
  setTools: (_v: AgentTool[]) => void;
  lockedToolNames?: ReadonlySet<string>;
  hiddenToolNames?: ReadonlySet<string>;
  mcpServers: AgentMcpServerForm[];
  projectMcpServers: ProjectMcpServer[];
  onToggleProjectMcp: (_id: string, _enabled: boolean) => void;
  targets?: string[];
  claudeMcpServers?: AgentClaudeMcpServerForm[];
  setClaudeMcpServers?: (_v: AgentClaudeMcpServerForm[]) => void;
  fieldErrors?: AgentFieldErrors;
  readOnly?: boolean;
};

const ICON_MAP: Record<string, LucideIcon> = {
  Code2,
  Terminal,
  FileText,
  Bot,
  Globe,
  Pencil,
  Search,
  Wifi,
  ListChecks,
  Brain,
  ArrowRightLeft,
  GitFork,
  CheckSquare,
  Lightbulb,
  FolderOpen,
};

function ToolIcon({ toolName, className }: { toolName: string; className?: string }) {
  const iconName = TOOL_ICON_NAMES[toolName];
  const Icon = iconName ? ICON_MAP[iconName] : null;
  if (!Icon) return <span className={`inline-block w-4 h-4 ${className ?? ''}`} />;
  return <Icon className={`w-4 h-4 ${className ?? ''}`} />;
}

export const WorkflowToolsStep: React.FC<WorkflowToolsStepProps> = ({
  workflowSteps,
  setWorkflowSteps,
  tools,
  setTools,
  lockedToolNames,
  hiddenToolNames,
  mcpServers,
  projectMcpServers,
  onToggleProjectMcp,
  targets,
  claudeMcpServers = [],
  setClaudeMcpServers,
  fieldErrors,
  readOnly,
}) => {
  const [newStepInput, setNewStepInput] = useState('');

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

  const enabledProjectMcpIds = detectEnabledProjectMcpIds(mcpServers, projectMcpServers);

  return (
    <div className='flex flex-col gap-6'>
      {/* Workflow Steps */}
      <div className='flex flex-col gap-2'>
        <Label>Workflow Steps *</Label>
        <p className={helpTextClass}>Define the ordered steps this agent follows.</p>
        {fieldErrors?.workflowSteps && (
          <p className='text-xs text-destructive'>{fieldErrors.workflowSteps}</p>
        )}
        <div className='flex flex-col gap-1'>
          {workflowSteps.map((step, index) => (
            <div key={step} className='flex items-center gap-1 group'>
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
                className='h-7 w-7'
                onClick={() => moveStep(index, index - 1)}
                disabled={index === 0}
              >
                <ChevronUp className='h-3 w-3' />
              </Button>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='h-7 w-7'
                onClick={() => moveStep(index, index + 1)}
                disabled={index === workflowSteps.length - 1}
              >
                <ChevronDown className='h-3 w-3' />
              </Button>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='h-7 w-7 text-destructive'
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addStep();
              }
            }}
          />
          <Button type='button' variant='vscode' size='icon' onClick={addStep}>
            <Plus />
          </Button>
        </div>
      </div>

      {/* Tools */}
      <div className='flex flex-col gap-2'>
        <Label>Tools</Label>
        {readOnly ? (
          <p className={helpTextClass}>This role has a fixed toolset.</p>
        ) : (
          <p className={helpTextClass}>Tools this agent is allowed to call.</p>
        )}

        {/* Standard tool groups — list style */}
        <div className='flex flex-col gap-4'>
          {TOOL_GROUPS.map((group) => {
            const visibleTools = group.tools.filter((n) => {
              if (hiddenToolNames?.has(n)) return false;
              if (readOnly) return tools.some((t) => t.name === n);
              return true;
            });
            if (visibleTools.length === 0) return null;
            return (
              <div key={group.label}>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5'>
                  {group.label}
                </p>
                <div className='flex flex-col gap-0.5'>
                  {visibleTools.map((toolName) => {
                    const isChecked = tools.some((t) => t.name === toolName);
                    const isLocked = lockedToolNames?.has(toolName);
                    const label = TOOL_DISPLAY_NAMES[toolName] ?? toolName;
                    const description = TOOL_DESCRIPTIONS[toolName];
                    return (
                      <div
                        key={toolName}
                        className={`flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors${
                          isLocked ? ' opacity-60' : ' hover:bg-muted/50'
                        }`}
                      >
                        <Switch
                          checked={isChecked}
                          disabled={isLocked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTools([...tools, { name: toolName }]);
                            } else {
                              setTools(tools.filter((t) => t.name !== toolName));
                            }
                          }}
                          className='shrink-0'
                        />
                        <span className='flex items-center justify-center w-6 h-6 rounded shrink-0 bg-muted text-foreground'>
                          <ToolIcon toolName={toolName} />
                        </span>
                        <span className='flex flex-col min-w-0 flex-1'>
                          <span className='text-sm font-medium leading-tight'>{label}</span>
                          {description && (
                            <span className='text-xs text-muted-foreground leading-tight'>
                              {description}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Project MCP Servers */}
      {!readOnly && (
        <div className='flex flex-col gap-2'>
          <Label>Project MCP Servers</Label>
          {projectMcpServers.length === 0 ? (
            <p className={helpTextClass}>
              No MCP servers found in project config (<code>.mcp.json</code>).
            </p>
          ) : (
            <>
              <div className='flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300'>
                <Info className='h-3.5 w-3.5 mt-0.5 shrink-0' />
                <span>
                  These MCP servers are configured in your project. Enable them to make their tools
                  available to this agent — add their tool functions to your workflow steps above.
                </span>
              </div>
              <div className='flex flex-col gap-0.5'>
                {projectMcpServers.map((server) => {
                  const isChecked = enabledProjectMcpIds.has(server.id);
                  return (
                    <div
                      key={server.id}
                      className='flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors'
                    >
                      <Switch
                        checked={isChecked}
                        onCheckedChange={(checked) => onToggleProjectMcp(server.id, checked)}
                        className='shrink-0'
                      />
                      <span className='flex items-center justify-center w-6 h-6 rounded shrink-0 bg-muted text-foreground'>
                        <Wifi className='w-4 h-4' />
                      </span>
                      <span className='flex flex-col min-w-0 flex-1'>
                        <span className='text-sm font-medium leading-tight'>{server.id}</span>
                        <span className={`${helpTextClass} truncate`}>{server.command}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Claude Code sub-agent MCP Servers */}
      {!readOnly && targets?.includes('claude_code') && (
        <div className='flex flex-col gap-2'>
          <Label>Claude Code Sub-agent MCP Servers</Label>
          <p className={helpTextClass}>
            MCP servers scoped to this sub-agent only. They connect when the sub-agent starts and
            disconnect when it finishes. Distinct from Project MCP Servers above (which sync to
            workspace config).
          </p>

          {claudeMcpServers.length > 0 && (
            <div className='flex flex-col gap-3 mt-1'>
              {claudeMcpServers.map((server, idx) => (
                <div
                  key={server._key}
                  className='flex flex-col gap-2 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.025)] p-3'
                >
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                      Server {idx + 1}
                    </span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 text-destructive'
                      onClick={() =>
                        setClaudeMcpServers?.(claudeMcpServers.filter((_, i) => i !== idx))
                      }
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </div>

                  <div className='grid grid-cols-2 gap-2'>
                    <div className='flex flex-col gap-1'>
                      <Label className='text-xs'>Name *</Label>
                      <Input
                        value={server.name}
                        placeholder='e.g. my-server'
                        className='h-8 text-sm'
                        onChange={(e) => {
                          const next = [...claudeMcpServers];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setClaudeMcpServers?.(next);
                        }}
                      />
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Label className='text-xs'>Type</Label>
                      <select
                        value={server.type}
                        className='h-8 text-sm rounded-md border border-input bg-background px-2'
                        onChange={(e) => {
                          const next = [...claudeMcpServers];
                          next[idx] = {
                            ...next[idx],
                            type: e.target.value as AgentClaudeMcpServerForm['type'],
                          };
                          setClaudeMcpServers?.(next);
                        }}
                      >
                        <option value=''>— select —</option>
                        <option value='stdio'>stdio</option>
                        <option value='http'>http</option>
                        <option value='sse'>sse</option>
                        <option value='ws'>ws</option>
                      </select>
                    </div>
                  </div>

                  <div className='flex flex-col gap-1'>
                    <Label className='text-xs'>Command</Label>
                    <Input
                      value={server.command}
                      placeholder='e.g. npx -y my-mcp-server'
                      className='h-8 text-sm'
                      onChange={(e) => {
                        const next = [...claudeMcpServers];
                        next[idx] = { ...next[idx], command: e.target.value };
                        setClaudeMcpServers?.(next);
                      }}
                    />
                  </div>

                  <div className='flex flex-col gap-1'>
                    <Label className='text-xs'>Args (one per line)</Label>
                    <textarea
                      value={server.args}
                      rows={2}
                      placeholder='--port&#10;3000'
                      className='text-sm rounded-md border border-input bg-background px-2 py-1.5 resize-y min-h-12'
                      onChange={(e) => {
                        const next = [...claudeMcpServers];
                        next[idx] = { ...next[idx], args: e.target.value };
                        setClaudeMcpServers?.(next);
                      }}
                    />
                  </div>

                  <div className='flex flex-col gap-1'>
                    <Label className='text-xs'>Env (JSON)</Label>
                    <textarea
                      value={server.env}
                      rows={2}
                      placeholder='{"API_KEY": "${MY_API_KEY}"}'
                      className='text-sm rounded-md border border-input bg-background px-2 py-1.5 resize-y min-h-12 font-mono'
                      onChange={(e) => {
                        const next = [...claudeMcpServers];
                        next[idx] = { ...next[idx], env: e.target.value };
                        setClaudeMcpServers?.(next);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-1 self-start'
            onClick={() =>
              setClaudeMcpServers?.([
                ...claudeMcpServers,
                { _key: `cm-${Date.now()}`, name: '', type: '', command: '', args: '', env: '' },
              ])
            }
          >
            <Plus className='h-3.5 w-3.5 mr-1.5' />
            Add sub-agent MCP server
          </Button>
        </div>
      )}
    </div>
  );
};
