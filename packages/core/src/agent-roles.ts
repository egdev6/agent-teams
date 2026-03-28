/**
 * Role base workflows for agent types.
 *
 * Each role has a canonical set of workflow steps that is used as the base
 * when the agent YAML does not define its own `workflow[]`. When an agent
 * YAML does define `workflow[]`, those steps replace the base entirely so
 * the rendered MD always shows a single resolved list.
 *
 * Base workflows are context-aware: they inject spec-specific values
 * (target platform, delegate agents, scope topics, output format) to
 * eliminate ambiguity and leave no room for interpretation.
 */
import type { AgentRole, OutputTemplateId, SyncTarget } from './types';

export type { AgentRole };

// ─── Options ─────────────────────────────────────────────────────────────────

export interface WorkflowOptions {
  /** Agents this agent receives tasks from (determines engram autonomous mode for workers). */
  receivesFrom?: string[];
  /** Agents this orchestrator can delegate to — injected into delegation steps. */
  delegatesTo?: string[];
  /** Scope topics — injected into the scope-check step for workers. */
  scopeTopics?: string[];
  /** Escalation targets — referenced in the scope-check escalation hint. */
  escalatesTo?: string[];
  /** Output format — injected as an explicit step before mem_save. */
  output?: { template?: OutputTemplateId | string; format_instructions?: string };
  /** Sync target — determines platform-specific tool names in delegation steps. */
  target?: SyncTarget | string;
}

// ─── Tool name helpers ────────────────────────────────────────────────────────

function handoffTool(target?: string): string {
  return target === 'claude_code'
    ? '`dispatch_task` MCP tool with `{ agentId, taskId, description }`'
    : '`egdev6.agent-teams/agent-teams-handoff` with `{ targetAgentId, taskId, assessment }`';
}

function dispatchParallelTool(target?: string): string {
  return target === 'claude_code'
    ? '`dispatch_task` MCP tool once per sub-task with `{ agentId, taskId, description }`'
    : '`egdev6.agent-teams/agent-teams-dispatch-parallel` with `{ taskId, assessment, subtasks }`';
}

function completeSubtaskTool(target?: string): string {
  return target === 'claude_code'
    ? '`complete_subtask` MCP tool with `{ taskId, agentId }`'
    : '`egdev6.agent-teams/agent-teams-complete-subtask` with `{ taskId, agentId }`';
}

// ─── Derived step builders ────────────────────────────────────────────────────

function scopeCheckStep(scopeTopics?: string[], escalatesTo?: string[]): string {
  if (!scopeTopics?.length) {
    return 'Understand the task scope, expected outcome, and boundaries before proceeding.';
  }
  const escalation = escalatesTo?.length
    ? ` — if it does not, escalate to ${escalatesTo[0]} and stop`
    : ' — if it does not, escalate and do not proceed';
  return `Confirm this task falls within your scope (topics: ${scopeTopics.join(', ')})${escalation}.`;
}

function outputStep(output?: WorkflowOptions['output']): string | null {
  if (!output?.template) return null;
  if (output.template === 'custom' && output.format_instructions) {
    return `Format and return your response: ${output.format_instructions.split('\n')[0].trim()}`;
  }
  return `Format and return your response using the \`${output.template}\` output template (see ## Output section for the structure).`;
}

// ─── Worker workflows ─────────────────────────────────────────────────────────

function buildWorkerWorkflow(opts: WorkflowOptions): string[] {
  const steps: (string | null)[] = [
    'Call `mem_session_start` to register the session, then `mem_context` to load recent project context.',
    'Call `mem_search` with a query matching the current task to surface relevant past solutions; use `mem_get_observation` on any truncated result to get the full content.',
    scopeCheckStep(opts.scopeTopics, opts.escalatesTo),
    'Gather the required file and code context — use `read` to inspect files and `search` to locate relevant code.',
    'Analyse with your area of expertise — use `search` to identify patterns; note every finding with file + line.',
    'Execute or respond within scope — use `edit` to apply changes, `execute` to run commands if permitted.',
    'Verify your output (imports, types, conventions) — use `read` to confirm the final state.',
    outputStep(opts.output),
    'Call `mem_suggest_topic_key` for the work done, then `mem_save` with the returned topic_key, type = `pattern`, and content in What / Why / Where / Learned format.',
    'Call `mem_session_end` to mark the session as completed.',
  ];
  return steps.filter((s): s is string => s !== null);
}

function buildWorkerAutonomousWorkflow(opts: WorkflowOptions): string[] {
  const steps: (string | null)[] = [
    'Call `mem_session_start` to register the session, then `mem_context` to load recent project context.',
    'Recover task context — call `mem_search` with a query matching the current task; if chat contains `[Handoff:{taskId}]`, also call `mem_search "task-{taskId}"` to load the dispatcher\'s full assessment; if `[Parallel:{taskId}]`, call `mem_search "task-{taskId}-{agentId}"` for your specific sub-assessment. Use `mem_get_observation` on any truncated result.',
    scopeCheckStep(opts.scopeTopics, opts.escalatesTo),
    'Gather the required file and code context — use `read` to inspect files and `search` to locate relevant code.',
    'Analyse with your area of expertise — use `search` to identify patterns; note every finding with file + line.',
    'Execute or respond within scope — use `edit` to apply changes, `execute` to run commands if permitted.',
    'Verify your output (imports, types, conventions) — use `read` to confirm the final state.',
    outputStep(opts.output),
    'Call `mem_suggest_topic_key` for the work done, then `mem_save` with the returned topic_key, type = `pattern`, and content in What / Why / Where / Learned format.',
    `If running under \`[Parallel:{taskId}]\`, call ${completeSubtaskTool(opts.target)} to notify the aggregator.`,
    'Call `mem_session_end` to mark the session as completed.',
  ];
  return steps.filter((s): s is string => s !== null);
}

