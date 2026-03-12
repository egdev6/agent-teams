import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AgentPermissions,
  AgentSkillRef,
  AgentTool,
  CatalogSkillEntry,
  CreateAgentHostMessage,
  DashboardStats,
  OutputTemplateId,
} from '../../models';
import { isAgentRole } from '../agent-wizard/constants';
import { buildAgentWizardPayload } from '../agent-wizard/payload';

const DEFAULT_PERMISSIONS: AgentPermissions = {
  can_create_files: false,
  can_edit_files: false,
  can_delete_files: false,
  can_run_commands: false,
  can_delegate: false,
  can_modify_public_api: false,
  can_touch_global_config: false,
};

const EMPTY_STATS: DashboardStats = {
  hasProfile: false,
  profileStatus: 'Not configured',
  engramInstalled: false,
  engramConfigured: false,
  totalAgents: 0,
  totalTeams: 0,
  agentYamlCount: 0,
  validAgentYamlCount: 0,
  teamsCount: 0,
  teams: [],
  activeTeamId: null,
  teamContext: 'no_teams',
  syncStatus: 'NOT_SYNCED',
  syncTime: 'Never',
  syncNeeded: false,
  warnings: [],
  gatingReasons: {},
  agents: [],
  globalCatalog: { teams: [], agents: [], skills: [] },
  bindings: { teamId: null, agentIds: [], skillIds: [] },
};

