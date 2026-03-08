/**
 * Role base workflows for agent types.
 *
 * Each role has a canonical set of workflow steps that is used as the base
 * when the agent YAML does not define its own `workflow[]`. When an agent
 * YAML does define `workflow[]`, those steps replace the base entirely so
 * the rendered MD always shows a single resolved list.
 */
import type { AgentRole } from './types';

export type { AgentRole };

export const ROLE_BASE_WORKFLOWS: Record<AgentRole, string[]> = {
  worker: [
    'Understand the task scope and expected outcome.',
    'Gather the required file and code context before proceeding.',
    'Analyse with your area of expertise; note every finding with file + line.',
    'Execute or respond within the boundaries of your scope.',
    'Verify your output (imports, types, conventions) before sending.',
  ],
  orchestrator: [
    'Understand the high-level goal and acceptance criteria.',
    'Decompose the goal into discrete, independently executable sub-tasks.',
    'Identify the most suitable agent for each sub-task based on expertise and intents.',
    'Delegate each sub-task with sufficient context (do not assume the agent has prior state).',
    'Integrate the results received from delegates into a coherent whole.',
    'Validate coherence, completeness, and consistency of the composed result.',
    'Respond to the user or escalate if blockers remain.',
  ],
  router: [
    'Receive the request and read it fully before acting.',
    'Identify the domain and intent(s) expressed in the request.',
    'Apply routing rules in priority order until a match is found.',
    'Assign the task to the matched agent, forwarding the original context unchanged.',
    'If no rule matches, escalate to the default orchestrator — never guess or execute the task.',
  ],
};

/**
 * Resolve the final workflow for an agent.
 * If the agent defines its own steps, those take precedence over the role base.
 */
export function resolveWorkflow(role: AgentRole, agentWorkflow: string[] | undefined): string[] {
  if (agentWorkflow && agentWorkflow.length > 0) {
    return agentWorkflow;
  }
  return ROLE_BASE_WORKFLOWS[role] ?? ROLE_BASE_WORKFLOWS.worker;
}
