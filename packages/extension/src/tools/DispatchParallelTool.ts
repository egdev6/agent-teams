import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { TaskCoordinator } from '../coordination/TaskCoordinator';

interface SubtaskInput {
  agentId: string;
  description: string;
}

interface DispatchParallelInput {
  taskId?: string;
  assessment: string;
  subtasks: SubtaskInput[];
  aggregatorAgentId?: string;
  supervised?: boolean;
}

/**
 * LanguageModelTool that fans out a task to multiple orchestrators in parallel.
 *
 * Flow:
 * 1. Router writes full assessment to Engram per-subtask
 *    (key: `task:{taskId}:subtask:{agentId}`) before calling this tool.
 * 2. Tool creates coordination files in `.agent-teams/coordination/`.
 * 3. Tool opens one new chat per orchestrator.
 * 4. TaskCoordinator watches for completions; when all done → opens Aggregator.
 */
export class DispatchParallelTool implements vscode.LanguageModelTool<DispatchParallelInput> {
  constructor(
    private readonly coordinator: TaskCoordinator,
    private readonly workspaceRoot: string,
  ) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<DispatchParallelInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const {
      taskId: providedId,
      assessment,
      subtasks,
      aggregatorAgentId,
      supervised = false,
    } = options.input;

    if (!subtasks || subtasks.length < 2) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          'Error: `agent-teams-dispatch-parallel` requires at least 2 subtasks. ' +
            'For a single handoff use `agent-teams-handoff` instead.',
        ),
      ]);
    }

    const taskId = providedId ?? `task-${Math.floor(Date.now() / 1000)}`;
    const coordinationDir = path.join(this.workspaceRoot, '.agent-teams', 'coordination');
    fs.mkdirSync(coordinationDir, { recursive: true });

    // Extract one-line summary from the assessment for the chat query
    const summaryLine =
      assessment
        .split('\n')
        .find((l) => l.trim().length > 0)
        ?.trim()
        .slice(0, 180) ?? assessment.slice(0, 180);

    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      // Write coordination record (status starts as "pending")
      const record = {
        taskId,
        agentId: subtask.agentId,
        description: subtask.description,
        status: 'pending' as const,
        dispatchedAt: new Date().toISOString(),
        engramKey: `task:${taskId}:subtask:${subtask.agentId}`,
      };
      const filePath = path.join(coordinationDir, `${taskId}-${subtask.agentId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');

      const query =
        `@${subtask.agentId} [Parallel:${taskId}] ${subtask.description}. ` +
        `Context: ${summaryLine}. ` +
        `Recall full task context from Engram key \`task:${taskId}:subtask:${subtask.agentId}\`. ` +
        `When you have finished ALL your work, call #agent-teams-complete-subtask with ` +
        `taskId="${taskId}", agentId="${subtask.agentId}", and a brief summary of what you did.`;

      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query,
        isPartialQuery: supervised,
      });
    }

    // Register with coordinator so it can fan-in once all subtasks complete
    this.coordinator.registerTask(
      taskId,
      subtasks.map((s) => s.agentId),
      aggregatorAgentId,
    );

    const agentList = subtasks.map((s) => `@${s.agentId}`).join(', ');
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        `Parallel dispatch initiated for task \`${taskId}\`.\n` +
          `Agents queued: ${agentList}. Each will execute sequentially in its own chat session.\n` +
          `Coordination files written to \`.agent-teams/coordination/\`.\n` +
          `When all agents call #agent-teams-complete-subtask, @${aggregatorAgentId ?? 'aggregator'} will open automatically.`,
      ),
    ]);
  }

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<DispatchParallelInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation> {
    const { subtasks, taskId } = options.input;
    const agents = subtasks?.map((s) => `@${s.agentId}`).join(', ') ?? 'multiple agents';
    const id = taskId ?? '(auto)';
    return {
      invocationMessage: `Dispatching task ${id} in parallel to ${agents}…`,
    };
  }
}