// ─── Orchestrator workflow ────────────────────────────────────────────────────

function buildOrchestratorWorkflow(opts: WorkflowOptions): string[] {
  const delegateList = opts.delegatesTo?.length
    ? `Assign each sub-task to the appropriate agent — available delegates: ${opts.delegatesTo.join(', ')}.`
    : 'Identify the most suitable agent for each sub-task based on expertise and intents.';

  const delegateStep = `Before each delegation, call \`mem_suggest_topic_key\` then \`mem_save\` with the full sub-task context (type = \`decision\`) — then use ${handoffTool(opts.target)} for a single target or ${dispatchParallelTool(opts.target)} to fan out; do NOT respond until all invocations complete; never assume shared state.`;

  const escalateStep = `Respond to the user or escalate via ${handoffTool(opts.target)} if blockers remain.`;

  return [
    'Call `mem_session_start` to register the session, then `mem_context` to load recent project context.',
    'Call `mem_search "orchestration {domain}"` to recall past coordination patterns; use `mem_get_observation` on any truncated result.',
    'Understand the high-level goal and acceptance criteria.',
    'Decompose the goal into discrete, independently executable sub-tasks — use `todo` to track each one.',
    delegateList,
    delegateStep,
    'Integrate the results from delegates into a coherent whole.',
    'Validate coherence, completeness, and consistency — use `read` to verify the final file state.',
    'Call `mem_suggest_topic_key` for the outcome, then `mem_save` with type = `decision` and content = what was delegated, to whom, and the full outcome.',
    escalateStep,
    'Call `mem_session_end` to mark the session as completed.',
  ];
}

// ─── Router workflow ──────────────────────────────────────────────────────────

function buildRouterWorkflow(opts: WorkflowOptions): string[] {
  return [
    'Call `mem_session_start` to register the session.',
    'Call `mem_search "routing patterns"` to recall past routing decisions and outcomes; use `mem_get_observation` on any truncated result.',
    'Receive and read the request fully before acting.',
    'Identify the domain and intent(s) expressed in the request.',
    'Apply routing rules in priority order until a match is found.',
    `Single-domain match — generate \`task-{unix-timestamp}\`, call \`mem_save\` with the full assessment (type = \`decision\`, topic_key = \`task-{taskId}\`), then use ${handoffTool(opts.target)}.`,
    `Multi-domain match — generate \`task-{unix-timestamp}\`, for each agent call \`mem_save\` with the sub-assessment (type = \`decision\`, topic_key = \`task-{taskId}-{agentId}\`), then use ${dispatchParallelTool(opts.target)}.`,
    'Call `mem_save` with type = `pattern`, title = `Routing: {intent} → {targetAgent}`, content = one-line outcome.',
    `If no rule matches, escalate via ${handoffTool(opts.target)} to the default orchestrator — never guess or execute the task.`,
    'Call `mem_session_end` to mark the session as completed.',
  ];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Derive the engram mode from role and handoff topology.
 * - router / orchestrator: always autonomous (they coordinate)
 * - worker with receives_from: default (subtask executor, orchestrator manages context)
 * - worker without receives_from: autonomous (entry-point worker, owns its memory)
 */
export function deriveEngramMode(
  role: AgentRole,
  receivesFrom?: string[],
): 'autonomous' | 'default' {
  if (role === 'router' || role === 'orchestrator') return 'autonomous';
  return receivesFrom && receivesFrom.length > 0 ? 'default' : 'autonomous';
}

/**
 * Resolve the final workflow for an agent.
 *
 * If the agent defines its own steps, those take precedence over the role base.
 * Otherwise, a context-aware base workflow is generated from the options:
 * - `target` controls platform-specific tool names (dispatch, handoff, complete-subtask)
 * - `delegatesTo` injects concrete agent IDs into orchestrator delegation steps
 * - `scopeTopics` injects a scope-check gate into worker step 3
 * - `output` injects an explicit format step before mem_save
 * - `receivesFrom` determines autonomous vs standard worker mode
 */
export function resolveWorkflow(
  role: AgentRole,
  agentWorkflow: string[] | undefined,
  options?: WorkflowOptions,
): string[] {
  if (agentWorkflow && agentWorkflow.length > 0) {
    return agentWorkflow;
  }

  const opts = options ?? {};

  if (role === 'router') {
    return buildRouterWorkflow(opts);
  }
  if (role === 'orchestrator') {
    return buildOrchestratorWorkflow(opts);
  }
  // worker
  if (deriveEngramMode(role, opts.receivesFrom) === 'autonomous') {
    return buildWorkerAutonomousWorkflow(opts);
  }
  return buildWorkerWorkflow(opts);
}

// ─── Legacy static exports (kept for consumers that snapshot workflow steps) ──

/**
 * @deprecated Use resolveWorkflow() with options instead.
 * Exported for test snapshots only — do not use in production code.
 */
export const ROLE_BASE_WORKFLOWS: Record<AgentRole, string[]> = {
  worker: buildWorkerWorkflow({}),
  orchestrator: buildOrchestratorWorkflow({}),
  router: buildRouterWorkflow({}),
};

/**
 * @deprecated Use resolveWorkflow() with { receivesFrom: [] } instead.
 * Exported for test snapshots only — do not use in production code.
 */
export const WORKER_AUTONOMOUS_BASE_WORKFLOW: string[] = buildWorkerAutonomousWorkflow({});
