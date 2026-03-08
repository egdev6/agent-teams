import * as vscode from 'vscode';
import type { AgentLoader } from './agentLoader';
import type { Logger } from './logger';
import type { AgentSpec, DelegationRequest, DelegationResponse } from './types';

export class AgentOrchestrator {
  private loader: AgentLoader;
  private logger: Logger;
  private maxHandoffs: number = 3;

  constructor(loader: AgentLoader, logger: Logger) {
    this.loader = loader;
    this.logger = logger;
  }

  /**
   * Check if an agent can orchestrate (has orchestrator role)
   */
  canOrchestrate(agent: AgentSpec): boolean {
    return agent.role === 'orchestrator';
  }

  /**
   * Execute a delegation request to a subagent with loop protection
   */
  async delegate(
    request: DelegationRequest,
    model: vscode.LanguageModelChat,
    token: vscode.CancellationToken,
  ): Promise<DelegationResponse> {
    // Initialize tracking fields if not present
    const handoffDepth = request.handoffDepth || 0;
    const visitedAgents = request.visitedAgents || new Set<string>();

    // Validate handoff depth
    if (handoffDepth >= this.maxHandoffs) {
      this.logger.warn(
        `Max handoff depth (${this.maxHandoffs}) reached. Stopping delegation chain.`,
      );
      return {
        agentId: request.targetAgentId,
        response: `Maximum delegation depth reached. Please simplify the request.`,
        success: false,
      };
    }

    // Check for loops (same agent visited twice)
    if (visitedAgents.has(request.targetAgentId)) {
      this.logger.error(
        `Loop detected: agent ${request.targetAgentId} already visited in this chain`,
      );
      return {
        agentId: request.targetAgentId,
        response: `Delegation loop detected. Agent already visited in this chain.`,
        success: false,
      };
    }

    const targetAgent = this.loader.getAgent(request.targetAgentId);

    if (!targetAgent) {
      this.logger.error(`Target agent not found: ${request.targetAgentId}`);
      return {
        agentId: request.targetAgentId,
        response: '',
        success: false,
      };
    }

    // Check agent-specific max_handoffs limit (new schema uses handoffs block, default to global max)
    const agentMaxHandoffs = this.maxHandoffs;
    if (handoffDepth >= agentMaxHandoffs) {
      this.logger.warn(`Agent ${request.targetAgentId} max_handoffs (${agentMaxHandoffs}) reached`);
      return {
        agentId: request.targetAgentId,
        response: `Agent delegation limit reached.`,
        success: false,
      };
    }

    // Mark agent as visited
    const newVisitedAgents = new Set(visitedAgents);
    newVisitedAgents.add(request.targetAgentId);

    this.logger.info(
      `Delegating to ${request.targetAgentId} [depth: ${handoffDepth + 1}/${agentMaxHandoffs}]`,
    );

    try {
      // Build prompt with agent description and workflow as instructions
      const agentInstructions = [
        `You are ${targetAgent.name}. ${targetAgent.description}`,
        targetAgent.workflow?.length ? `Workflow: ${targetAgent.workflow.join(' → ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      const messages = [
        vscode.LanguageModelChatMessage.User(agentInstructions),
        vscode.LanguageModelChatMessage.User(`Task: ${request.subTask}`),
        vscode.LanguageModelChatMessage.User(`Context: ${JSON.stringify(request.context)}`),
        vscode.LanguageModelChatMessage.User(`Handoff Depth: ${handoffDepth + 1}`),
      ];

      const chatResponse = await model.sendRequest(messages, {}, token);

      let response = '';
      for await (const fragment of chatResponse.text) {
        response += fragment;
      }

      this.logger.info(`Delegation to ${request.targetAgentId} completed successfully`);

      return {
        agentId: request.targetAgentId,
        response,
        success: true,
        metadata: {
          handoffDepth: handoffDepth + 1,
          visitedAgents: Array.from(newVisitedAgents),
        },
      };
    } catch (error) {
      this.logger.error(`Delegation failed for ${request.targetAgentId}:`, error);
      return {
        agentId: request.targetAgentId,
        response: '',
        success: false,
      };
    }
  }

  /**
   * Execute parallel delegation to multiple subagents
   */
  async delegateParallel(
    requests: DelegationRequest[],
    model: vscode.LanguageModelChat,
    token: vscode.CancellationToken,
  ): Promise<DelegationResponse[]> {
    this.logger.info(`Executing ${requests.length} parallel delegations`);

    const promises = requests.map((req) => this.delegate(req, model, token));
    return await Promise.all(promises);
  }

  /**
   * Aggregate multiple agent responses into a coherent result
   */
  aggregateResponses(responses: DelegationResponse[]): string {
    const successful = responses.filter((r) => r.success);

    if (successful.length === 0) {
      return 'All delegations failed. Please try again.';
    }

    let aggregated = '# Aggregated Response from Multiple Agents\n\n';

    for (const response of successful) {
      aggregated += `## Response from ${response.agentId}\n\n`;
      aggregated += response.response;
      aggregated += '\n\n---\n\n';
    }

    return aggregated;
  }

  /**
   * Check if agent can delegate to specific subagents
   */
  canDelegateTo(orchestrator: AgentSpec, targetAgentId: string): boolean {
    if (!this.canOrchestrate(orchestrator)) {
      return false;
    }

    // Check if target is in allowed_subagents list (if metadata available via _spec)
    // For now, allow delegation to any worker agent
    const targetAgent = this.loader.getAgent(targetAgentId);
    return targetAgent?.role === 'worker';
  }
}
