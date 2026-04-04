import type { AgentRole, AgentWizardFormState, AgentWizardMessagePayload } from '@/models';

// ── Helpers ──────────────────────────────────────────────────────────────────

const toId = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const parseGlobs = (
  raw: string,
): Array<{ pattern: string; priority?: 'high' | 'medium' | 'low' }> =>
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [pattern, maybePriority] = line.split('::');
      const priority = ['high', 'medium', 'low'].includes(maybePriority ?? '')
        ? (maybePriority as 'high' | 'medium' | 'low')
        : undefined;
      return priority ? { pattern: pattern.trim(), priority } : { pattern: pattern.trim() };
    });

const isAgentRole = (v: string): v is AgentRole =>
  v === 'worker' || v === 'router' || v === 'orchestrator';

const buildScope = (state: AgentWizardFormState) => {
  const globs = parseGlobs(state.scopeGlobs);
  return {
    topics: state.scopeTopics.length > 0 ? state.scopeTopics : undefined,
    path_globs: globs.length > 0 ? globs : undefined,
    excludes: state.scopeExcludes.length > 0 ? state.scopeExcludes : undefined,
  };
};

/** Returns undefined when all scope fields are empty (avoids storing `{}` in spec). */
const buildScopeForRole = (state: AgentWizardFormState, role: AgentRole) => {
  // Router has no scope — tab is hidden in the UI
  if (role === 'router') return undefined;
  // Orchestrator: path_globs and excludes are hidden in UI, only topics matter
  if (role === 'orchestrator') {
    return state.scopeTopics.length > 0
      ? { topics: state.scopeTopics, path_globs: undefined, excludes: undefined }
      : undefined;
  }
  const scope = buildScope(state);
  const hasContent = scope.topics || scope.path_globs || scope.excludes;
  return hasContent ? scope : undefined;
};

const buildConstraints = (state: AgentWizardFormState) => ({
  always: state.constraintsAlways.length > 0 ? state.constraintsAlways : undefined,
  never: state.constraintsNever.length > 0 ? state.constraintsNever : undefined,
  escalate: state.constraintsEscalate.length > 0 ? state.constraintsEscalate : undefined,
});

/** Returns undefined for router (constraints section is hidden in UI). */
const buildConstraintsForRole = (state: AgentWizardFormState, role: AgentRole) => {
  if (role === 'router') return undefined;
  const c = buildConstraints(state);
  return c.always || c.never || c.escalate ? c : undefined;
};

const buildHandoffs = (state: AgentWizardFormState) => {
  const receives_from = state.receivesFrom.length > 0 ? state.receivesFrom : undefined;
  const delegates_to = state.delegatesTo.length > 0 ? state.delegatesTo : undefined;
  const escalates_to = state.escalatesTo.length > 0 ? state.escalatesTo : undefined;
  if (!receives_from && !delegates_to && !escalates_to) return undefined;
  return { receives_from, delegates_to, escalates_to };
};

const buildOutput = (state: AgentWizardFormState) => ({
  template: state.outputTemplate,
  mode: state.outputMode,
  max_items: state.outputMaxItems,
  never_include: state.outputNeverInclude.length > 0 ? state.outputNeverInclude : undefined,
  format_instructions: state.outputFormatInstructions.trim() || undefined,
});

/**
 * For router: only store template + optional mode/format_instructions.
 * max_items and never_include are hidden in the UI for routers.
 */
const buildOutputForRole = (state: AgentWizardFormState, role: AgentRole) => {
  if (role === 'router') {
    return {
      template: state.outputTemplate,
      mode: state.outputMode !== 'short' ? state.outputMode : undefined,
      max_items: undefined as number | undefined,
      never_include: undefined as string[] | undefined,
      format_instructions: state.outputFormatInstructions.trim() || undefined,
    };
  }
  return buildOutput(state);
};

// ── Builder ───────────────────────────────────────────────────────────────────

export const buildAgentWizardPayload = (state: AgentWizardFormState): AgentWizardMessagePayload => {
  const role = isAgentRole(state.role) ? state.role : 'worker';
  const id = toId(state.name);

  return {
    id,
    name: state.name.trim(),
    version: '1.0.0',
    role,
    domain: state.domain.trim() || 'general',
    // subdomain field is hidden for router and orchestrator in the UI
    subdomain: role === 'worker' ? state.subdomain.trim() || undefined : undefined,
    description: state.description.trim(),
    expertise: state.expertise,
    intents: state.intents,
    scope: buildScopeForRole(state, role),
    workflow: state.workflowSteps.length > 0 ? state.workflowSteps : undefined,
    tools: state.tools.length > 0 ? state.tools : undefined,
    skills: state.skills.length > 0 ? state.skills : undefined,
    constraints: buildConstraintsForRole(state, role),
    handoffs: buildHandoffs(state),
    output: buildOutputForRole(state, role),
    context_packs: state.contextPacks.length > 0 ? state.contextPacks : undefined,
    targets: state.targets.length > 0 ? state.targets : undefined,
    claude_model:
      state.targets.includes('claude_code') && state.claudeModel !== 'inherit'
        ? state.claudeModel
        : undefined,
    claude_max_turns:
      state.targets.includes('claude_code') && state.claudeMaxTurns !== undefined
        ? state.claudeMaxTurns
        : undefined,
    claude_effort:
      state.targets.includes('claude_code') && state.claudeEffort ? state.claudeEffort : undefined,
    claude_permission_mode:
      state.targets.includes('claude_code') && state.claudePermissionMode
        ? state.claudePermissionMode
        : undefined,
    claude_disallowed_tools:
      state.targets.includes('claude_code') && state.claudeDisallowedTools.length > 0
        ? state.claudeDisallowedTools
        : undefined,
    claude_background:
      state.targets.includes('claude_code') && state.claudeBackground ? true : undefined,
    claude_mcp_servers:
      state.targets.includes('claude_code') && state.claudeMcpServers.length > 0
        ? state.claudeMcpServers
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
                type: (s.type || undefined) as 'stdio' | 'http' | 'sse' | 'ws' | undefined,
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
      state.targets.includes('opencode') && state.opencodeModel.trim()
        ? state.opencodeModel.trim()
        : undefined,
    mcpServers:
      state.mcpServers.length > 0
        ? state.mcpServers
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
  };
};
