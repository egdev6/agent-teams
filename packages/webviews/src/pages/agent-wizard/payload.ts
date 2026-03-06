import type { SkillUseDefinition } from '../../types';
import type { OrchestratorMaxTokens, RouteTaskRule, WorkerMaxTokens } from './constants';
import { clamp, isAgentRole, parseList } from './constants';

export type AgentWizardFormState = {
  role: string;
  domain: string;
  subdomainsText: string;
  intentsText: string;
  pathGlobsText: string;
  keywordsText: string;
  skillUses: SkillUseDefinition[];
  outputMode: string;
  maxFiles: number;
  maxCharsPerFile: number;
  delegationEnabled: boolean;
  delegationStrategy: string;
  maxHandoffs: number;
  allowedSubagentsText: string;
  routeTaskRules: RouteTaskRule[];
  orchestratorPlanning: boolean;
  orchestratorMaxTokens: OrchestratorMaxTokens;
  orchestratorCapabilities: string[];
  routerCapabilities: string[];
  workerMaxTokens: WorkerMaxTokens;
  workerExecutionEnabled: boolean;
  workerCapabilities: string[];
};

export type AgentWizardMessagePayload = {
  role: 'worker' | 'router' | 'orchestrator';
  domain: string;
  subdomains?: string[];
  intents: string[];
  pathGlobs?: string[];
  keywords?: string[];
  skillUses: SkillUseDefinition[];
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
  routingRules?: RouteTaskRule[];
  router?: {
    capabilities: string[];
  };
  orchestrator?: {
    planning: boolean;
    maxTokens: OrchestratorMaxTokens;
    capabilities: string[];
  };
  worker?: {
    maxTokens: WorkerMaxTokens;
    executionEnabled: boolean;
    capabilities: string[];
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
      skillUses: [],
      output: { modeDefault: 'short+diff' },
      context: { maxFiles: 8, maxCharsPerFile: 8000 },
      delegation: { strategy: 'router_split', maxHandoffs: 1, allowedSubagents: 'all' },
      routingRules: state.routeTaskRules.length > 0 ? state.routeTaskRules : undefined,
      router: {
        capabilities: state.routerCapabilities,
      },
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
      skillUses: [],
      output: { modeDefault: 'short+diff' },
      context: { maxFiles: 8, maxCharsPerFile: 8000 },
      delegation: {
        strategy: 'router_split',
        maxHandoffs: clamp(state.maxHandoffs, 1, 3),
        allowedSubagents: normalizeAllowed(),
      },
      routingRules: state.routeTaskRules.length > 0 ? state.routeTaskRules : undefined,
      orchestrator: {
        planning: state.orchestratorPlanning,
        maxTokens: state.orchestratorMaxTokens,
        capabilities: state.orchestratorCapabilities,
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
    skillUses: state.skillUses,
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
    worker: {
      maxTokens: state.workerMaxTokens,
      executionEnabled: state.workerExecutionEnabled,
      capabilities: state.workerCapabilities,
    },
  };
};
