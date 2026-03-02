/* biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: wizard view intentionally contains role-based conditional sections */
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@lib/utils';
import { ChevronLeft, ChevronRight, ExternalLink, Plus, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { AGENT_ROLES, DOMAIN_OPTIONS, isAgentRole, OUTPUT_MODES, WORKER_SKILLS } from './constants';

const fieldClass =
  'flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
const helpTextClass = 'text-xs text-muted-foreground';

type AgentWizardCardProps = {
  name: string;
  role: string;
  description: string;
  domain: string;
  subdomainsText: string;
  intentsText: string;
  pathGlobsText: string;
  keywordsText: string;
  skillInput: string;
  skills: string[];
  outputMode: string;
  maxFiles: number;
  maxCharsPerFile: number;
  delegationEnabled: boolean;
  delegationStrategy: string;
  maxHandoffs: number;
  allowedSubagentsText: string;
  availableWorkerAgents: Array<{ id: string; name: string }>;
  currentStep: number;
  isConfigurationEnabled: boolean;
  setName: (value: string) => void;
  setRole: (value: string) => void;
  setDescription: (value: string) => void;
  setDomain: (value: string) => void;
  setSubdomainsText: (value: string) => void;
  setIntentsText: (value: string) => void;
  setPathGlobsText: (value: string) => void;
  setKeywordsText: (value: string) => void;
  setSkillInput: (value: string) => void;
  addSkill: () => void;
  toggleQuickSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  setOutputMode: (value: string) => void;
  setMaxFiles: (value: number) => void;
  setMaxCharsPerFile: (value: number) => void;
  setDelegationEnabled: (value: boolean) => void;
  setDelegationStrategy: (value: string) => void;
  setMaxHandoffs: (value: number) => void;
  setAllowedSubagentsText: (value: string) => void;
  onBrowseRegistry: () => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
};

export const AgentWizardCard: React.FC<AgentWizardCardProps> = ({
  name,
  role,
  description,
  domain,
  subdomainsText,
  intentsText,
  pathGlobsText,
  keywordsText,
  skillInput,
  skills,
  outputMode,
  maxFiles,
  maxCharsPerFile,
  delegationEnabled,
  delegationStrategy,
  maxHandoffs,
  allowedSubagentsText,
  availableWorkerAgents,
  currentStep,
  isConfigurationEnabled,
  setName,
  setRole,
  setDescription,
  setDomain,
  setSubdomainsText,
  setIntentsText,
  setPathGlobsText,
  setKeywordsText,
  setSkillInput,
  addSkill,
  toggleQuickSkill,
  removeSkill,
  setOutputMode,
  setMaxFiles,
  setMaxCharsPerFile,
  setDelegationEnabled,
  setDelegationStrategy,
  setMaxHandoffs,
  setAllowedSubagentsText,
  onBrowseRegistry,
  setCurrentStep,
  nextStep,
  prevStep,
}) => {
  const stepLabels = ['Required Data', 'Configuration'];
  const stepLabel = stepLabels[currentStep] ?? stepLabels[0];
  const requiredStep = currentStep === 0;
  const configurationStep = currentStep === 1;
  const descriptionLength = description.trim().length;
  const routerMode = role === 'router';
  const orchestratorMode = role === 'orchestrator';
  const workerMode = role === 'worker';
  const roleGuidance = {
    worker:
      'Worker agents execute implementation tasks in a focused domain. You can configure skills, output mode, and optional delegation (agent_handoff/router_split) for bounded execution.',
    router:
      'Router agents triage requests and delegate work to specialized agents. This role fixes key defaults: domain is global, skill is search_codebase, strategy is router_split, and max handoffs is 1.',
    orchestrator:
      'Orchestrator agents coordinate multi-agent workflows and do not execute file edits directly. They use router_split delegation and let you control max handoffs and allowed subagents.',
  } as const;
  const [subdomainInput, setSubdomainInput] = useState('');
  const [intentInput, setIntentInput] = useState('');
  const [pathGlobInput, setPathGlobInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  const subdomains = new Set(
    subdomainsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const intents = new Set(
    intentsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const pathGlobs = new Set(
    pathGlobsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
  const keywords = new Set(
    keywordsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
  );

  const subdomainList = Array.from(subdomains);
  const intentList = Array.from(intents);
  const pathGlobList = Array.from(pathGlobs);
  const keywordList = Array.from(keywords);

  const allowedSubagentsIsAll = allowedSubagentsText.trim().toLowerCase() === 'all';
  const allowedSubagentsList = allowedSubagentsIsAll
    ? []
    : Array.from(
        new Set(
          allowedSubagentsText
            .split(/\r?\n|,/)
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      );

  const addListItem = (
    value: string,
    current: string[],
    setCurrent: (value: string) => void,
    clearInput: () => void,
  ) => {
    const trimmed = value.trim();
    if (!trimmed || current.includes(trimmed)) {
      clearInput();
      return;
    }
    setCurrent([...current, trimmed].join('\n'));
    clearInput();
  };

  const removeListItem = (
    value: string,
    current: string[],
    setCurrent: (value: string) => void,
  ) => {
    setCurrent(current.filter((item) => item !== value).join('\n'));
  };

  const toggleAllowedSubagent = (agentId: string) => {
    const next = allowedSubagentsIsAll
      ? [agentId]
      : allowedSubagentsList.includes(agentId)
        ? allowedSubagentsList.filter((item) => item !== agentId)
        : [...allowedSubagentsList, agentId];
    setAllowedSubagentsText(next.join('\n'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Agent Wizard</CardTitle>
        <CardDescription>
          Step {currentStep + 1} of {stepLabels.length}: {stepLabel}
        </CardDescription>
        <div className='flex flex-wrap gap-1 pt-1'>
          {stepLabels.map((label, index) => (
            <Button
              key={label}
              type='button'
              size='sm'
              variant={index === currentStep ? 'default' : 'outline'}
              className='h-7 px-2 text-xs'
              disabled={index === 1 && !isConfigurationEnabled}
              onClick={() => setCurrentStep(index)}
            >
              {index + 1}. {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {requiredStep && (
          <div className='space-y-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='agent-name'>Agent Name *</Label>
              <Input
                id='agent-name'
                placeholder='e.g. Backend API Worker'
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='agent-description'>Description *</Label>
              <textarea
                id='agent-description'
                rows={4}
                placeholder='Describe what this agent does and its primary responsibilities...'
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={cn(fieldClass, 'resize-none py-2')}
              />
              <p
                className={cn(
                  helpTextClass,
                  descriptionLength < 10 ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {descriptionLength}/10 minimum characters
              </p>
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='agent-role'>Role *</Label>
              <select
                id='agent-role'
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className={cn(fieldClass, 'h-9')}
              >
                <option value=''>Select a role...</option>
                {AGENT_ROLES.map((agentRole) => (
                  <option
                    key={agentRole.value}
                    value={agentRole.value}
                    title={agentRole.description}
                  >
                    {agentRole.label}
                  </option>
                ))}
              </select>
            </div>
            {isAgentRole(role) && (
              <p className='text-xs text-muted-foreground'>{roleGuidance[role]}</p>
            )}
          </div>
        )}

        {configurationStep && (
          <div className='flex flex-col gap-2'>
            <Label htmlFor='agent-domain'>Domain</Label>
            <p className={helpTextClass}>
              Defines the primary problem space this agent should focus on. It helps routing and
              keeps decisions aligned to a consistent area.
            </p>
            <select
              id='agent-domain'
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className={cn(fieldClass, 'h-9')}
              disabled={routerMode}
            >
              <option value=''>Select a domain...</option>
              {DOMAIN_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {routerMode && (
              <p className='text-xs text-muted-foreground'>
                Router agents use <code>global</code> domain by default.
              </p>
            )}
          </div>
        )}

        {configurationStep && !routerMode && (
          <div className='flex flex-col gap-2'>
            <Label htmlFor='agent-subdomains'>Subdomains (one per line or comma separated)</Label>
            <p className={helpTextClass}>
              Narrows the domain into concrete areas of ownership. Use this to reduce overlap with
              other agents and improve handoff accuracy.
            </p>
            <div className='flex gap-2'>
              <Input
                id='agent-subdomains'
                placeholder='e.g. api'
                value={subdomainInput}
                onChange={(event) => setSubdomainInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addListItem(subdomainInput, subdomainList, setSubdomainsText, () =>
                      setSubdomainInput(''),
                    );
                  }
                }}
              />
              <Button
                type='button'
                variant='vscode'
                size='icon'
                onClick={() =>
                  addListItem(subdomainInput, subdomainList, setSubdomainsText, () =>
                    setSubdomainInput(''),
                  )
                }
              >
                <Plus className='h-4 w-4' />
              </Button>
            </div>
            {subdomainList.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {subdomainList.map((item) => (
                  <Badge key={item} variant='secondary' className='gap-1.5 pl-2'>
                    {item}
                    <button
                      type='button'
                      onClick={() => removeListItem(item, subdomainList, setSubdomainsText)}
                      className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className={helpTextClass}>No subdomains added.</p>
            )}
          </div>
        )}

        {configurationStep && (
          <div className='flex flex-col gap-2'>
            <Label htmlFor='agent-intents'>Intents (one per line or comma separated)</Label>
            <p className={helpTextClass}>
              Intents are task patterns this agent is expected to handle (for example: fixing tests
              or adding endpoints). They guide agent selection when requests are interpreted.
            </p>
            <div className='flex gap-2'>
              <Input
                id='agent-intents'
                placeholder='e.g. endpoint_add'
                value={intentInput}
                onChange={(event) => setIntentInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addListItem(intentInput, intentList, setIntentsText, () => setIntentInput(''));
                  }
                }}
              />
              <Button
                type='button'
                variant='vscode'
                size='icon'
                onClick={() =>
                  addListItem(intentInput, intentList, setIntentsText, () => setIntentInput(''))
                }
              >
                <Plus className='h-4 w-4' />
              </Button>
            </div>
            {intentList.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {intentList.map((item) => (
                  <Badge key={item} variant='secondary' className='gap-1.5 pl-2'>
                    {item}
                    <button
                      type='button'
                      onClick={() => removeListItem(item, intentList, setIntentsText)}
                      className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className={helpTextClass}>No intents added.</p>
            )}
          </div>
        )}

        {configurationStep && !routerMode && (
          <div className='flex flex-col gap-2'>
            <Label htmlFor='agent-path-globs'>Path Globs (one per line)</Label>
            <p className={helpTextClass}>
              Restricts where the agent is expected to work in the repository. Strong path
              boundaries improve safety and reduce irrelevant edits.
            </p>
            <div className='flex gap-2'>
              <Input
                id='agent-path-globs'
                placeholder='e.g. src/api/**/*.ts'
                value={pathGlobInput}
                onChange={(event) => setPathGlobInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addListItem(pathGlobInput, pathGlobList, setPathGlobsText, () =>
                      setPathGlobInput(''),
                    );
                  }
                }}
              />
              <Button
                type='button'
                variant='vscode'
                size='icon'
                onClick={() =>
                  addListItem(pathGlobInput, pathGlobList, setPathGlobsText, () =>
                    setPathGlobInput(''),
                  )
                }
              >
                <Plus className='h-4 w-4' />
              </Button>
            </div>
            {pathGlobList.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {pathGlobList.map((item) => (
                  <Badge key={item} variant='secondary' className='gap-1.5 pl-2'>
                    {item}
                    <button
                      type='button'
                      onClick={() => removeListItem(item, pathGlobList, setPathGlobsText)}
                      className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className={helpTextClass}>No path globs added.</p>
            )}
          </div>
        )}

        {configurationStep && (
          <div className='flex flex-col gap-2'>
            <Label htmlFor='agent-keywords'>Keywords (one per line or comma separated)</Label>
            <p className={helpTextClass}>
              Extra lexical signals that help match incoming requests to this agent. Add terms users
              are likely to mention when they need this capability.
            </p>
            <div className='flex gap-2'>
              <Input
                id='agent-keywords'
                placeholder='e.g. endpoint'
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addListItem(keywordInput, keywordList, setKeywordsText, () =>
                      setKeywordInput(''),
                    );
                  }
                }}
              />
              <Button
                type='button'
                variant='vscode'
                size='icon'
                onClick={() =>
                  addListItem(keywordInput, keywordList, setKeywordsText, () => setKeywordInput(''))
                }
              >
                <Plus className='h-4 w-4' />
              </Button>
            </div>
            {keywordList.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {keywordList.map((item) => (
                  <Badge key={item} variant='secondary' className='gap-1.5 pl-2'>
                    {item}
                    <button
                      type='button'
                      onClick={() => removeListItem(item, keywordList, setKeywordsText)}
                      className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className={helpTextClass}>No keywords added.</p>
            )}
          </div>
        )}

        {configurationStep && workerMode && (
          <div className='space-y-3'>
            <CardDescription className='flex items-center justify-between'>
              <span>Allowed skills for this worker agent</span>
              <Button
                variant='outline'
                size='sm'
                className='h-6 gap-1 px-2 text-xs'
                onClick={onBrowseRegistry}
              >
                <ExternalLink className='h-3 w-3' />
                Browse registry
              </Button>
            </CardDescription>
            <p className={helpTextClass}>
              Skills define what this worker is allowed to do at runtime. Fewer, targeted skills
              make behavior more predictable and reduce risk.
            </p>
            <div className='flex flex-wrap gap-2'>
              {WORKER_SKILLS.map((skill) => {
                const active = skills.includes(skill);
                return (
                  <Button
                    key={skill}
                    type='button'
                    size='icon'
                    variant={active ? 'default' : 'outline'}
                    onClick={() => toggleQuickSkill(skill)}
                    className='h-7 text-xs'
                  >
                    {skill}
                  </Button>
                );
              })}
            </div>
            <div className='flex gap-2'>
              <Input
                placeholder='e.g. custom skill id'
                value={skillInput}
                onChange={(event) => setSkillInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button variant='vscode' size='icon' onClick={addSkill}>
                <Plus className='h-4 w-4' />
              </Button>
            </div>
            {skills.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {skills.map((skill) => (
                  <Badge key={skill} variant='secondary' className='gap-1.5 pl-2'>
                    <Sparkles className='h-3 w-3' />
                    {skill}
                    <button
                      type='button'
                      onClick={() => removeSkill(skill)}
                      className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className='text-xs text-muted-foreground'>No skills selected.</p>
            )}
          </div>
        )}

        {configurationStep && workerMode && (
          <div className='space-y-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='agent-output'>Output mode</Label>
              <p className={helpTextClass}>
                Controls response format and level of structure. Choose stricter formats when you
                need consistent machine-readable output.
              </p>
              <select
                id='agent-output'
                value={outputMode}
                onChange={(event) => setOutputMode(event.target.value)}
                className={cn(fieldClass, 'h-9')}
              >
                {OUTPUT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='agent-max-files'>Context max files</Label>
                <p className={helpTextClass}>
                  Maximum number of files the agent can load as context per task. Lower values
                  reduce noise and token usage.
                </p>
                <Input
                  id='agent-max-files'
                  type='number'
                  min={1}
                  max={64}
                  value={maxFiles}
                  onChange={(event) => setMaxFiles(Number(event.target.value || 8))}
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='agent-max-chars'>Max chars per file</Label>
                <p className={helpTextClass}>
                  Caps how much content is read from each file. Useful to avoid oversized context
                  and keep focus on relevant sections.
                </p>
                <Input
                  id='agent-max-chars'
                  type='number'
                  min={500}
                  max={40000}
                  step={500}
                  value={maxCharsPerFile}
                  onChange={(event) => setMaxCharsPerFile(Number(event.target.value || 8000))}
                />
              </div>
            </div>
            <div className='space-y-2 rounded-md border border-border p-3'>
              <label className='flex items-center gap-2 text-sm font-medium'>
                <input
                  type='checkbox'
                  checked={delegationEnabled}
                  onChange={(event) => setDelegationEnabled(event.target.checked)}
                />
                Enable delegation for this worker
              </label>
              <p className={helpTextClass}>
                Delegation lets this worker pass sub-tasks to other agents. Keep it disabled for
                strict single-agent execution.
              </p>
              {delegationEnabled && (
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor='agent-delegation-strategy'>Strategy</Label>
                    <p className={helpTextClass}>
                      <code>agent_handoff</code> transfers ownership to one agent.{' '}
                      <code>router_split</code> asks a router to distribute work across specialists.
                    </p>
                    <select
                      id='agent-delegation-strategy'
                      value={delegationStrategy}
                      onChange={(event) => setDelegationStrategy(event.target.value)}
                      className={cn(fieldClass, 'h-9')}
                    >
                      <option value='agent_handoff'>agent_handoff</option>
                      <option value='router_split'>router_split</option>
                    </select>
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor='agent-max-handoffs'>Max handoffs</Label>
                    <p className={helpTextClass}>
                      Limits delegation depth. Lower numbers reduce coordination overhead and
                      execution drift.
                    </p>
                    <Input
                      id='agent-max-handoffs'
                      type='number'
                      min={1}
                      max={2}
                      value={maxHandoffs}
                      onChange={(event) => setMaxHandoffs(Number(event.target.value || 1))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {configurationStep && orchestratorMode && (
          <div className='space-y-4'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='agent-delegation-strategy-orchestrator'>Strategy</Label>
              <p className={helpTextClass}>
                Orchestrators always use <code>router_split</code> to coordinate parallel or
                specialized execution paths.
              </p>
              <Input
                id='agent-delegation-strategy-orchestrator'
                value='router_split'
                disabled
                className='bg-muted'
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='agent-max-handoffs-orchestrator'>Max handoffs (1-3)</Label>
              <p className={helpTextClass}>
                Sets how many delegation rounds are allowed before forcing consolidation. Prevents
                infinite delegation chains.
              </p>
              <Input
                id='agent-max-handoffs-orchestrator'
                type='number'
                min={1}
                max={3}
                value={maxHandoffs}
                onChange={(event) => setMaxHandoffs(Number(event.target.value || 2))}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='agent-allowed-subagents'>Allowed subagents</Label>
              <p className={helpTextClass}>
                Whitelist of agents this orchestrator can delegate to. Use <code>all</code> for open
                routing, or restrict to enforce governance boundaries.
              </p>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant={allowedSubagentsIsAll ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setAllowedSubagentsText('all')}
                >
                  Use all
                </Button>
                <Button
                  type='button'
                  variant={!allowedSubagentsIsAll ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setAllowedSubagentsText('')}
                >
                  Select workers
                </Button>
              </div>
              {!allowedSubagentsIsAll && (
                <div id='agent-allowed-subagents' className='grid gap-2 sm:grid-cols-2'>
                  {availableWorkerAgents.map((agent) => {
                    const active = allowedSubagentsList.includes(agent.id);
                    return (
                      <button
                        key={agent.id}
                        type='button'
                        onClick={() => toggleAllowedSubagent(agent.id)}
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent',
                          active ? 'border-primary bg-primary/5' : 'border-border bg-transparent',
                        )}
                      >
                        <div>
                          <p className='text-sm font-medium leading-none'>{agent.name}</p>
                          <p className='mt-1 text-xs text-muted-foreground'>{agent.id}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {!allowedSubagentsIsAll && availableWorkerAgents.length === 0 && (
                <p className={helpTextClass}>No worker agents available in the active team.</p>
              )}
              {allowedSubagentsIsAll ? (
                <Badge variant='secondary' className='w-fit'>
                  all
                </Badge>
              ) : allowedSubagentsList.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {allowedSubagentsList.map((item) => (
                    <Badge key={item} variant='secondary' className='gap-1.5 pl-2'>
                      {item}
                      <button
                        type='button'
                        onClick={() =>
                          removeListItem(item, allowedSubagentsList, setAllowedSubagentsText)
                        }
                        className='ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20'
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className={helpTextClass}>No allowed subagents added.</p>
              )}
            </div>
            <p className='text-xs text-muted-foreground'>
              Orchestrators do not execute files directly, they only coordinate delegations.
            </p>
          </div>
        )}

        {configurationStep && routerMode && (
          <p className='text-xs text-muted-foreground'>
            Router skills and delegation are fixed: <code>search_codebase</code>, strategy{' '}
            <code>router_split</code>, max handoffs <code>1</code>.
          </p>
        )}

        <div className='flex items-center justify-between pt-2'>
          {currentStep > 0 ? (
            <Button type='button' variant='outline' onClick={prevStep} className='gap-1'>
              <ChevronLeft className='h-4 w-4' />
              Back
            </Button>
          ) : (
            <div></div>
          )}
          {currentStep < stepLabels.length - 1 ? (
            <Button
              type='button'
              variant='outline'
              onClick={nextStep}
              className='gap-1'
              disabled={!isConfigurationEnabled && requiredStep}
            >
              Next
              <ChevronRight className='h-4 w-4' />
            </Button>
          ) : (
            <div></div>
          )}
        </div>

        {!isConfigurationEnabled && requiredStep && (
          <p className='text-xs text-muted-foreground'>
            Complete name, role, and a description of at least 10 characters to unlock
            configuration.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
