import type { AgentRole } from '../../models';

export const AGENT_ROLES: Array<{ value: AgentRole; label: string; description: string }> = [
  { value: 'router', label: 'Router', description: 'Analyzes requests and delegates them' },
  {
    value: 'orchestrator',
    label: 'Orchestrator',
    description: 'Coordinates multiple agents across workflows',
  },
  { value: 'worker', label: 'Worker', description: 'Executes specific tasks within a domain' },
];

export const DOMAIN_OPTIONS = [
  'backend',
  'frontend',
  'testing',
  'devops',
  'docs',
  'global',
  'fullstack',
  'general',
];

export const OUTPUT_TEMPLATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'diff', label: 'Minimal diff' },
  { value: 'code-review', label: 'Code review' },
  { value: 'planning', label: 'Implementation plan' },
  { value: 'analysis', label: 'Technical analysis' },
  { value: 'step-by-step', label: 'Step-by-step guide' },
  { value: 'structured-qa', label: 'Structured Q&A' },
  { value: 'summary', label: 'Executive summary' },
  { value: 'routing-decision', label: 'Routing decision' },
  { value: 'custom', label: 'Custom' },
];

export const STEP_LABELS = ['Identity', 'Scope', 'Workflow', 'Skills', 'Rules', 'Output'];

export const isAgentRole = (value: string): value is AgentRole =>
  value === 'worker' || value === 'router' || value === 'orchestrator';

export const parseList = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

export const listToMultiline = (values: string[] | undefined): string =>
  Array.isArray(values) && values.length > 0 ? values.join('\n') : '';

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);
