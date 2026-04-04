import { vscode } from '@lib/vscode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  AgentClaudeMcpServerForm,
  AgentMcpServerForm,
  AgentSkillRef,
  AgentTool,
  CatalogSkillEntry,
  DashboardStats,
  EditAgentHostMessage,
  OutputTemplateId,
} from '../../models';
import { isAgentRole, TOOL_CANONICAL } from '../agent-wizard/constants';
import {
  addEngramMcpServer,
  detectEngramEnabled,
  removeEngramMcpServer,
} from '../agent-wizard/engramUtils';
import { addProjectMcpServer, removeProjectMcpServer } from '../agent-wizard/projectMcpUtils';
import { useAgentFieldErrors } from '../agent-wizard/useAgentFieldErrors';

/** Coerce a YAML-parsed workflow step to string.
 * A step written as `- key: value` is parsed as an object; reconstruct it. */
function coerceWorkflowStep(s: unknown): string {
  if (typeof s === 'string') return s;
  if (s !== null && typeof s === 'object') {
    const entries = Object.entries(s as Record<string, unknown>);
    if (entries.length === 1) return `${entries[0][0]}: ${entries[0][1]}`;
    return JSON.stringify(s);
  }
  return String(s ?? '');
}

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

const getDefaultToolsForRole = (role: string): AgentTool[] => {
  if (role === 'router')
    return [
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
    ];
  if (role === 'orchestrator')
    return [
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
    ];
  if (role === 'worker')
    return [
      {
        name: 'search',
        when: 'Use to read existing code and understand project conventions before making changes',
      },
      { name: 'read', when: 'Use to read specific files before making changes' },
      { name: 'edit', when: 'Use to create and edit files as part of task execution' },
    ];
  return [];
};

