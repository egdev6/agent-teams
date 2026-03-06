export type AgentRole = 'worker' | 'router' | 'orchestrator';

export type RouteTaskRule = {
  agentId: string;
  tasks: string[];
};
export type OutputMode = 'short+diff' | 'diff' | 'plan' | 'structured';
export type DelegationStrategy = 'disabled' | 'router_split' | 'agent_handoff';

export const AGENT_ROLES: Array<{ value: AgentRole; label: string; description: string }> = [
  { value: 'router', label: 'Router', description: 'Analyzes requests and delegates them' },
  {
    value: 'orchestrator',
    label: 'Orchestrator',
    description: 'Coordinates multiple agents across workflows',
  },
  { value: 'worker', label: 'Worker', description: 'Executes specific tasks within a domain' },
];

export const STEP_LABELS: Record<AgentRole, string[]> = {
  worker: [
    'Name',
    'Description',
    'Role',
    'Domain',
    'Subdomains',
    'Intents',
    'Path Globs',
    'Keywords',
    'Skills',
    'Advanced',
  ],
  router: ['Name', 'Description', 'Role', 'Domain', 'Intents', 'Keywords'],
  orchestrator: [
    'Name',
    'Description',
    'Role',
    'Domain',
    'Subdomains',
    'Intents',
    'Path Globs',
    'Keywords',
    'Delegation',
  ],
};

export const OUTPUT_MODES: OutputMode[] = ['short+diff', 'diff', 'plan', 'structured'];

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

export type AgentMaxTokens = 'low' | 'medium' | 'high';
export type OrchestratorMaxTokens = AgentMaxTokens;
export type WorkerMaxTokens = AgentMaxTokens;

export const WORKER_ROLE_CAPABILITIES = [
  'code_generation',
  'file_editing',
  'running_commands',
  'implementing_tasks',
] as const;

export const ROUTER_CAPABILITIES = ['assign_worker', 'read_repo'] as const;

export const ALL_CAPABILITIES = [
  'create_task',
  'assign_worker',
  'read_repo',
  'review_code',
  'code_generation',
  'file_editing',
  'running_commands',
  'implementing_tasks',
] as const;

export const WORKER_MAX_TOKENS_OPTIONS: Array<{
  value: WorkerMaxTokens;
  label: string;
  description: string;
}> = [
  { value: 'low', label: 'Low', description: 'Minimal token budget, fast responses' },
  { value: 'medium', label: 'Medium', description: 'Balanced budget for focused tasks' },
  { value: 'high', label: 'High', description: 'Full budget for complex implementations' },
];

export const ORCHESTRATOR_CAPABILITIES = [
  'create_task',
  'assign_worker',
  'read_repo',
  'review_code',
] as const;

export const ORCHESTRATOR_MAX_TOKENS_OPTIONS: Array<{
  value: OrchestratorMaxTokens;
  label: string;
  description: string;
}> = [
  { value: 'low', label: 'Low', description: 'Minimal token budget, fast responses' },
  { value: 'medium', label: 'Medium', description: 'Balanced budget for moderate plans' },
  { value: 'high', label: 'High', description: 'Full budget for complex multi-step plans' },
];

export const UNIQUE_DEFAULT = {
  outputMode: 'short+diff' as OutputMode,
  maxFiles: 8,
  maxCharsPerFile: 8000,
};

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