export const useCreateAgentLogic = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);

  // ── Identity ──────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [expertise, setExpertise] = useState<string[]>([]);
  const [intents, setIntents] = useState<string[]>([]);

  // ── Scope ─────────────────────────────────────────────────────────────────
  const [scopeTopics, setScopeTopics] = useState<string[]>([]);
  const [scopeGlobs, setScopeGlobs] = useState('');
  const [scopeExcludes, setScopeExcludes] = useState<string[]>([]);

  // ── Workflow ──────────────────────────────────────────────────────────────
  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);

  // ── Tools & Skills ────────────────────────────────────────────────────────
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [skills, setSkills] = useState<AgentSkillRef[]>([]);
  const [catalogSkills, setCatalogSkills] = useState<CatalogSkillEntry[]>([]);

  // ── Permissions ───────────────────────────────────────────────────────────
  const [permissions, setPermissions] = useState<AgentPermissions>({ ...DEFAULT_PERMISSIONS });

  // ── Constraints ───────────────────────────────────────────────────────────
  const [constraintsAlways, setConstraintsAlways] = useState<string[]>([]);
  const [constraintsNever, setConstraintsNever] = useState<string[]>([]);
  const [constraintsEscalate, setConstraintsEscalate] = useState<string[]>([]);

  // ── Handoffs ──────────────────────────────────────────────────────────────
  const [receivesFrom, setReceivesFrom] = useState<string[]>([]);
  const [delegatesTo, setDelegatesTo] = useState<string[]>([]);
  const [escalatesTo, setEscalatesTo] = useState<string[]>([]);

  // ── Output ────────────────────────────────────────────────────────────────
  const [outputTemplate, setOutputTemplate] = useState<OutputTemplateId>('diff');
  const [outputMode, setOutputMode] = useState<'short' | 'detailed'>('short');
  const [outputMaxItems, setOutputMaxItems] = useState(5);
  const [outputNeverInclude, setOutputNeverInclude] = useState<string[]>([
    'disclaimers',
    'apologies',
    'placeholders',
  ]);
  const [outputFormatInstructions, setOutputFormatInstructions] = useState('');

  // ── Runtime ───────────────────────────────────────────────────────────────
  const [contextPacks, setContextPacks] = useState<string[]>([]);
  const [availableContextPacks, setAvailableContextPacks] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>(['copilot', 'claude']);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Message handlers ──────────────────────────────────────────────────────

  const handleCreateAgentResult = useCallback(
    (message: Extract<CreateAgentHostMessage, { type: 'createAgentResult' }>) => {
      setIsSaving(false);
      if (message.success) {
        navigate('/');
      } else {
        setCreateError(message.error ?? 'Failed to create agent');
      }
    },
    [navigate],
  );

  const handleImportAgentSpecResult = useCallback(
    (message: Extract<CreateAgentHostMessage, { type: 'importAgentSpecResult' }>) => {
      setIsImporting(false);
      if (message.success) {
        navigate('/');
      } else if (!message.canceled) {
        setCreateError(message.error ?? 'Failed to import agent spec');
      }
    },
    [navigate],
  );

  const handleContextPacksState = useCallback(
    (message: Extract<CreateAgentHostMessage, { type: 'contextPacksState' }>) => {
      const available = Array.isArray(message.selectedPacks)
        ? (message.selectedPacks as unknown[]).filter((p): p is string => typeof p === 'string')
        : [];
      setAvailableContextPacks(available);
    },
    [],
  );

  const handleHostMessage = useCallback(
    (message: CreateAgentHostMessage) => {
      switch (message.type) {
        case 'updateStats':
          setStats(message.stats);
          break;
        case 'createAgentResult':
          handleCreateAgentResult(message);
          break;
        case 'importAgentSpecResult':
          handleImportAgentSpecResult(message);
          break;
        case 'catalogSkills':
          setCatalogSkills(message.skills);
          break;
        case 'installCatalogSkillResult':
          if (!message.success) {
            setCreateError(message.error ?? `Failed to install skill ${message.skillId}`);
          }
          break;
        case 'contextPacksState':
          handleContextPacksState(message);
          break;
      }
    },
    [handleCreateAgentResult, handleImportAgentSpecResult, handleContextPacksState],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<CreateAgentHostMessage>) =>
      handleHostMessage(event.data);
    window.addEventListener('message', onMessage);
    vscode.postMessage({ type: 'refresh' });
    vscode.postMessage({ type: 'requestCatalogSkills' });
    vscode.postMessage({ type: 'requestContextPacksState' });
    return () => window.removeEventListener('message', onMessage);
  }, [handleHostMessage]);

  // Pre-populate workflow steps when role changes and steps are still empty
  useEffect(() => {
    if (!isAgentRole(role) || workflowSteps.length > 0) return;
    if (role === 'worker') {
      setWorkflowSteps([
        'Understand the task scope and expected outcome.',
        'Gather the required file and code context.',
        'Analyse with your area of expertise.',
        'Execute or respond within the boundaries of your scope.',
        'Verify your output before sending.',
      ]);
    } else if (role === 'orchestrator') {
      setWorkflowSteps([
        'Understand the high-level goal.',
        'Decompose the goal into discrete sub-tasks.',
        'Delegate each sub-task to the appropriate agent.',
        'Integrate results into a coherent whole.',
        'Validate and respond or escalate.',
      ]);
    } else if (role === 'router') {
      setWorkflowSteps([
        'Read the request fully.',
        'Identify domain and intent.',
        'Apply routing rules in priority order.',
        'Assign to matched agent with original context.',
        'If no match, escalate — never execute the task directly.',
      ]);
      setDomain('global');
      setPermissions({ ...DEFAULT_PERMISSIONS });
    }
  }, [role, workflowSteps.length]);

  const availableTargetAgents = useMemo(
    () =>
      stats.agents
        .filter((a) => a.role === 'worker' || a.role === 'orchestrator')
        .map((a) => ({ id: a.id, name: a.name })),
    [stats.agents],
  );

  const isValid = name.trim().length >= 3 && description.trim().length >= 10 && isAgentRole(role);
  const isConfigurationEnabled = isValid;

  // ── Skill helpers ─────────────────────────────────────────────────────────

  const addSkill = useCallback((entry: CatalogSkillEntry) => {
    setSkills((prev) => {
      if (prev.some((s) => s.id === entry.id)) return prev;
      return [...prev, { id: entry.id }];
    });
  }, []);

  const removeSkill = useCallback((id: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateSkill = useCallback((id: string, patch: Partial<AgentSkillRef>) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
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

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCreate = () => {
    setCreateError(null);
    setIsSaving(true);
    const payload = buildAgentWizardPayload({
      name,
      role,
      description,
      domain,
      subdomain,
      expertise,
      intents,
      scopeTopics,
      scopeGlobs,
      scopeExcludes,
      workflowSteps,
      tools,
      skills,
      permissions,
      constraintsAlways,
      constraintsNever,
      constraintsEscalate,
      receivesFrom,
      delegatesTo,
      escalatesTo,
      outputTemplate,
      outputMode,
      outputMaxItems,
      outputNeverInclude,
      outputFormatInstructions,
      contextPacks,
      targets,
    });
    vscode.postMessage({ type: 'createAgent', ...payload });
  };

  const handleImport = () => {
    setCreateError(null);
    setIsImporting(true);
    vscode.postMessage({ type: 'importAgentSpec' });
  };

  const toggleContextPack = (packId: string) => {
    setContextPacks((prev) =>
      prev.includes(packId) ? prev.filter((p) => p !== packId) : [...prev, packId],
    );
  };

  return {
    // identity
    name,
    setName,
    role,
    setRole,
    description,
    setDescription,
    domain,
    setDomain,
    subdomain,
    setSubdomain,
    expertise,
    setExpertise,
    intents,
    setIntents,
    // scope
    scopeTopics,
    setScopeTopics,
    scopeGlobs,
    setScopeGlobs,
    scopeExcludes,
    setScopeExcludes,
    // workflow & tools
    workflowSteps,
    setWorkflowSteps,
    tools,
    setTools,
    // skills
    skills,
    setSkills,
    catalogSkills,
    addSkill,
    removeSkill,
    updateSkill,
    onInstallCatalogSkill,
    // permissions
    permissions,
    setPermissions,
    // constraints
    constraintsAlways,
    setConstraintsAlways,
    constraintsNever,
    setConstraintsNever,
    constraintsEscalate,
    setConstraintsEscalate,
    // handoffs
    receivesFrom,
    setReceivesFrom,
    delegatesTo,
    setDelegatesTo,
    escalatesTo,
    setEscalatesTo,
    // output
    outputTemplate,
    setOutputTemplate,
    outputMode,
    setOutputMode: (value: 'short' | 'detailed') => setOutputMode(value),
    outputMaxItems,
    setOutputMaxItems,
    outputNeverInclude,
    setOutputNeverInclude,
    outputFormatInstructions,
    setOutputFormatInstructions,
    // runtime
    contextPacks,
    availableContextPacks,
    toggleContextPack,
    targets,
    setTargets,
    // ui
    currentStep,
    setCurrentStep,
    isConfigurationEnabled,
    isValid,
    isSaving,
    isImporting,
    createError,
    availableTargetAgents,
    handleCreate,
    handleImport,
    stats,
    navigate,
  };
};