export const useEditAgentLogic = () => {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();
  const [stats, setStats] = useState<DashboardStats>(window.__INITIAL_STATE__ ?? EMPTY_STATS);

  // ── Identity ──────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('');
  const [agentVersion, setAgentVersion] = useState('1.0.0');
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, _setIsSaving] = useState(false);
  const [isDeleting, _setIsDeleting] = useState(false);
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
    () => stats.agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
    [stats.agents],
  );

  const hiddenToolNames = useMemo<ReadonlySet<string>>(() => {
    if (role !== 'worker') return new Set<string>();
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
      const withoutAliases = prev.filter(
        (t) => !(TOOL_CANONICAL[t.name] && lockedToolNames.has(TOOL_CANONICAL[t.name])),
      );
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

  const isConfigurationEnabled =
    name.trim().length >= 3 && description.trim().length >= 10 && isAgentRole(role);

  const fieldErrors = useAgentFieldErrors({ name, description, role, intents, workflowSteps });

  const saveDisabledReason: string | null = isConfigurationEnabled
    ? null
    : name.trim().length < 3
      ? 'Agent name must be at least 3 characters'
      : description.trim().length < 10
        ? 'Description must be at least 10 characters'
        : !isAgentRole(role)
          ? 'Please select a valid role'
          : 'Add at least one intent';

  const handleAgentData = useCallback(
    (message: Extract<EditAgentHostMessage, { type: 'agentData' }>) => {
      setIsLoading(false);
      if (message.error) {
        setLoadError(message.error);
        return;
      }
      setName(message.name ?? '');
      setRole(message.role ?? '');
      setAgentVersion(message.version ?? '1.0.0');
      setDescription(message.description ?? '');
      setDomain(message.domain ?? '');
      setSubdomain(message.subdomain ?? '');
      setExpertise(message.expertise ?? []);
      setIntents(message.intents ?? []);

      setScopeTopics(message.scope?.topics ?? []);
      setScopeGlobs(
        (message.scope?.path_globs ?? [])
          .map((g) => {
            // path_globs items should always be objects after extension normalisation,
            // but guard against bare strings from manually edited or imported specs.
            if (typeof (g as unknown) === 'string') return g as unknown as string;
            return g.priority ? `${g.pattern}::${g.priority}` : g.pattern;
          })
          .join('\n'),
      );
      setScopeExcludes(message.scope?.excludes ?? []);

      setWorkflowSteps((message.workflow ?? []).map(coerceWorkflowStep));
      let loadedTools = message.tools ?? [];
      if (loadedTools.length === 0) loadedTools = getDefaultToolsForRole(message.role ?? '');
      // Migrate: if agent had engram configured (MCP server or autonomous flag) but lacks the tool, add it
      if (detectEngramEnabled(message) && !loadedTools.some((t) => t.name === 'engram/*')) {
        loadedTools = [...loadedTools, { name: 'engram/*' }];
      }
      setTools(loadedTools);
      setSkills(message.skills ?? []);

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
      setTargets(message.targets ?? ['github_copilot', 'claude_code']);
      setAssignedTeamIds(message.assignedTeamIds ?? []);
      setClaudeModel((message as any).claude_model ?? 'inherit');
      setClaudeMaxTurns((message as any).claude_max_turns ?? undefined);
      setClaudeEffort((message as any).claude_effort ?? undefined);
      setClaudePermissionMode((message as any).claude_permission_mode ?? undefined);
      setClaudeDisallowedTools((message as any).claude_disallowed_tools ?? []);
      setClaudeBackground((message as any).claude_background ?? false);
      setOpencodeModel((message as any).opencode_model ?? '');
      setClaudeMcpServers(
        ((message as any).claude_mcp_servers ?? []).map(
          (
            s: {
              name: string;
              type?: string;
              command?: string;
              args?: string[];
              env?: Record<string, string>;
            },
            i: number,
          ) => ({
            _key: `cm-loaded-${i}-${s.name}`,
            name: s.name,
            type: s.type ?? '',
            command: s.command ?? '',
            args: (s.args ?? []).join('\n'),
            env: s.env && Object.keys(s.env).length > 0 ? JSON.stringify(s.env, null, 2) : '',
          }),
        ),
      );
      setMcpServers(
        (message.mcpServers ?? []).map((s) => ({
          id: s.id,
          command: s.command,
          args: (s.args ?? []).join('\n'),
          env: s.env && Object.keys(s.env).length > 0 ? JSON.stringify(s.env, null, 2) : '',
        })),
      );
    },
    [],
  );

  const handleSaveAgentResult = useCallback(
    (message: Extract<EditAgentHostMessage, { type: 'saveAgentResult' }>) => {
      // Optimistic UX: We already navigated away in handleSave()
      // This handler only processes errors if user is still on the page
      if (!message.success && message.error) {
        setSaveError(message.error);
      }
    },
    [],
  );

  const handleDeleteResult = useCallback(
    (message: Extract<EditAgentHostMessage, { type: 'deleteAgentResult' }>) => {
      // Optimistic UX: We already navigated away in handleDelete()
      // This handler only processes errors if user is still on the page
      if (!message.success && message.error) {
        setSaveError(message.error);
      }
    },
    [],
  );

  const handleHostMessage = useCallback(
    (message: EditAgentHostMessage) => {
      if (message.type === 'updateStats') setStats(message.stats);
      else if (message.type === 'agentData') handleAgentData(message);
      else if (message.type === 'saveAgentResult') handleSaveAgentResult(message);
      else if (message.type === 'deleteAgentResult') handleDeleteResult(message);
      else if (message.type === 'catalogSkills') setCatalogSkills(message.skills);
      else if (message.type === 'installCatalogSkillResult' && !message.success) {
        setSaveError(message.error ?? `Failed to install skill ${message.skillId}`);
      }
    },
    [handleSaveAgentResult, handleAgentData, handleDeleteResult],
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

  const handleSave = () => {
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
      setSaveError(`MCP Server "${invalidMcp.id || '(unnamed)'}": env must be a valid JSON object`);
      return;
    }
    setSaveError(null);
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
      version: agentVersion,
      role: agentRole,
      description: description.trim(),
      domain: domain || undefined,
      subdomain: agentRole === 'worker' ? subdomain.trim() || undefined : undefined,
      expertise: expertise.length > 0 ? expertise : undefined,
      intents: intents.length > 0 ? intents : undefined,
      scope: (() => {
        if (agentRole === 'router') return undefined;
        if (agentRole === 'orchestrator') {
          return scopeTopics.length > 0 ? { topics: scopeTopics } : undefined;
        }
        return scopeTopics.length > 0 || parsedGlobs.length > 0 || scopeExcludes.length > 0
          ? {
              topics: scopeTopics.length > 0 ? scopeTopics : undefined,
              path_globs: parsedGlobs.length > 0 ? parsedGlobs : undefined,
              excludes: scopeExcludes.length > 0 ? scopeExcludes : undefined,
            }
          : undefined;
      })(),
      workflow: workflowSteps.length > 0 ? workflowSteps : undefined,
      tools: tools.length > 0 ? tools : undefined,
      skills: skills.length > 0 ? skills : undefined,
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
      output:
        agentRole === 'router'
          ? {
              template: outputTemplate,
              mode: outputMode !== 'short' ? outputMode : undefined,
              max_items: undefined,
              never_include: undefined,
              format_instructions: outputFormatInstructions.trim() || undefined,
            }
          : {
              template: outputTemplate,
              mode: outputMode,
              max_items: outputMaxItems,
              never_include: outputNeverInclude.length > 0 ? outputNeverInclude : undefined,
              format_instructions: outputFormatInstructions.trim() || undefined,
            },
      context_packs: contextPacks.length > 0 ? contextPacks : undefined,
      targets: targets.length > 0 ? targets : undefined,
      claude_model:
        targets.includes('claude_code') && claudeModel !== 'inherit' ? claudeModel : undefined,
      claude_max_turns:
        targets.includes('claude_code') && claudeMaxTurns !== undefined
          ? claudeMaxTurns
          : undefined,
      claude_effort: targets.includes('claude_code') && claudeEffort ? claudeEffort : undefined,
      claude_permission_mode:
        targets.includes('claude_code') && claudePermissionMode ? claudePermissionMode : undefined,
      claude_disallowed_tools:
        targets.includes('claude_code') && claudeDisallowedTools.length > 0
          ? claudeDisallowedTools
          : undefined,
      claude_background: targets.includes('claude_code') && claudeBackground ? true : undefined,
      claude_mcp_servers:
        targets.includes('claude_code') && claudeMcpServers.length > 0
          ? claudeMcpServers
              .filter((s) => s.name.trim())
              .map((s) => {
                let env: Record<string, string> | undefined;
                try {
                  env = s.env.trim() ? (JSON.parse(s.env) as Record<string, string>) : undefined;
                } catch {
                  env = undefined;
                }
                return {
                  name: s.name.trim(),
                  type: s.type || undefined,
                  command: s.command.trim() || undefined,
                  args: s.args
                    .split('\n')
                    .map((a) => a.trim())
                    .filter(Boolean),
                  env,
                };
              })
          : undefined,
      opencode_model:
        targets.includes('opencode') && opencodeModel.trim() ? opencodeModel.trim() : undefined,
      mcpServers:
        mcpServers.length > 0
          ? mcpServers
              .map((s) => {
                let env: Record<string, string> | undefined;
                try {
                  env = s.env.trim() ? (JSON.parse(s.env) as Record<string, string>) : undefined;
                } catch {
                  env = undefined;
                }
                return {
                  id: s.id.trim(),
                  command: s.command.trim(),
                  args: s.args
                    .split('\n')
                    .map((a) => a.trim())
                    .filter(Boolean),
                  env,
                };
              })
              .filter((s) => s.id && s.command)
          : undefined,
    });

    // Navigate immediately for instant feel
    // Backend will show error toast if save fails
    navigate('/');
  };

  const handleDelete = () => {
    vscode.postMessage({ type: 'deleteAgent', agentId: agentId ?? '' });
    // Navigate immediately for instant feel
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
    saveDisabledReason,
    isDeleting,
    stats,
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
