import * as vscode from 'vscode';
import * as path from 'path';
import { AgentSpec, RoutingContext, AgentScore } from './types';
import { AgentLoader } from './agentLoader';
import { Logger } from './logger';

export class AgentRouter {
  private loader: AgentLoader;
  private logger: Logger;

  // Common intent keywords mapping
  private intentKeywords: Map<string, string[]> = new Map([
    ['api_design', ['api', 'endpoint', 'rest', 'graphql', 'route', 'controller']],
    ['db_migration', ['migration', 'database', 'schema', 'sql', 'table', 'column']],
    ['component_creation', ['component', 'react', 'vue', 'svelte', 'tsx', 'jsx']],
    ['ui_styling', ['style', 'css', 'tailwind', 'scss', 'design', 'theme']],
    ['state_management', ['state', 'redux', 'zustand', 'store', 'context']],
    ['testing', ['test', 'spec', 'jest', 'vitest', 'cypress', 'assert']],
    ['bug_fix', ['bug', 'fix', 'error', 'issue', 'problem']],
    ['refactoring', ['refactor', 'clean', 'improve', 'optimize', 'restructure']],
    ['documentation', ['document', 'readme', 'comment', 'doc', 'explain']],
  ]);

  constructor(loader: AgentLoader, logger: Logger) {
    this.loader = loader;
    this.logger = logger;
  }

  /**
   * Analyze user prompt and context to detect intents
   */
  private detectIntents(prompt: string): string[] {
    const detectedIntents: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    for (const [intent, keywords] of this.intentKeywords.entries()) {
      for (const keyword of keywords) {
        if (lowerPrompt.includes(keyword)) {
          detectedIntents.push(intent);
          break;
        }
      }
    }

    return [...new Set(detectedIntents)]; // Remove duplicates
  }

  /**
   * Match agent path globs against current file
   */
  private matchesPathGlobs(agent: AgentSpec, filePath?: string): boolean {
    if (!filePath || !agent._metadata.path_globs || agent._metadata.path_globs.length === 0) {
      return false;
    }

    const normalizedPath = filePath.replace(/\\/g, '/');
    
    for (const glob of agent._metadata.path_globs) {
      const regex = this.globToRegex(glob);
      if (regex.test(normalizedPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Convert glob pattern to regex
   */
  private globToRegex(glob: string): RegExp {
    let regex = glob
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regex}$`);
  }

  /**
   * Check if prompt contains agent keywords
   */
  private matchesKeywords(agent: AgentSpec, prompt: string): string[] {
    const matched: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    if (agent._metadata.keywords) {
      for (const keyword of agent._metadata.keywords) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          matched.push(keyword);
        }
      }
    }

    return matched;
  }

  /**
   * Score an agent based on routing context (normalized scoring)
   */
  private scoreAgent(agent: AgentSpec, context: RoutingContext): AgentScore {
    const reasons: string[] = [];

    // Intent matching ratio (0-1)
    const matchedIntents = agent._metadata.intents.filter(intent => 
      context.detectedIntents.includes(intent)
    );
    
    const intentRatio = context.detectedIntents.length > 0
      ? matchedIntents.length / context.detectedIntents.length
      : 0;
    
    if (matchedIntents.length > 0) {
      reasons.push(`Intents: ${matchedIntents.join(', ')} (${(intentRatio * 100).toFixed(0)}% match)`);
    }

    // Path matching ratio (0 or 1)
    const pathMatch = context.currentFile && this.matchesPathGlobs(agent, context.currentFile) ? 1 : 0;
    
    if (pathMatch > 0) {
      reasons.push(`Path pattern matched`);
    }

    // Keyword matching ratio (0-1)
    const matchedKeywords = this.matchesKeywords(agent, context.userPrompt);
    const keywordRatio = agent._metadata.keywords && agent._metadata.keywords.length > 0
      ? matchedKeywords.length / agent._metadata.keywords.length
      : 0;
    
    if (matchedKeywords.length > 0) {
      reasons.push(`Keywords: ${matchedKeywords.join(', ')} (${(keywordRatio * 100).toFixed(0)}% match)`);
    }

    // Domain relevance (0 or 1)
    const domainMatch = agent._metadata.domain !== 'global' ? 1 : 0;
    
    if (domainMatch > 0) {
      reasons.push(`Specialized domain: ${agent._metadata.domain}`);
    }

    // Weighted normalized score (0-100)
    // Weights: intent 50%, path 25%, keyword 15%, domain 10%
    const normalizedScore = (
      intentRatio * 0.50 +
      pathMatch * 0.25 +
      keywordRatio * 0.15 +
      domainMatch * 0.10
    ) * 100;

    return {
      agentId: agent._metadata.id,
      score: Math.round(normalizedScore),
      reasons
    };
  }

  /**
   * Route user request to best matching agent
   */
  async route(prompt: string, currentFile?: string): Promise<AgentSpec | null> {
    const detectedIntents = this.detectIntents(prompt);
    
    const context: RoutingContext = {
      userPrompt: prompt,
      currentFile,
      detectedIntents,
      matchedKeywords: []
    };

    this.logger.debug(`Routing context:`, {
      prompt: prompt.substring(0, 100),
      currentFile,
      detectedIntents
    });

    const agents = this.loader.getAllAgents();
    const scores: AgentScore[] = agents
      .map(agent => this.scoreAgent(agent, context))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      this.logger.warn('No matching agent found for request');
      return null;
    }

    const topScore = scores[0];
    this.logger.info(`Selected agent: ${topScore.agentId} (score: ${topScore.score})`);
    this.logger.debug(`Routing reasons:`, topScore.reasons);

    return this.loader.getAgent(topScore.agentId) || null;
  }

  /**
   * Get routing suggestions without committing to one agent
   */
  async getSuggestions(prompt: string, currentFile?: string): Promise<AgentScore[]> {
    const detectedIntents = this.detectIntents(prompt);
    
    const context: RoutingContext = {
      userPrompt: prompt,
      currentFile,
      detectedIntents,
      matchedKeywords: []
    };

    const agents = this.loader.getAllAgents();
    return agents
      .map(agent => this.scoreAgent(agent, context))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 suggestions
  }
}
