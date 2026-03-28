import * as vscode from 'vscode';
import { TeamManager } from '../teamManager';

/**
 * LanguageModelTool that regenerates root context files (AGENTS.md,
 * .github/copilot-instructions.md, etc.) for all configured sync targets.
 *
 * Mirrors the sync step that SaveProfileCommand performs after a UI save,
 * so that agents writing project.profile.yml directly to disk (e.g.
 * project-configurator) can trigger the same materialisation without
 * requiring the user to open the dashboard and save manually.
 *
 * No input parameters — the workspace root is resolved from the VS Code API.
 */
export class SyncContextFilesTool implements vscode.LanguageModelTool<Record<string, never>> {
  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('No workspace folder is open — sync skipped.'),
      ]);
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    try {
      const teamManager = new TeamManager();
      await teamManager.syncContextFileOnly(workspaceRoot);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          'Context files synced successfully (AGENTS.md, copilot-instructions.md, etc.).',
        ),
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`Sync failed: ${String(error)}`),
      ]);
    }
  }

  async prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, never>>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: 'Syncing context files to all targets…',
    };
  }
}
