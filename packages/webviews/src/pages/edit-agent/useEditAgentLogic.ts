import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CatalogSkillEntry, DashboardStats, SkillUseDefinition } from '../../types';
import type {
  OrchestratorMaxTokens,
  RouteTaskRule,
  WorkerMaxTokens,
} from '../agent-wizard/constants';
import {
  clamp,
  isAgentRole,
  listToMultiline,
  ORCHESTRATOR_CAPABILITIES,
  ROUTER_CAPABILITIES,
  UNIQUE_DEFAULT,
  WORKER_ROLE_CAPABILITIES,
} from '../agent-wizard/constants';
import { buildAgentWizardPayload } from '../agent-wizard/payload';

const EMPTY_STATS: DashboardStats = {
  hasProfile: false,
  profileStatus: 'Not configured',
  engramInstalled: false,
  engramConfigured: false,
  totalAgents: 0,
  agentYamlCount: 0,
  validAgentYamlCount: 0,
  teamsCount: 0,
  teams: [],
  activeTeamId: null,
  teamContext: 'no_teams',
  syncStatus: 'NOT_SYNCED',
  syncTime: 'Never',
  warnings: [],
  gatingReasons: {},
  agents: [],
  globalCatalog: { teams: [], agents: [], skills: [] },
  bindings: { teamId: null, agentIds: [], skillIds: [] },
};

type HostMessage =
  | { type: 'updateStats'; stats: DashboardStats }
  | {
      type: 'agentData';
      agentId: string;
      name?: string;
      role?: string;
      description?: string;
      domain?: string;
      subdomains?: string[];
      intents?: string[];
      pathGlobs?: string[];
      keywords?: string[];
      skillUses?: SkillUseDefinition[];
      output?: {
        modeDefault?: 'short+diff' | 'diff' | 'plan' | 'structured';
      };
      context?: {
        maxFiles?: number;
        maxCharsPerFile?: number;
      };
      contextPacks?: string[];
      availableContextPacks?: string[];
      delegation?: {
        strategy?: 'disabled' | 'router_split' | 'agent_handoff';
        maxHandoffs?: number;
        allowedSubagents?: string[] | 'all';
      };
      routeTaskRules?: RouteTaskRule[];
      orchestrator?: {
        planning?: boolean;
        maxTokens?: OrchestratorMaxTokens;
        capabilities?: string[];
      };
      worker?: {
        maxTokens?: WorkerMaxTokens;
        executionEnabled?: boolean;
        capabilities?: string[];
      };
      router?: {
        capabilities?: string[];
      };
      assignedTeamIds?: string[];
      isAssignedToAnyTeam?: boolean;
      error?: string;
    }
  | { type: 'saveAgentResult'; success: boolean; error?: string }
  | { type: 'catalogSkills'; skills: CatalogSkillEntry[] }
  | { type: 'installCatalogSkillResult'; success: boolean; skillId: string; error?: string };

