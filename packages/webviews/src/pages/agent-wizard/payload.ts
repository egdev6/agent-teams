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

const buildConstraints = (state: AgentWizardFormState) => ({
  always: state.constraintsAlways.length > 0 ? state.constraintsAlways : undefined,
  never: state.constraintsNever.length > 0 ? state.constraintsNever : undefined,
  escalate: state.constraintsEscalate.length > 0 ? state.constraintsEscalate : undefined,
});

const buildHandoffs = (state: AgentWizardFormState) => ({
  receives_from: state.receivesFrom.length > 0 ? state.receivesFrom : undefined,
  delegates_to: state.delegatesTo.length > 0 ? state.delegatesTo : undefined,
  escalates_to: state.escalatesTo.length > 0 ? state.escalatesTo : undefined,
});

const buildOutput = (state: AgentWizardFormState) => ({
  template: state.outputTemplate,
  mode: state.outputMode,
  max_items: state.outputMaxItems,
  never_include: state.outputNeverInclude.length > 0 ? state.outputNeverInclude : undefined,
  format_instructions: state.outputFormatInstructions.trim() || undefined,
});

// ── Builder ───────────────────────────────────────────────────────────────────

export const buildAgentWizardPayload = (
  state: AgentWizardFormState & { name: string },
): AgentWizardMessagePayload => {
  const role = isAgentRole(state.role) ? state.role : 'worker';
  const id = toId(state.name);

  return {
    id,
    name: state.name.trim(),
    version: '1.0.0',
    role,
    domain: state.domain.trim() || 'general',
    subdomain: state.subdomain.trim() || undefined,
    description: state.description.trim(),
    expertise: state.expertise,
    intents: state.intents,
    scope: buildScope(state),
    workflow: state.workflowSteps.length > 0 ? state.workflowSteps : undefined,
    tools: state.tools.length > 0 ? state.tools : undefined,
    skills: state.skills.length > 0 ? state.skills : undefined,
    permissions: state.permissions,
    constraints: buildConstraints(state),
    handoffs: buildHandoffs(state),
    output: buildOutput(state),
    context_packs: state.contextPacks.length > 0 ? state.contextPacks : undefined,
    targets: state.targets.length > 0 ? state.targets : undefined,
  };
};
