import { clamp, isAgentRole, parseList } from './constants';

export type AgentWizardFormState = {
  role: string;
  domain: string;
  subdomainsText: string;
  intentsText: string;
  pathGlobsText: string;
  keywordsText: string;
  skills: string[];
  outputMode: string;
  maxFiles: number;
  maxCharsPerFile: number;
  delegationEnabled: boolean;
  delegationStrategy: string;
  maxHandoffs: number;
  allowedSubagentsText: string;
};

export type AgentWizardMessagePayload = {
  role: 'worker' | 'router' | 'orchestrator';
  domain: string;
  subdomains?: string[];
  intents: string[];
  pathGlobs?: string[];
  keywords?: string[];
  skills: string[];
  output: {
    modeDefault: 'short+diff' | 'diff' | 'plan' | 'structured';
  };
  context: {
    maxFiles: number;
    maxCharsPerFile: number;
  };
  delegation: {
    strategy: 'disabled' | 'router_split' | 'agent_handoff';
    maxHandoffs?: number;
    allowedSubagents?: string[] | 'all';
  };
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: role-specific payload rules intentionally centralized
export const buildAgentWizardPayload = (state: AgentWizardFormState): AgentWizardMessagePayload => {
  const subdomains = parseList(state.subdomainsText);
  const intents = parseList(state.intentsText);
  const pathGlobs = parseList(state.pathGlobsText);
  const keywords = parseList(state.keywordsText);
  const allowedSubagents = parseList(state.allowedSubagentsText);
  const role = isAgentRole(state.role) ? state.role : 'worker';
  const normalizeAllowed = (): string[] | 'all' =>
    allowedSubagents.length === 1 && allowedSubagents[0] === 'all' ? 'all' : allowedSubagents;

  if (role === 'router') {
    return {
      role,
      domain: 'global',
      subdomains: subdomains.length > 0 ? subdomains : undefined,
      intents,
      pathGlobs: pathGlobs.length > 0 ? pathGlobs : undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
      skills: ['search_codebase'],
      output: { modeDefault: 'short+diff' },
      context: { maxFiles: 8, maxCharsPerFile: 8000 },
      delegation: { strategy: 'router_split', maxHandoffs: 1, allowedSubagents: 'all' },
    };
  }

  if (role === 'orchestrator') {
    return {
      role,
      domain: state.domain.trim() || 'global',
      subdomains: subdomains.length > 0 ? subdomains : undefined,
      intents,
      pathGlobs: pathGlobs.length > 0 ? pathGlobs : undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
      skills: [],
      output: { modeDefault: 'short+diff' },
      context: { maxFiles: 8, maxCharsPerFile: 8000 },
      delegation: {
        strategy: 'router_split',
        maxHandoffs: clamp(state.maxHandoffs, 1, 3),
        allowedSubagents: normalizeAllowed(),
      },
    };
  }

  return {
    role,
    domain: state.domain.trim() || 'general',
    subdomains: subdomains.length > 0 ? subdomains : undefined,
    intents,
    pathGlobs: pathGlobs.length > 0 ? pathGlobs : undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    skills: state.skills,
    output: {
      modeDefault: state.outputMode as 'short+diff' | 'diff' | 'plan' | 'structured',
    },
    context: {
      maxFiles: clamp(state.maxFiles, 1, 64),
      maxCharsPerFile: clamp(state.maxCharsPerFile, 500, 40000),
    },
    delegation: state.delegationEnabled
      ? {
          strategy: state.delegationStrategy === 'router_split' ? 'router_split' : 'agent_handoff',
          maxHandoffs: clamp(state.maxHandoffs, 1, 2),
          allowedSubagents: normalizeAllowed(),
        }
      : { strategy: 'disabled' },
  };
};