export const useEditAgentLogic = () => {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [subdomainsText, setSubdomainsText] = useState('');
  const [intentsText, setIntentsText] = useState('');
  const [pathGlobsText, setPathGlobsText] = useState('');
  const [keywordsText, setKeywordsText] = useState('');

  const [skillUses, setSkillUses] = useState<SkillUseDefinition[]>([]);
  const [catalogSkills, setCatalogSkills] = useState<CatalogSkillEntry[]>([]);
  const [outputMode, setOutputMode] = useState<string>(UNIQUE_DEFAULT.outputMode);
  const [maxFiles, setMaxFiles] = useState<number>(UNIQUE_DEFAULT.maxFiles);
  const [maxCharsPerFile, setMaxCharsPerFile] = useState<number>(UNIQUE_DEFAULT.maxCharsPerFile);
  const [delegationEnabled, setDelegationEnabled] = useState(false);
  const [delegationStrategy, setDelegationStrategy] = useState<string>('agent_handoff');
  const [maxHandoffs, setMaxHandoffs] = useState(1);
  const [allowedSubagentsText, setAllowedSubagentsText] = useState('all');
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [assignedTeamIds, setAssignedTeamIds] = useState<string[]>([]);
  const [routeTaskRules, setRouteTaskRules] = useState<RouteTaskRule[]>([]);
  const [orchestratorPlanning, setOrchestratorPlanning] = useState(true);
  const [orchestratorMaxTokens, setOrchestratorMaxTokens] = useState<OrchestratorMaxTokens>('high');
  const [orchestratorCapabilities, setOrchestratorCapabilities] = useState<string[]>([
    ...ORCHESTRATOR_CAPABILITIES,
  ]);
  const [routerCapabilities, setRouterCapabilities] = useState<string[]>([...ROUTER_CAPABILITIES]);
  const [workerMaxTokens, setWorkerMaxTokens] = useState<WorkerMaxTokens>('medium');
  const [workerExecutionEnabled, setWorkerExecutionEnabled] = useState(true);
  const [workerCapabilities, setWorkerCapabilities] = useState<string[]>([
    ...WORKER_ROLE_CAPABILITIES,
  ]);
  const [contextPacks, setContextPacks] = useState<string[]>([]);
  const [availableContextPacks, setAvailableContextPacks] = useState<string[]>([]);

  useEffect(() => {
    if (!agentId) {
      setIsLoading(false);
      return;
    }
    vscode.postMessage({ type: 'requestAgentData', agentId });
    vscode.postMessage({ type: 'refresh' });
    vscode.postMessage({ type: 'requestCatalogSkills' });
  }, [agentId]);

  const availableTargetAgents = useMemo(
    () =>
      stats.agents
        .filter((agent) => agent.role === 'worker' || agent.role === 'orchestrator')
        .map((agent) => ({ id: agent.id, name: agent.name })),
    [stats.agents],
  );

  useEffect(() => {
    if (role === 'router') {
      setDomain('global');
      setOutputMode('short+diff');
      setMaxFiles(8);
      setMaxCharsPerFile(8000);
      setDelegationEnabled(true);
      setDelegationStrategy('router_split');
      setMaxHandoffs(1);
      setAllowedSubagentsText('all');
    } else if (role === 'orchestrator') {
      setOutputMode('short+diff');
      setMaxFiles(8);
      setMaxCharsPerFile(8000);
      setDelegationEnabled(true);
      setDelegationStrategy('router_split');
      setMaxHandoffs((value) => clamp(value, 1, 3));
      if (!allowedSubagentsText.trim()) {
        setAllowedSubagentsText('all');
      }
    } else if (role === 'worker') {
      setDelegationStrategy('agent_handoff');
      setMaxHandoffs((value) => clamp(value, 1, 2));
      if (!domain) {
        setDomain('general');
      }
    }
  }, [allowedSubagentsText, domain, role]);

  const isConfigurationEnabled =
    name.trim().length > 0 && description.trim().length > 0 && isAgentRole(role);

  useEffect(() => {
    setCurrentStep((step) => Math.min(step, 3));
  }, []);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mapping host payload into local wizard form state
  const handleAgentData = useCallback((message: Extract<HostMessage, { type: 'agentData' }>) => {
    setIsLoading(false);
    if (message.error) {
      setLoadError(message.error);
      return;
    }
    setName(message.name ?? '');
    setRole(message.role ?? '');
    setDescription(message.description ?? '');
    setDomain(message.domain ?? '');
    setSubdomainsText(listToMultiline(message.subdomains));
    setIntentsText(listToMultiline(message.intents));
    setPathGlobsText(listToMultiline(message.pathGlobs));
    setKeywordsText(listToMultiline(message.keywords));
    setSkillUses(message.skillUses ?? []);
    setOutputMode(message.output?.modeDefault ?? 'short+diff');
    setMaxFiles(message.context?.maxFiles ?? 8);
    setMaxCharsPerFile(message.context?.maxCharsPerFile ?? 8000);

    const strategy = message.delegation?.strategy ?? 'disabled';
    const allowedText =
      message.delegation?.allowedSubagents === 'all'
        ? 'all'
        : listToMultiline(message.delegation?.allowedSubagents);
    setDelegationEnabled(strategy !== 'disabled');
    setDelegationStrategy(strategy === 'router_split' ? 'router_split' : 'agent_handoff');
    setMaxHandoffs(message.delegation?.maxHandoffs ?? 1);
    setAllowedSubagentsText(allowedText);
    setAssignedTeamIds(
      Array.isArray(message.assignedTeamIds)
        ? message.assignedTeamIds.filter((teamId): teamId is string => typeof teamId === 'string')
        : [],
    );
    setRouteTaskRules(Array.isArray(message.routeTaskRules) ? message.routeTaskRules : []);
    setOrchestratorPlanning(message.orchestrator?.planning ?? true);
    setOrchestratorMaxTokens(message.orchestrator?.maxTokens ?? 'high');
    setOrchestratorCapabilities(
      Array.isArray(message.orchestrator?.capabilities) &&
        message.orchestrator.capabilities.length > 0
        ? message.orchestrator.capabilities
        : [...ORCHESTRATOR_CAPABILITIES],
    );
    setWorkerMaxTokens(message.worker?.maxTokens ?? 'medium');
    setWorkerExecutionEnabled(message.worker?.executionEnabled ?? true);
    setWorkerCapabilities(
      Array.isArray(message.worker?.capabilities) && message.worker.capabilities.length > 0
        ? message.worker.capabilities
        : [...WORKER_ROLE_CAPABILITIES],
    );
    setRouterCapabilities(
      Array.isArray(message.router?.capabilities) && message.router.capabilities.length > 0
        ? message.router.capabilities
        : [...ROUTER_CAPABILITIES],
    );
    setContextPacks(Array.isArray(message.contextPacks) ? message.contextPacks : []);
    setAvailableContextPacks(
      Array.isArray(message.availableContextPacks) ? message.availableContextPacks : [],
    );
  }, []);

  const handleSaveAgentResult = useCallback(
    (message: Extract<HostMessage, { type: 'saveAgentResult' }>) => {
      setIsSaving(false);
      if (message.success) {
        navigate(-1);
      } else {
        setSaveError(message.error ?? 'Failed to save agent');
      }
    },
    [navigate],
  );

  const handleHostMessage = useCallback(
    (message: HostMessage) => {
      if (message.type === 'updateStats') setStats(message.stats);
      else if (message.type === 'agentData') handleAgentData(message);
      else if (message.type === 'saveAgentResult') handleSaveAgentResult(message);
      else if (message.type === 'catalogSkills') setCatalogSkills(message.skills);
      else if (message.type === 'installCatalogSkillResult' && !message.success) {
        setSaveError(message.error ?? `Failed to install skill ${message.skillId}`);
      }
    },
    [handleAgentData, handleSaveAgentResult],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostMessage>) => handleHostMessage(event.data);
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleHostMessage]);

  const addSkillUse = useCallback((entry: CatalogSkillEntry) => {
    setSkillUses((prev) => {
      if (prev.some((u) => u.id === entry.id)) return prev;
      return [...prev, { id: entry.id, when: '', tags: [...entry.tags], autoload: true }];
    });
  }, []);

  const removeSkillUse = useCallback((id: string) => {
    setSkillUses((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const updateSkillUse = useCallback((id: string, patch: Partial<SkillUseDefinition>) => {
    setSkillUses((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const onInstallCatalogSkill = useCallback(
    (skillId: string) => {
      const entry = catalogSkills.find((s) => s.id === skillId);
      if (!entry) return;
      vscode.postMessage({
        type: 'installCatalogSkill',
        skillId: entry.id,
        title: entry.title,
        description: entry.description,
        sourceType: entry.source.type,
        ref: entry.source.ref,
        version: entry.version,
        tags: entry.tags,
      });
    },
    [catalogSkills],
  );

  const handleSave = () => {
    setSaveError(null);
    setIsSaving(true);
    const payload = buildAgentWizardPayload({
      role,
      domain,
      subdomainsText,
      intentsText,
      pathGlobsText,
      keywordsText,
      skillUses,
      outputMode,
      maxFiles,
      maxCharsPerFile,
      delegationEnabled,
      delegationStrategy,
      maxHandoffs,
      allowedSubagentsText,
      routeTaskRules,
      orchestratorPlanning,
      orchestratorMaxTokens,
      orchestratorCapabilities,
      workerMaxTokens,
      workerExecutionEnabled,
      workerCapabilities,
      routerCapabilities,
    });

    vscode.postMessage({
      type: 'saveAgent',
      agentId: agentId ?? '',
      name,
      role: payload.role,
      description: description || undefined,
      domain: payload.domain,
      subdomains: payload.subdomains,
      intents: payload.intents,
      pathGlobs: payload.pathGlobs,
      keywords: payload.keywords,
      skillUses: payload.skillUses,
      output: payload.output,
      context: payload.context,
      contextPacks,
      delegation: payload.delegation,
      routeTaskRules: payload.routingRules,
      orchestrator: payload.orchestrator,
      worker: payload.worker,
      router: payload.router,
    });
  };

  const handleDelete = () => {
    vscode.postMessage({ type: 'deleteAgent', agentId: agentId ?? '' });
    navigate(-1);
  };

  const isAssignedToAnyTeam = assignedTeamIds.length > 0;
  const deleteDisabledReason = isAssignedToAnyTeam
    ? `Agent assigned to team(s): ${assignedTeamIds.join(', ')}`
    : null;

  const toggleContextPack = (packId: string) => {
    setContextPacks((prev) =>
      prev.includes(packId) ? prev.filter((p) => p !== packId) : [...prev, packId],
    );
  };

  const nextStep = () =>
    setCurrentStep((step) => {
      if (step === 0 && !isConfigurationEnabled) {
        return step;
      }
      return Math.min(step + 1, 4);
    });
  const prevStep = () => setCurrentStep((step) => Math.max(step - 1, 0));

  return {
    navigate,
    agentId,
    name,
    setName,
    role,
    setRole,
    description,
    setDescription,
    domain,
    setDomain,
    subdomainsText,
    setSubdomainsText,
    intentsText,
    setIntentsText,
    pathGlobsText,
    setPathGlobsText,
    keywordsText,
    setKeywordsText,
    skillUses,
    catalogSkills,
    addSkillUse,
    removeSkillUse,
    updateSkillUse,
    onInstallCatalogSkill,
    outputMode,
    setOutputMode,
    maxFiles,
    setMaxFiles,
    maxCharsPerFile,
    setMaxCharsPerFile,
    delegationEnabled,
    setDelegationEnabled,
    delegationStrategy,
    setDelegationStrategy,
    maxHandoffs,
    setMaxHandoffs,
    routeTaskRules,
    setRouteTaskRules,
    orchestratorPlanning,
    setOrchestratorPlanning,
    orchestratorMaxTokens,
    setOrchestratorMaxTokens,
    orchestratorCapabilities,
    setOrchestratorCapabilities,
    routerCapabilities,
    setRouterCapabilities,
    workerMaxTokens,
    setWorkerMaxTokens,
    workerExecutionEnabled,
    setWorkerExecutionEnabled,
    workerCapabilities,
    setWorkerCapabilities,
    availableTargetAgents,
    currentStep,
    setCurrentStep,
    isConfigurationEnabled,
    isLoading,
    isSaving,
    loadError,
    saveError,
    handleSave,
    handleDelete,
    isAssignedToAnyTeam,
    deleteDisabledReason,
    nextStep,
    prevStep,
    isValid: isConfigurationEnabled,
    contextPacks,
    availableContextPacks,
    toggleContextPack,
  };
};
