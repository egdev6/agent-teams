import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  AgentPermissions,
  AgentSkillRef,
  AgentTool,
  CatalogSkillEntry,
  DashboardStats,
  EditAgentHostMessage,
  OutputTemplateId,
} from '../../models';
import { isAgentRole } from '../agent-wizard/constants';

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

export const useEditAgentLogic = () => {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();
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

  // ── Workflow & Tools ──────────────────────────────────────────────────────
  const [workflowSteps, setWorkflowSteps] = useState<string[]>([]);
  const [tools, setTools] = useState<AgentTool[]>([]);

  // ── Skills ────────────────────────────────────────────────────────────────
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [assignedTeamIds, setAssignedTeamIds] = useState<string[]>([]);

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
        .filter((a) => a.role === 'worker' || a.role === 'orchestrator')
        .map((a) => ({ id: a.id, name: a.name })),
    [stats.agents],
  );

  const lockedToolNames = useMemo<ReadonlySet<string>>(() => {
    if (role === 'router') return new Set(['agent-teams-handoff']);
    if (role === 'orchestrator') return new Set(['search/codebase']);
    if (role === 'worker') return new Set(['search/codebase', 'edit/editFiles']);
    return new Set();
  }, [role]);

  const isConfigurationEnabled =
    name.trim().length >= 3 &&
    description.trim().length >= 10 &&
    isAgentRole(role) &&
    workflowSteps.length >= 1;

  const handleAgentData = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: hydrates many schema fields from host payload
    (message: Extract<EditAgentHostMessage, { type: 'agentData' }>) => {
      setIsLoading(false);
      if (message.error) {
        setLoadError(message.error);
        return;
      }
      setName(message.name ?? '');
      setRole(message.role ?? '');
      setDescription(message.description ?? '');
      setDomain(message.domain ?? '');
      setSubdomain(message.subdomain ?? '');
      setExpertise(message.expertise ?? []);
      setIntents(message.intents ?? []);

      setScopeTopics(message.scope?.topics ?? []);
      setScopeGlobs(
        (message.scope?.path_globs ?? [])
          .map((g) => (g.priority ? `${g.pattern}::${g.priority}` : g.pattern))
          .join('\n'),
      );
      setScopeExcludes(message.scope?.excludes ?? []);

      setWorkflowSteps(message.workflow ?? []);
      setTools(message.tools ?? []);
      setSkills(message.skills ?? []);

      setPermissions(message.permissions ?? { ...DEFAULT_PERMISSIONS });

      setConstraintsAlways(message.constraints?.always ?? []);
      setConstraintsNever(message.constraints?.never ?? []);
      setConstraintsEscalate(message.constraints?.escalate ?? []);

      setReceivesFrom(message.handoffs?.receives_from ?? []);
      setDelegatesTo(message.handoffs?.delegates_to ?? []);
      setEscalatesTo(message.handoffs?.escalates_to ?? []);

      setOutputTemplate(message.output?.template ?? 'diff');
      setOutputMode(message.output?.mode ?? 'short');
      setOutputMaxItems(message.output?.max_items ?? 5);
      setOutputNeverInclude(
        message.output?.never_include ?? ['disclaimers', 'apologies', 'placeholders'],
      );
      setOutputFormatInstructions(message.output?.format_instructions ?? '');

      setContextPacks(message.context_packs ?? []);
      setAvailableContextPacks(message.availableContextPacks ?? []);
      setTargets(message.targets ?? ['copilot', 'claude']);
      setAssignedTeamIds(message.assignedTeamIds ?? []);
    },
    [],
  );

  const handleSaveAgentResult = useCallback(
    (message: Extract<EditAgentHostMessage, { type: 'saveAgentResult' }>) => {
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
    (message: EditAgentHostMessage) => {
      if (message.type === 'updateStats') setStats(message.stats);
      else if (message.type === 'agentData') handleAgentData(message);
      else if (message.type === 'saveAgentResult') handleSaveAgentResult(message);
      else if (message.type === 'catalogSkills') setCatalogSkills(message.skills);
      else if (message.type === 'installCatalogSkillResult' && !message.success) {
        setSaveError(message.error ?? `Failed to install skill ${message.skillId}`);
      }
    },
    [handleSaveAgentResult, handleAgentData],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<EditAgentHostMessage>) => handleHostMessage(event.data);
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleHostMessage]);

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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: builds saveAgent payload from many schema fields
  const handleSave = () => {
    setSaveError(null);
    setIsSaving(true);
    const agentRole = isAgentRole(role) ? role : 'worker';
    const parsedGlobs = scopeGlobs
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const [pat, maybePriority] = line.split('::');
        const priority = (['high', 'medium', 'low'] as const).find((p) => p === maybePriority);
        return priority ? { pattern: pat.trim(), priority } : { pattern: pat.trim() };
      });

    vscode.postMessage({
      type: 'saveAgent',
      id: agentId ?? '',
      name: name.trim(),
      version: '1.0.0',
      role: agentRole,
      description: description.trim(),
      domain: domain || undefined,
      subdomain: subdomain.trim() || undefined,
      expertise: expertise.length > 0 ? expertise : undefined,
      intents: intents.length > 0 ? intents : undefined,
      scope:
        scopeTopics.length > 0 || parsedGlobs.length > 0 || scopeExcludes.length > 0
          ? {
              topics: scopeTopics.length > 0 ? scopeTopics : undefined,
              path_globs: parsedGlobs.length > 0 ? parsedGlobs : undefined,
              excludes: scopeExcludes.length > 0 ? scopeExcludes : undefined,
            }
          : undefined,
      workflow: workflowSteps.length > 0 ? workflowSteps : undefined,
      tools: tools.length > 0 ? tools : undefined,
      skills: skills.length > 0 ? skills : undefined,
      permissions,
      constraints:
        constraintsAlways.length > 0 ||
        constraintsNever.length > 0 ||
        constraintsEscalate.length > 0
          ? {
              always: constraintsAlways.length > 0 ? constraintsAlways : undefined,
              never: constraintsNever.length > 0 ? constraintsNever : undefined,
              escalate: constraintsEscalate.length > 0 ? constraintsEscalate : undefined,
            }
          : undefined,
      handoffs:
        receivesFrom.length > 0 || delegatesTo.length > 0 || escalatesTo.length > 0
          ? {
              receives_from: receivesFrom.length > 0 ? receivesFrom : undefined,
              delegates_to: delegatesTo.length > 0 ? delegatesTo : undefined,
              escalates_to: escalatesTo.length > 0 ? escalatesTo : undefined,
            }
          : undefined,
      output: {
        template: outputTemplate,
        mode: outputMode,
        max_items: outputMaxItems,
        never_include: outputNeverInclude.length > 0 ? outputNeverInclude : undefined,
        format_instructions: outputFormatInstructions.trim() || undefined,
      },
      context_packs: contextPacks.length > 0 ? contextPacks : undefined,
      targets: targets.length > 0 ? targets : undefined,
    });
  };

  const handleDelete = () => {
    vscode.postMessage({ type: 'deleteAgent', agentId: agentId ?? '' });
    navigate(-1);
  };

  const toggleContextPack = (packId: string) => {
    setContextPacks((prev) =>
      prev.includes(packId) ? prev.filter((p) => p !== packId) : [...prev, packId],
    );
  };

  const isAssignedToAnyTeam = assignedTeamIds.length > 0;
  const deleteDisabledReason = isAssignedToAnyTeam
    ? `Agent assigned to team(s): ${assignedTeamIds.join(', ')}`
    : null;

  return {
    navigate,
    agentId,
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
    lockedToolNames,
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
    assignedTeamIds,
    deleteDisabledReason,
    isValid: isConfigurationEnabled,
    stats,
  };
};
