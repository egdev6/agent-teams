import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AgentClaudeMcpServerForm,
  AgentMcpServerForm,
  AgentSkillRef,
  AgentTool,
  CatalogSkillEntry,
  CreateAgentHostMessage,
  DashboardStats,
  OutputTemplateId,
} from '../../models';
import { isAgentRole, TOOL_CANONICAL } from '../agent-wizard/constants';
import { addEngramMcpServer, removeEngramMcpServer } from '../agent-wizard/engramUtils';
import { buildAgentWizardPayload } from '../agent-wizard/payload';
import { addProjectMcpServer, removeProjectMcpServer } from '../agent-wizard/projectMcpUtils';
import { useAgentFieldErrors } from '../agent-wizard/useAgentFieldErrors';

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
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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

  // ── Claude Code ───────────────────────────────────────────────────────────
  const [claudeModel, setClaudeModel] = useState<'inherit' | 'sonnet' | 'opus' | 'haiku'>(
    'inherit',
  );
  const [claudeMaxTurns, setClaudeMaxTurns] = useState<number | undefined>(undefined);
  const [claudeEffort, setClaudeEffort] = useState<'low' | 'medium' | 'high' | 'max' | undefined>(
    undefined,
  );
  const [claudePermissionMode, setClaudePermissionMode] = useState<
    'default' | 'acceptEdits' | 'dontAsk' | 'bypassPermissions' | undefined
  >(undefined);
  const [claudeDisallowedTools, setClaudeDisallowedTools] = useState<string[]>([]);
  const [claudeBackground, setClaudeBackground] = useState<boolean>(false);
  const [claudeMcpServers, setClaudeMcpServers] = useState<AgentClaudeMcpServerForm[]>([]);

  // ── Opencode ──────────────────────────────────────────────────────────────
  const [opencodeModel, setOpencodeModel] = useState<string>('');

  // ── MCP Servers ───────────────────────────────────────────────────────────
  const [mcpServers, setMcpServers] = useState<AgentMcpServerForm[]>([]);

  // ── Runtime ───────────────────────────────────────────────────────────────
  const [contextPacks, setContextPacks] = useState<string[]>([]);
  const [availableContextPacks, setAvailableContextPacks] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>(['github_copilot', 'claude_code']);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, _setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Message handlers ──────────────────────────────────────────────────────

  const handleCreateAgentResult = useCallback(
    (message: Extract<CreateAgentHostMessage, { type: 'createAgentResult' }>) => {
      // Optimistic UX: We already navigated away in handleCreate()
      // This handler only processes errors if user is still on the page
      if (!message.success && message.error) {
        // Show error if creation failed (rare - validation should catch most issues)
        setCreateError(message.error);
      }
    },
    [],
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
          setIsInitialLoading(false);
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
        'Call `mem_session_start` to register the session, then `mem_context` to load recent project context.',
        'Call `mem_search` with a query matching the current task to surface relevant past solutions; use `mem_get_observation` on any truncated result to get the full content.',
        'Understand the task scope and expected outcome.',
        'Gather the required file and code context — use `read` to inspect files and `search` to locate relevant code.',
        'Analyse with your area of expertise — use `search` to identify patterns; note every finding with file + line.',
        'Execute or respond within scope — use `edit` to apply changes, `execute` to run commands if permitted.',
        'Verify your output (imports, types, conventions) — use `read` to confirm the final state.',
        'Call `mem_suggest_topic_key` for the work done, then `mem_save` with the returned topic_key, type = `pattern`, and content in What / Why / Where / Learned format.',
        'Call `mem_session_end` to mark the session as completed.',
      ]);
    } else if (role === 'orchestrator') {
      setWorkflowSteps([
        'Call `mem_session_start` to register the session, then `mem_context` to load recent project context.',
        'Call `mem_search "orchestration {domain}"` to recall past coordination patterns; use `mem_get_observation` on any truncated result.',
        'Understand the high-level goal and acceptance criteria.',
        'Decompose the goal into discrete, independently executable sub-tasks — use `todo` to track each one.',
        'Identify the most suitable agent for each sub-task based on expertise and intents.',
        'Before each delegation, call `mem_suggest_topic_key` then `mem_save` with the full sub-task context (type = `decision`) — then use `egdev6.agent-teams/agent-teams-handoff` for a single target or `egdev6.agent-teams/agent-teams-dispatch-parallel` to fan out; do NOT respond until all invocations complete; never assume shared state.',
        'Integrate the results from delegates into a coherent whole.',
        'Validate coherence, completeness, and consistency — use `read` to verify the final file state.',
        'Call `mem_suggest_topic_key` for the outcome, then `mem_save` with type = `decision` and content = what was delegated, to whom, and the full outcome.',
        'Respond to the user or escalate via `egdev6.agent-teams/agent-teams-handoff` if blockers remain.',
        'Call `mem_session_end` to mark the session as completed.',
      ]);
      setOutputTemplate('planning');
      setOutputMode('detailed');
    } else if (role === 'router') {
      setWorkflowSteps([
        'Call `mem_session_start` to register the session.',
        'Call `mem_search "routing patterns"` to recall past routing decisions and outcomes; use `mem_get_observation` on any truncated result.',
        'Receive and read the request fully before acting.',
        'Identify the domain and intent(s) expressed in the request.',
        'Apply routing rules in priority order until a match is found.',
        'Single-domain match — generate `task-{unix-timestamp}`, call `mem_save` with the full assessment (type = `decision`, topic_key = `task-{taskId}`), then use `egdev6.agent-teams/agent-teams-handoff` with `{ targetAgentId, taskId, assessment }`.',
        'Multi-domain match — generate `task-{unix-timestamp}`, for each agent call `mem_save` with the sub-assessment (type = `decision`, topic_key = `task-{taskId}-{agentId}`), then use `egdev6.agent-teams/agent-teams-dispatch-parallel` with `{ taskId, assessment, subtasks }`.',
        'Call `mem_save` with type = `pattern`, title = `Routing: {intent} → {targetAgent}`, content = one-line outcome.',
        'If no rule matches, escalate via `egdev6.agent-teams/agent-teams-handoff` to the default orchestrator — never guess or execute the task.',
        'Call `mem_session_end` to mark the session as completed.',
      ]);
      setDomain('global');
      setOutputTemplate('routing-decision');
    }
  }, [role, workflowSteps.length]);

  // Pre-populate tools when role changes and tools are still empty
  useEffect(() => {
    if (!isAgentRole(role) || tools.length > 0) return;
    if (role === 'router') {
      setTools([
        { name: 'agent', when: 'Use to route the request to the matched agent' },
        { name: 'engram/*', when: 'Use to recall routing patterns and persist routing decisions' },
        {
          name: 'egdev6.agent-teams/agent-teams-handoff',
          when: 'Use to hand off the task to a single matched agent',
        },
        {
          name: 'egdev6.agent-teams/agent-teams-dispatch-parallel',
          when: 'Use to fan out the task to multiple matched agents in parallel',
        },
      ]);
    } else if (role === 'orchestrator') {
      setTools([
        {
          name: 'search',
          when: 'Use to read project structure and context before decomposing tasks',
        },
        { name: 'agent', when: 'Use to delegate sub-tasks to worker agents' },
        { name: 'engram/*', when: 'Use to persist session context and recall task state' },
        {
          name: 'egdev6.agent-teams/agent-teams-handoff',
          when: 'Use to hand off a sub-task directly to a worker agent',
        },
        {
          name: 'egdev6.agent-teams/agent-teams-dispatch-parallel',
          when: 'Use to dispatch multiple independent sub-tasks in parallel',
        },
        {
          name: 'egdev6.agent-teams/agent-teams-complete-subtask',
          when: 'Use to report sub-task completion back to the router',
        },
      ]);
    } else if (role === 'worker') {
      setTools([
        {
          name: 'search',
          when: 'Use to read existing code and understand project conventions before making changes',
        },
        { name: 'read', when: 'Use to read specific files before making changes' },
        {
          name: 'edit',
          when: 'Use to create and edit files as part of task execution',
        },
        {
          name: 'egdev6.agent-teams/agent-teams-complete-subtask',
          when: 'Use to report task completion back to the orchestrator',
        },
      ]);
    }
  }, [role, tools.length]);

  // Sync Engram MCP server when engram/* tool is added/removed
  const hasEngramTool = tools.some((t) => t.name === 'engram/*');
  useEffect(() => {
    setMcpServers(hasEngramTool ? addEngramMcpServer : removeEngramMcpServer);
  }, [hasEngramTool]);

  const projectMcpServers = stats.projectMcpServers ?? [];

  const toggleProjectMcpServer = useCallback(
    (id: string, enabled: boolean) => {
      const server = projectMcpServers.find((s) => s.id === id);
      if (!server) return;
      setMcpServers((prev) =>
        enabled ? addProjectMcpServer(prev, server) : removeProjectMcpServer(prev, id),
      );
    },
    [projectMcpServers],
  );

  const availableTargetAgents = useMemo(
    () => stats.agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
    [stats.agents],
  );

  const hiddenToolNames = useMemo<ReadonlySet<string>>(() => {
    if (role !== 'worker') return new Set<string>();
    // Workers only interact with complete-subtask from the Agent Teams group;
    // handoff/dispatch-parallel are orchestration tools, suggest-skills and
    // read-workspace-file are extension chat-participant tools.
    return new Set([
      'egdev6.agent-teams/agent-teams-handoff',
      'egdev6.agent-teams/agent-teams-dispatch-parallel',
      'egdev6.agent-teams/agent-teams-suggest-community-skills',
      'egdev6.agent-teams/agent-teams-read-workspace-file',
    ]);
  }, [role]);

  const lockedToolNames = useMemo<ReadonlySet<string>>(() => {
    const locked = new Set<string>();
    // engram/* is always locked for all roles — its state is derived from role + receivesFrom
    locked.add('engram/*');
    if (role === 'router') {
      locked.add('agent');
      locked.add('egdev6.agent-teams/agent-teams-handoff');
      locked.add('egdev6.agent-teams/agent-teams-dispatch-parallel');
    }
    if (role === 'orchestrator' || role === 'worker') locked.add('search');
    if (role === 'orchestrator') {
      locked.add('agent');
      locked.add('egdev6.agent-teams/agent-teams-handoff');
      locked.add('egdev6.agent-teams/agent-teams-dispatch-parallel');
      locked.add('egdev6.agent-teams/agent-teams-complete-subtask');
    }
    if (role === 'worker' && receivesFrom.length > 0) {
      locked.add('egdev6.agent-teams/agent-teams-complete-subtask');
    }
    return locked;
  }, [role, receivesFrom]);

  // Sync locked tools: add when enabled by role/topology, remove when disabled
  useEffect(() => {
    setTools((prev) => {
      // Remove aliases whose canonical ID is a locked tool
      const withoutAliases = prev.filter(
        (t) => !(TOOL_CANONICAL[t.name] && lockedToolNames.has(TOOL_CANONICAL[t.name])),
      );
      // engram/* is enabled unless worker with receivesFrom
      const engramEnabled = !(role === 'worker' && receivesFrom.length > 0);
      const lockedToAdd = [...lockedToolNames].filter((n) => {
        if (n === 'engram/*') return engramEnabled && !withoutAliases.some((t) => t.name === n);
        return !withoutAliases.some((t) => t.name === n);
      });
      const engramToRemove = !engramEnabled ? ['engram/*'] : [];
      const result = withoutAliases
        .filter((t) => !engramToRemove.includes(t.name))
        .concat(lockedToAdd.map((name) => ({ name })));
      if (result.length === prev.length && result.every((t, i) => t.name === prev[i]?.name))
        return prev;
      return result;
    });
  }, [lockedToolNames, role, receivesFrom]);

  const isValid = name.trim().length >= 3 && description.trim().length >= 10 && isAgentRole(role);
  const isConfigurationEnabled = isValid;

  const fieldErrors = useAgentFieldErrors({ name, description, role, intents, workflowSteps });

  const saveDisabledReason: string | null = isValid
    ? null
    : name.trim().length < 3
      ? 'Agent name must be at least 3 characters'
      : description.trim().length < 10
        ? 'Description must be at least 10 characters'
        : !isAgentRole(role)
          ? 'Please select a valid role'
          : 'Add at least one intent';

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
    const invalidMcp = mcpServers.find((s) => {
      if (!s.env.trim()) return false;
      try {
        JSON.parse(s.env);
        return false;
      } catch {
        return true;
      }
    });
    if (invalidMcp) {
      setCreateError(
        `MCP Server "${invalidMcp.id || '(unnamed)'}": env must be a valid JSON object`,
      );
      return;
    }
    setCreateError(null);

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
      mcpServers,
      claudeModel,
      claudeMaxTurns,
      claudeEffort,
      claudePermissionMode,
      claudeDisallowedTools,
      claudeBackground,
      claudeMcpServers,
      opencodeModel,
    });

    // Send to backend (fire-and-forget for optimistic UX)
    vscode.postMessage({ type: 'createAgent', ...payload });

    // Navigate immediately for instant feel
    // Backend will show error toast if creation fails
    navigate('/');
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
    lockedToolNames,
    hiddenToolNames,
    // skills
    skills,
    setSkills,
    catalogSkills,
    addSkill,
    removeSkill,
    updateSkill,
    onInstallCatalogSkill,
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
    saveDisabledReason,
    isSaving,
    isImporting,
    createError,
    availableTargetAgents,
    handleCreate,
    handleImport,
    stats,
    navigate,
    isInitialLoading,
    // mcp servers
    mcpServers,
    setMcpServers,
    projectMcpServers,
    toggleProjectMcpServer,
    // claude code
    claudeModel,
    setClaudeModel,
    claudeMaxTurns,
    setClaudeMaxTurns,
    claudeEffort,
    setClaudeEffort,
    claudePermissionMode,
    setClaudePermissionMode,
    claudeDisallowedTools,
    setClaudeDisallowedTools,
    claudeBackground,
    setClaudeBackground,
    claudeMcpServers,
    setClaudeMcpServers,
    // opencode
    opencodeModel,
    setOpencodeModel,
    opencodeInstalled: stats.opencodeInstalled ?? false,
    opencodeModels: stats.opencodeModels ?? [],
    // validation
    fieldErrors,
  };
};
