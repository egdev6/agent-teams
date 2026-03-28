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
  'product',
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

export const STEP_LABELS = ['Identity', 'Scope', 'Workflow', 'Skills', 'Behavior', 'Output'];

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

/** Full ordered list of tools selectable in the wizard UI (GitHub Copilot agent spec). */
export const STANDARD_COPILOT_TOOLS = [
  // VS Code built-in tools
  'vscode',
  'execute',
  'read',
  'agent',
  'browser',
  'edit',
  'search',
  'web',
  'todo',
  // Engram memory
  'engram/*',
  // Agent Teams extension tools
  'egdev6.agent-teams/agent-teams-handoff',
  'egdev6.agent-teams/agent-teams-dispatch-parallel',
  'egdev6.agent-teams/agent-teams-complete-subtask',
  'egdev6.agent-teams/agent-teams-suggest-community-skills',
  'egdev6.agent-teams/agent-teams-read-workspace-file',
] as const;

export type StandardCopilotTool = (typeof STANDARD_COPILOT_TOOLS)[number];

/** Human-readable label for display in the tool list. */
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  vscode: 'vscode',
  execute: 'execute',
  read: 'read',
  agent: 'agent',
  browser: 'browser',
  edit: 'edit',
  search: 'search',
  web: 'web',
  todo: 'todo',
  'engram/*': 'engram',
  'egdev6.agent-teams/agent-teams-handoff': 'handoff',
  'egdev6.agent-teams/agent-teams-dispatch-parallel': 'dispatch-parallel',
  'egdev6.agent-teams/agent-teams-complete-subtask': 'complete-subtask',
  'egdev6.agent-teams/agent-teams-suggest-community-skills': 'suggest-skills',
  'egdev6.agent-teams/agent-teams-read-workspace-file': 'read-workspace-file',
};

/** Short description shown beneath the tool name in the tool list. */
export const TOOL_DESCRIPTIONS: Record<string, string> = {
  vscode: 'Use VS Code features',
  execute: 'Execute code and applications on your machine',
  read: 'Read files in your workspace',
  agent: 'Delegate tasks to other agents',
  browser: 'Open and interact with integrated browser pages',
  edit: 'Edit files in your workspace',
  search: 'Search files in your workspace',
  web: 'Fetch information from the web',
  todo: 'Manage and track todo items for task planning',
  'engram/*': 'Persistent memory across sessions',
  'egdev6.agent-teams/agent-teams-handoff': 'Hand off control to another agent',
  'egdev6.agent-teams/agent-teams-dispatch-parallel':
    'Dispatch subtasks in parallel to multiple agents',
  'egdev6.agent-teams/agent-teams-complete-subtask':
    'Report subtask completion back to the orchestrator',
  'egdev6.agent-teams/agent-teams-suggest-community-skills':
    'Suggest community skills for the current task',
  'egdev6.agent-teams/agent-teams-read-workspace-file': 'Read files directly from the workspace',
};

/** Lucide icon name for each tool. */
export const TOOL_ICON_NAMES: Record<string, string> = {
  vscode: 'Code2',
  execute: 'Terminal',
  read: 'FileText',
  agent: 'Bot',
  browser: 'Globe',
  edit: 'Pencil',
  search: 'Search',
  web: 'Wifi',
  todo: 'ListChecks',
  'engram/*': 'Brain',
  'egdev6.agent-teams/agent-teams-handoff': 'ArrowRightLeft',
  'egdev6.agent-teams/agent-teams-dispatch-parallel': 'GitFork',
  'egdev6.agent-teams/agent-teams-complete-subtask': 'CheckSquare',
  'egdev6.agent-teams/agent-teams-suggest-community-skills': 'Lightbulb',
  'egdev6.agent-teams/agent-teams-read-workspace-file': 'FolderOpen',
};

/** Visual groupings for the tool checkbox grid. */
/**
 * Maps legacy / short-form tool names to their canonical standard IDs.
 * Used to de-duplicate tools arrays that contain both old and new names.
 */
export const TOOL_CANONICAL: Record<string, string> = {
  'dispatch-parallel': 'egdev6.agent-teams/agent-teams-dispatch-parallel',
  'agent-teams-dispatch-parallel': 'egdev6.agent-teams/agent-teams-dispatch-parallel',
  'complete-subtask': 'egdev6.agent-teams/agent-teams-complete-subtask',
  'agent-teams-complete-subtask': 'egdev6.agent-teams/agent-teams-complete-subtask',
  'suggest-skills': 'egdev6.agent-teams/agent-teams-suggest-community-skills',
  'agent-teams-suggest-community-skills': 'egdev6.agent-teams/agent-teams-suggest-community-skills',
  'read-workspace-file': 'egdev6.agent-teams/agent-teams-read-workspace-file',
  'agent-teams-read-workspace-file': 'egdev6.agent-teams/agent-teams-read-workspace-file',
};

export const TOOL_GROUPS: Array<{ label: string; tools: readonly string[] }> = [
  {
    label: 'VS Code',
    tools: ['vscode', 'execute', 'read', 'agent', 'browser', 'edit', 'search', 'web', 'todo'],
  },
  {
    label: 'Engram',
    tools: ['engram/*'],
  },
  {
    label: 'Agent Teams',
    tools: [
      'egdev6.agent-teams/agent-teams-handoff',
      'egdev6.agent-teams/agent-teams-dispatch-parallel',
      'egdev6.agent-teams/agent-teams-complete-subtask',
      'egdev6.agent-teams/agent-teams-suggest-community-skills',
      'egdev6.agent-teams/agent-teams-read-workspace-file',
    ],
  },
];
