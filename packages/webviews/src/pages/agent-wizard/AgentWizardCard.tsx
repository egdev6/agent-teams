/* biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: wizard view intentionally contains role-based conditional sections */
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@components/ui/tabs';
import { cn } from '@lib/utils';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Plus,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { CatalogSkillEntry, SkillUseDefinition } from '../../types';
import type { OrchestratorMaxTokens, RouteTaskRule, WorkerMaxTokens } from './constants';
import {
  AGENT_ROLES,
  ALL_CAPABILITIES,
  DOMAIN_OPTIONS,
  isAgentRole,
  ORCHESTRATOR_MAX_TOKENS_OPTIONS,
  OUTPUT_MODES,
  WORKER_MAX_TOKENS_OPTIONS,
} from './constants';

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
  skillUses: SkillUseDefinition[];
  catalogSkills: CatalogSkillEntry[];
  outputMode: string;
  maxFiles: number;
  maxCharsPerFile: number;
  delegationEnabled: boolean;
  delegationStrategy: string;
  maxHandoffs: number;
  routeTaskRules: RouteTaskRule[];
  setRouteTaskRules: (rules: RouteTaskRule[]) => void;
  orchestratorPlanning: boolean;
  setOrchestratorPlanning: (value: boolean) => void;
  orchestratorMaxTokens: OrchestratorMaxTokens;
  setOrchestratorMaxTokens: (value: OrchestratorMaxTokens) => void;
  routerCapabilities: string[];
  setRouterCapabilities: (value: string[]) => void;
  orchestratorCapabilities: string[];
  setOrchestratorCapabilities: (value: string[]) => void;
  workerMaxTokens: WorkerMaxTokens;
  setWorkerMaxTokens: (value: WorkerMaxTokens) => void;
  workerExecutionEnabled: boolean;
  setWorkerExecutionEnabled: (value: boolean) => void;
  workerCapabilities: string[];
  setWorkerCapabilities: (value: string[]) => void;
  availableTargetAgents: Array<{ id: string; name: string }>;
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
  addSkillUse: (entry: CatalogSkillEntry) => void;
  removeSkillUse: (id: string) => void;
  updateSkillUse: (id: string, patch: Partial<SkillUseDefinition>) => void;
  onInstallCatalogSkill: (skillId: string) => void;
  setOutputMode: (value: string) => void;
  setMaxFiles: (value: number) => void;
  setMaxCharsPerFile: (value: number) => void;
  setDelegationEnabled: (value: boolean) => void;
  setDelegationStrategy: (value: string) => void;
  setMaxHandoffs: (value: number) => void;
  onBrowseRegistry: () => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  contextPacks?: string[];
  availableContextPacks?: string[];
  onToggleContextPack?: (packId: string) => void;
  onGoToContextPacks?: () => void;
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
  skillUses,
  catalogSkills,
  outputMode,
  maxFiles,
  maxCharsPerFile,
  delegationEnabled,
  delegationStrategy,
  maxHandoffs,
  routeTaskRules,
  setRouteTaskRules,
  orchestratorPlanning,
  setOrchestratorPlanning,
  orchestratorMaxTokens,
  setOrchestratorMaxTokens,
  routerCapabilities,
  setRouterCapabilities,
  orchestratorCapabilities,
  setOrchestratorCapabilities,
  workerMaxTokens,
  setWorkerMaxTokens,
  workerExecutionEnabled,
  setWorkerExecutionEnabled,
  workerCapabilities,
  setWorkerCapabilities,
  availableTargetAgents,
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
  addSkillUse,
  removeSkillUse,
  updateSkillUse,
  onInstallCatalogSkill,
  setOutputMode,
  setMaxFiles,
  setMaxCharsPerFile,
  setDelegationEnabled,
  setDelegationStrategy,
  setMaxHandoffs,
  onBrowseRegistry,
  setCurrentStep,
  nextStep,
  prevStep,
  contextPacks = [],
  availableContextPacks = [],
  onToggleContextPack,
  onGoToContextPacks,
}) => {
  const stepLabels = ['Required Data', 'Configuration', 'Role Settings', 'Skills', 'Context Packs'];
  const stepLabel = stepLabels[currentStep] ?? stepLabels[0];
  const requiredStep = currentStep === 0;
  const configurationStep = currentStep === 1;
  const roleSettingsStep = currentStep === 2;
  const skillsStep = currentStep === 3;
  const contextPacksStep = currentStep === 4;
  const currentStepTab =
    currentStep === 4
      ? 'context-packs'
      : currentStep === 3
        ? 'skills'
        : currentStep === 2
          ? 'role-settings'
          : currentStep === 1
            ? 'configuration'
            : 'required';
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
  const [newRuleAgentId, setNewRuleAgentId] = useState('');
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});

  const addRouteRule = (agentId: string) => {
    if (!agentId) return;
    setRouteTaskRules([...routeTaskRules, { agentId, tasks: [] }]);
    setNewRuleAgentId('');
  };

  const removeRouteRule = (agentId: string) => {
    setRouteTaskRules(routeTaskRules.filter((r) => r.agentId !== agentId));
    setTaskInputs((prev) => {
      const next = { ...prev };
      delete next[agentId];
      return next;
    });
  };

  const addTaskToRule = (agentId: string) => {
    const task = (taskInputs[agentId] ?? '').trim();
    if (!task) return;
    setRouteTaskRules(
      routeTaskRules.map((r) =>
        r.agentId === agentId && !r.tasks.includes(task) ? { ...r, tasks: [...r.tasks, task] } : r,
      ),
    );
    setTaskInputs((prev) => ({ ...prev, [agentId]: '' }));
  };

  const removeTaskFromRule = (agentId: string, taskIndex: number) => {
    setRouteTaskRules(
      routeTaskRules.map((r) =>
        r.agentId === agentId ? { ...r, tasks: r.tasks.filter((_, i) => i !== taskIndex) } : r,
      ),
    );
  };

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

  const handleStepChange = (value: string) => {
    if (value === 'configuration') {
      if (!isConfigurationEnabled) return;
      setCurrentStep(1);
      return;
    }
    if (value === 'role-settings') {
      if (!isConfigurationEnabled) return;
      setCurrentStep(2);
      return;
    }
    if (value === 'skills') {
      if (!isConfigurationEnabled) return;
      setCurrentStep(3);
      return;
    }
    if (value === 'context-packs') {
      if (!isConfigurationEnabled) return;
      setCurrentStep(4);
      return;
    }
    setCurrentStep(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Agent Wizard</CardTitle>
        <CardDescription>
          Step {currentStep + 1} of {stepLabels.length}: {stepLabel}
        </CardDescription>
        <Tabs value={currentStepTab} onValueChange={handleStepChange} className='pt-1 w-full'>
          <TabsList className='w-full flex gap-4'>
            <TabsTrigger value='required' className='flex-1'>
              1. Required
            </TabsTrigger>
            <TabsTrigger
              value='configuration'
              disabled={!isConfigurationEnabled}
              className='flex-1'
            >
              2. Config
            </TabsTrigger>
            <TabsTrigger
              value='role-settings'
              disabled={!isConfigurationEnabled}
              className='flex-1'
            >
              3. Role
            </TabsTrigger>
            <TabsTrigger value='skills' disabled={!isConfigurationEnabled} className='flex-1'>
              4. Skills
            </TabsTrigger>
            <TabsTrigger
              value='context-packs'
              disabled={!isConfigurationEnabled}
              className='flex-1'
            >
              5. Context
            </TabsTrigger>
          </TabsList>
        </Tabs>
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

        {skillsStep && (
          <div className='space-y-4'>
            {/* Panel A: Catalog Picker */}
            {catalogSkills.length > 0 && (
              <div className='space-y-2'>
                <Label>Skills Catalog</Label>
                <p className={helpTextClass}>
                  Add skills from the project catalog. Install missing ones to make them available
                  in the workspace.
                </p>
                <div className='space-y-1.5'>
                  {catalogSkills.map((entry) => {
                    const isAdded = skillUses.some((u) => u.id === entry.id);
                    return (
                      <div
                        key={entry.id}
                        className='flex items-center justify-between gap-2 rounded-md border border-border p-2'
                      >
                        <div className='flex min-w-0 items-center gap-2'>
                          {entry.materialized ? (
                            <CheckCircle className='h-4 w-4 shrink-0 text-green-500' />
                          ) : (
                            <AlertCircle className='h-4 w-4 shrink-0 text-yellow-500' />
                          )}
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-medium'>{entry.title}</p>
                            <div className='flex flex-wrap gap-1'>
                              <Badge variant='outline' className='h-4 px-1 text-xs'>
                                {entry.version}
                              </Badge>
                              {entry.tags.map((tag) => (
                                <Badge key={tag} variant='secondary' className='h-4 px-1 text-xs'>
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className='flex shrink-0 gap-1'>
                          {!entry.materialized && (
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              className='h-6 gap-1 px-2 text-xs'
                              onClick={() => onInstallCatalogSkill(entry.id)}
                            >
                              <Download className='h-3 w-3' />
                              Install
                            </Button>
                          )}
                          <Button
                            type='button'
                            variant={isAdded ? 'default' : 'outline'}
                            size='sm'
                            className='h-6 px-2 text-xs'
                            disabled={isAdded}
                            onClick={() => !isAdded && addSkillUse(entry)}
                          >
                            {isAdded ? 'Added' : 'Add'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Panel B: Selected Uses */}
            <div className='space-y-2'>
              <Label>Selected Skills</Label>
              <div>
                {skillUses.length > 0 ? (
                  <div className='space-y-2'>
                    {skillUses.map((use) => {
                      const catalogEntry = catalogSkills.find((s) => s.id === use.id);
                      return (
                        <div key={use.id} className='space-y-2 rounded-md border border-border p-3'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              {catalogEntry?.materialized ? (
                                <CheckCircle className='h-3.5 w-3.5 text-green-500' />
                              ) : (
                                <AlertCircle className='h-3.5 w-3.5 text-yellow-500' />
                              )}
                              <span className='text-sm font-medium'>{use.id}</span>
                            </div>
                            <button
                              type='button'
                              onClick={() => removeSkillUse(use.id)}
                              className='rounded-full p-0.5 hover:bg-muted-foreground/20'
                            >
                              <X className='h-3.5 w-3.5' />
                            </button>
                          </div>
                          {catalogEntry && !catalogEntry.materialized && (
                            <div className='flex items-center gap-1 text-xs text-yellow-600'>
                              <AlertCircle className='h-3 w-3' />
                              Not installed in project.{' '}
                              <button
                                type='button'
                                className='underline'
                                onClick={() => onInstallCatalogSkill(use.id)}
                              >
                                Install now
                              </button>
                            </div>
                          )}
                          <div className='flex flex-col gap-1'>
                            <Label className='text-xs'>When to use</Label>
                            <textarea
                              rows={2}
                              placeholder='Condition or context when this skill should be applied...'
                              value={use.when ?? ''}
                              onChange={(e) => updateSkillUse(use.id, { when: e.target.value })}
                              className={cn(fieldClass, 'resize-none py-1 text-xs')}
                            />
                          </div>
                          <label className='flex items-center gap-2 text-xs'>
                            <input
                              type='checkbox'
                              checked={use.autoload !== false}
                              onChange={(e) =>
                                updateSkillUse(use.id, { autoload: e.target.checked })
                              }
                            />
                            Autoload
                          </label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className='flex flex-col items-center gap-2'>
                    <p className={helpTextClass}>
                      No catalog skills added. Select from the catalog above.
                    </p>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-6 gap-1 px-2 text-xs'
                      onClick={onBrowseRegistry}
                    >
                      <ExternalLink className='h-3 w-3' />
                      Browse registry
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {contextPacksStep && (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Context Packs</Label>
              <p className={helpTextClass}>
                Select which project context packs this agent should load. Only packs activated in
                the project profile are available.
              </p>
            </div>
            {availableContextPacks.length === 0 ? (
              <div className='flex flex-col gap-2'>
                <p className={helpTextClass}>No context packs configured in the project profile.</p>
                <button
                  type='button'
                  className='flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline w-fit'
                  onClick={() => onGoToContextPacks?.()}
                >
                  <ExternalLink className='h-3 w-3' />
                  Set up context packs in Profile
                </button>
              </div>
            ) : (
              <div className='space-y-2'>
                {availableContextPacks.map((pack) => (
                  <div key={pack} className='flex items-center gap-2 text-sm'>
                    <input
                      id={`agent-pack-${pack}`}
                      type='checkbox'
                      checked={contextPacks.includes(pack)}
                      onChange={() => onToggleContextPack?.(pack)}
                      className='h-4 w-4 rounded border border-input accent-primary'
                    />
                    <label htmlFor={`agent-pack-${pack}`} className='cursor-pointer'>
                      {pack}
                    </label>
                  </div>
                ))}
                {contextPacks.length > 0 && (
                  <p className='text-xs text-muted-foreground pt-1'>
                    {contextPacks.length} pack{contextPacks.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
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
            <p className='text-xs text-muted-foreground'>
              Orchestrators do not execute files directly, they only coordinate delegations.
              Configure which agents handle each task type in Step 3.
            </p>
          </div>
        )}

        {configurationStep && routerMode && (
          <p className='text-xs text-muted-foreground'>
            Router skills and delegation are fixed: <code>search_codebase</code>, strategy{' '}
            <code>router_split</code>, max handoffs <code>1</code>.
          </p>
        )}

        {roleSettingsStep && routerMode && (
          <div className='space-y-4'>
            <div className='flex flex-col gap-1'>
              <Label>Routing Rules</Label>
              <p className={helpTextClass}>
                Assign task types to specific agents. The router will use these rules to decide
                which agent handles each request.
              </p>
            </div>
            {availableTargetAgents.length === 0 ? (
              <p className={helpTextClass}>
                No worker or orchestrator agents available in the active team to route to.
              </p>
            ) : (
              <div className='space-y-3'>
                {routeTaskRules.map((rule) => {
                  const agent = availableTargetAgents.find((a) => a.id === rule.agentId);
                  return (
                    <div
                      key={rule.agentId}
                      className='space-y-2 rounded-md border border-border p-3'
                    >
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-sm font-medium'>{agent?.name ?? rule.agentId}</p>
                          <p className='text-xs text-muted-foreground'>@{rule.agentId}</p>
                        </div>
                        <button
                          type='button'
                          onClick={() => removeRouteRule(rule.agentId)}
                          className='rounded-full p-0.5 hover:bg-muted-foreground/20'
                        >
                          <X className='h-3.5 w-3.5' />
                        </button>
                      </div>
                      {rule.tasks.length > 0 && (
                        <div className='flex flex-wrap gap-1.5'>
                          {rule.tasks.map((task, idx) => (
                            <Badge
                              key={`${rule.agentId}-${idx}`}
                              variant='secondary'
                              className='gap-1 pl-2'
                            >
                              {task}
                              <button
                                type='button'
                                onClick={() => removeTaskFromRule(rule.agentId, idx)}
                                className='ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20'
                              >
                                <X className='h-2.5 w-2.5' />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className='flex gap-2'>
                        <Input
                          placeholder='Add a task type...'
                          value={taskInputs[rule.agentId] ?? ''}
                          onChange={(e) =>
                            setTaskInputs((prev) => ({ ...prev, [rule.agentId]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTaskToRule(rule.agentId);
                            }
                          }}
                        />
                        <Button
                          type='button'
                          variant='vscode'
                          size='icon'
                          onClick={() => addTaskToRule(rule.agentId)}
                        >
                          <Plus className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {availableTargetAgents.some(
                  (a) => !routeTaskRules.some((r) => r.agentId === a.id),
                ) && (
                  <div className='flex gap-2'>
                    <select
                      value={newRuleAgentId}
                      onChange={(e) => setNewRuleAgentId(e.target.value)}
                      className={cn(fieldClass, 'h-9')}
                    >
                      <option value=''>Select agent to route to...</option>
                      {availableTargetAgents
                        .filter((a) => !routeTaskRules.some((r) => r.agentId === a.id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} (@{a.id})
                          </option>
                        ))}
                    </select>
                    <Button
                      type='button'
                      variant='vscode'
                      disabled={!newRuleAgentId}
                      onClick={() => addRouteRule(newRuleAgentId)}
                      className='shrink-0 gap-1'
                    >
                      <Plus className='h-4 w-4' />
                      Add
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className='space-y-2'>
              <Label>Capabilities</Label>
              <p className={helpTextClass}>Select the tools this router is allowed to use.</p>
              <div className='flex flex-wrap gap-2'>
                {ALL_CAPABILITIES.map((cap) => {
                  const active = routerCapabilities.includes(cap);
                  return (
                    <button
                      key={cap}
                      type='button'
                      onClick={() =>
                        setRouterCapabilities(
                          active
                            ? routerCapabilities.filter((c) => c !== cap)
                            : [...routerCapabilities, cap],
                        )
                      }
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground',
                      )}
                    >
                      {cap}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {roleSettingsStep && orchestratorMode && (
          <div className='space-y-5'>
            <div className='flex flex-col gap-1'>
              <Label>Routing Rules</Label>
              <p className={helpTextClass}>
                Assign task types to specific agents. The orchestrator will use these rules to
                decide which agent handles each delegated request.
              </p>
            </div>
            {availableTargetAgents.length === 0 ? (
              <p className={helpTextClass}>
                No worker or orchestrator agents available in the active team to route to.
              </p>
            ) : (
              <div className='space-y-3'>
                {routeTaskRules.map((rule) => {
                  const agent = availableTargetAgents.find((a) => a.id === rule.agentId);
                  return (
                    <div
                      key={rule.agentId}
                      className='space-y-2 rounded-md border border-border p-3'
                    >
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='text-sm font-medium'>{agent?.name ?? rule.agentId}</p>
                          <p className='text-xs text-muted-foreground'>@{rule.agentId}</p>
                        </div>
                        <button
                          type='button'
                          onClick={() => removeRouteRule(rule.agentId)}
                          className='rounded-full p-0.5 hover:bg-muted-foreground/20'
                        >
                          <X className='h-3.5 w-3.5' />
                        </button>
                      </div>
                      {rule.tasks.length > 0 && (
                        <div className='flex flex-wrap gap-1.5'>
                          {rule.tasks.map((task, idx) => (
                            <Badge
                              key={`${rule.agentId}-${idx}`}
                              variant='secondary'
                              className='gap-1 pl-2'
                            >
                              {task}
                              <button
                                type='button'
                                onClick={() => removeTaskFromRule(rule.agentId, idx)}
                                className='ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20'
                              >
                                <X className='h-2.5 w-2.5' />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className='flex gap-2'>
                        <Input
                          placeholder='Add a task type...'
                          value={taskInputs[rule.agentId] ?? ''}
                          onChange={(e) =>
                            setTaskInputs((prev) => ({ ...prev, [rule.agentId]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTaskToRule(rule.agentId);
                            }
                          }}
                        />
                        <Button
                          type='button'
                          variant='vscode'
                          size='icon'
                          onClick={() => addTaskToRule(rule.agentId)}
                        >
                          <Plus className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {availableTargetAgents.some(
                  (a) => !routeTaskRules.some((r) => r.agentId === a.id),
                ) && (
                  <div className='flex gap-2'>
                    <select
                      value={newRuleAgentId}
                      onChange={(e) => setNewRuleAgentId(e.target.value)}
                      className={cn(fieldClass, 'h-9')}
                    >
                      <option value=''>Select agent to route to...</option>
                      {availableTargetAgents
                        .filter((a) => !routeTaskRules.some((r) => r.agentId === a.id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} (@{a.id})
                          </option>
                        ))}
                    </select>
                    <Button
                      type='button'
                      variant='vscode'
                      disabled={!newRuleAgentId}
                      onClick={() => addRouteRule(newRuleAgentId)}
                      className='shrink-0 gap-1'
                    >
                      <Plus className='h-4 w-4' />
                      Add
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className='flex flex-col gap-1'>
              <Label>Orchestrator Settings</Label>
              <p className={helpTextClass}>
                Configure planning, token budget, and capabilities for this orchestrator.
              </p>
            </div>

            <div className='flex items-center justify-between rounded-md border border-border p-3'>
              <div>
                <p className='text-sm font-medium'>Enable Planning</p>
                <p className={helpTextClass}>
                  Agent will produce a structured plan before delegating tasks.
                </p>
              </div>
              <button
                type='button'
                role='switch'
                aria-checked={orchestratorPlanning}
                onClick={() => setOrchestratorPlanning(!orchestratorPlanning)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  orchestratorPlanning ? 'bg-primary' : 'bg-input',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                    orchestratorPlanning ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
            </div>

            <div className='space-y-2'>
              <Label>Token Budget</Label>
              <div className='grid grid-cols-3 gap-2'>
                {ORCHESTRATOR_MAX_TOKENS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type='button'
                    onClick={() => setOrchestratorMaxTokens(opt.value)}
                    className={cn(
                      'flex flex-col items-start rounded-md border p-2.5 text-left transition-colors',
                      orchestratorMaxTokens === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    <span className='text-sm font-medium'>{opt.label}</span>
                    <span className='text-xs text-muted-foreground'>{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Capabilities</Label>
              <p className={helpTextClass}>Select the tools this orchestrator can invoke.</p>
              <div className='flex flex-wrap gap-2'>
                {ALL_CAPABILITIES.map((cap) => {
                  const active = orchestratorCapabilities.includes(cap);
                  return (
                    <button
                      key={cap}
                      type='button'
                      onClick={() =>
                        setOrchestratorCapabilities(
                          active
                            ? orchestratorCapabilities.filter((c) => c !== cap)
                            : [...orchestratorCapabilities, cap],
                        )
                      }
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground',
                      )}
                    >
                      {cap}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {roleSettingsStep && workerMode && (
          <div className='space-y-5'>
            <div className='flex flex-col gap-1'>
              <Label>Worker Settings</Label>
              <p className={helpTextClass}>
                Configure token budget, execution, and capabilities for this worker.
              </p>
            </div>

            <div className='flex items-center justify-between rounded-md border border-border p-3'>
              <div>
                <p className='text-sm font-medium'>Execution Enabled</p>
                <p className={helpTextClass}>Worker can run commands and modify files directly.</p>
              </div>
              <button
                type='button'
                role='switch'
                aria-checked={workerExecutionEnabled}
                onClick={() => setWorkerExecutionEnabled(!workerExecutionEnabled)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  workerExecutionEnabled ? 'bg-primary' : 'bg-input',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                    workerExecutionEnabled ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
            </div>

            <div className='space-y-2'>
              <Label>Token Budget</Label>
              <div className='grid grid-cols-3 gap-2'>
                {WORKER_MAX_TOKENS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type='button'
                    onClick={() => setWorkerMaxTokens(opt.value)}
                    className={cn(
                      'flex flex-col items-start rounded-md border p-2.5 text-left transition-colors',
                      workerMaxTokens === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    <span className='text-sm font-medium'>{opt.label}</span>
                    <span className='text-xs text-muted-foreground'>{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Capabilities</Label>
              <p className={helpTextClass}>Select the actions this worker is allowed to perform.</p>
              <div className='flex flex-wrap gap-2'>
                {ALL_CAPABILITIES.map((cap) => {
                  const active = workerCapabilities.includes(cap);
                  return (
                    <button
                      key={cap}
                      type='button'
                      onClick={() =>
                        setWorkerCapabilities(
                          active
                            ? workerCapabilities.filter((c) => c !== cap)
                            : [...workerCapabilities, cap],
                        )
                      }
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground',
                      )}
                    >
                      {cap}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
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
