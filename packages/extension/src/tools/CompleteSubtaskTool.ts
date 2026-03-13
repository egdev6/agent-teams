import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { TaskCoordinator } from '../coordination/TaskCoordinator';

interface CompleteSubtaskInput {
  taskId: string;
  agentId: string;
  summary?: string;
}

/**
 * LanguageModelTool that orchestrators call at the end of a parallel dispatch session.
 *
 * Flow:
 * 1. Orchestrator finishes its assigned work.
 * 2. Orchestrator calls this tool with taskId, agentId, and optional summary.
 * 3. Tool updates the coordination JSON file (status → "completed").
 * 4. Tool calls coordinator.notifyCompleted() directly (no file-watcher dependency).
 * 5. When all subtasks complete, TaskCoordinator opens the Aggregator chat.
 */
export class CompleteSubtaskTool implements vscode.LanguageModelTool<CompleteSubtaskInput> {
  constructor(
    private readonly coordinator: TaskCoordinator,
    private readonly workspaceRoot: string,
  ) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<CompleteSubtaskInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const { taskId, agentId, summary } = options.input;

    const filePath = path.join(
      this.workspaceRoot,
      '.agent-teams',
      'coordination',
      `${taskId}-${agentId}.json`,
    );

    let record: Record<string, unknown> = { taskId, agentId, status: 'pending' };
    if (fs.existsSync(filePath)) {
      try {
        record = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
      } catch {
        /* use defaults */
      }
    }

    record.status = 'completed';
    record.completedAt = new Date().toISOString();
    if (summary) record.summary = summary;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');

    // Notify directly — faster and more reliable than waiting for the file watcher
    this.coordinator.notifyCompleted(taskId, agentId);

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        `Subtask \`${agentId}\` for task \`${taskId}\` marked as completed.` +
          (summary ? ' Summary recorded.' : '') +
          ' The aggregator will open automatically once all subtasks complete.',
      ),
    ]);
  }

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<CompleteSubtaskInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation> {
    const { taskId, agentId } = options.input;
    return {
      invocationMessage: `Marking subtask \`${agentId}\` as completed for task \`${taskId}\`…`,
    };
  }
}
