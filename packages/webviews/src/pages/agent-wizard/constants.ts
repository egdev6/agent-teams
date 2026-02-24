export type AgentRole = 'worker' | 'router' | 'orchestrator';
export type OutputMode = 'short+diff' | 'diff' | 'plan' | 'structured';
export type DelegationStrategy = 'disabled' | 'router_split' | 'agent_handoff';

export const AGENT_ROLES: Array<{ value: AgentRole; label: string; description: string }> = [
  { value: 'worker', label: 'Worker', description: 'Executes specific tasks within a domain' },
  { value: 'router', label: 'Router', description: 'Analyzes requests and delegates them' },
  {
    value: 'orchestrator',
    label: 'Orchestrator',
    description: 'Coordinates multiple agents across workflows',
  },
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

export const WORKER_SKILLS = [
  'file_edit',
  'file_create',
  'file_delete',
  'search_codebase',
  'run_terminal',
  'browser_preview',
  'database_query',
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
