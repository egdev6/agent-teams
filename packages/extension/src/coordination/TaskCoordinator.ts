import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

export interface SubtaskRecord {
  taskId: string;
  agentId: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  dispatchedAt: string;
  engramKey: string;
  completedAt?: string;
  summary?: string;
}

interface TrackedTask {
  subtaskIds: Set<string>;
  completed: Set<string>;
  aggregatorAgentId?: string;
}

/**
 * Background observer that watches `.agent-teams/coordination/*.json` for
 * status updates written by orchestrators (via the `complete_subtask` MCP tool).
 *
 * When ALL subtasks for a given taskId reach `status: "completed"`, it
 * automatically opens a new chat pre-filled for the Aggregator agent.
 */
export class TaskCoordinator implements vscode.Disposable {
  private readonly coordinationDir: string;
  private readonly tasks = new Map<string, TrackedTask>();
  private watcher?: vscode.FileSystemWatcher;

  constructor(workspaceRoot: string) {
    this.coordinationDir = path.join(workspaceRoot, '.agent-teams', 'coordination');
  }

  /**
   * Register an in-flight parallel task so the coordinator knows how many
   * subtasks must complete before opening the aggregator.
   */
  registerTask(taskId: string, subtaskAgentIds: string[], aggregatorAgentId?: string): void {
    this.tasks.set(taskId, {
      subtaskIds: new Set(subtaskAgentIds),
      completed: new Set(),
      aggregatorAgentId,
    });
  }

  /** Start watching the coordination directory for completion updates. */
  startWatching(): void {
    fs.mkdirSync(this.coordinationDir, { recursive: true });

    const pattern = new vscode.RelativePattern(this.coordinationDir, '*.json');
    // Only listen for changes (creates handled separately by DispatchParallelTool)
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern, true, false, true);
    this.watcher.onDidChange((uri) => this.onFileChanged(uri));
  }

  private onFileChanged(uri: vscode.Uri): void {
    let record: SubtaskRecord;
    try {
      const raw = fs.readFileSync(uri.fsPath, 'utf-8');
      record = JSON.parse(raw) as SubtaskRecord;
    } catch {
      // File may be mid-write; ignore and wait for next event
      return;
    }
    if (record.status !== 'completed') return;
    this.notifyCompleted(record.taskId, record.agentId);
  }

  /**
   * Called directly by CompleteSubtaskTool (avoids relying on file-watcher timing).
   * Safe to call multiple times for the same agentId — Set deduplicates.
   */
  notifyCompleted(taskId: string, agentId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.completed.add(agentId);
    if (task.completed.size >= task.subtaskIds.size) {
      void this.openAggregator(taskId, task);
      this.tasks.delete(taskId);
    }
  }

  private async openAggregator(taskId: string, task: TrackedTask): Promise<void> {
    const agentId = task.aggregatorAgentId ?? 'aggregator';
    const agentListKeys = [...task.subtaskIds]
      .map((id) => `\`task:${taskId}:subtask:${id}:result\``)
      .join(', ');

    const query =
      `@${agentId} [Aggregate:${taskId}] All subtasks completed. ` +
      `Recall results from Engram: ${agentListKeys}. ` +
      `Detect conflicts and produce the unified outcome.`;

    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query,
      isPartialQuery: false,
    });
  }

  dispose(): void {
    this.watcher?.dispose();
  }
}
