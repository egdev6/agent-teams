import * as vscode from 'vscode';
import { TeamManager } from '../teamManager';

/**
 * LanguageModelTool that copies bundled skills referenced by workspace agents
 * into the workspace's `.agent-teams/skills/` directory.
 *
 * Mirrors the skill-copy step performed during a full team sync, so that
 * project-configurator can materialise skill files after writing the profile
 * without requiring a manual sync from the UI.
 *
 * No input parameters — the workspace root and bundled-skills path are
 * resolved at registration time.
 */
export class CopyBundledSkillsTool implements vscode.LanguageModelTool<Record<string, never>> {
  constructor(private readonly bundledSkillsDir: string) {}

  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('No workspace folder is open — skill copy skipped.'),
      ]);
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    try {
      const teamManager = new TeamManager();
      teamManager.copyBundledSkillsForWorkspace(workspaceRoot, this.bundledSkillsDir);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          'Bundled skills copied to .agent-teams/skills/ for all referenced skill IDs.',
        ),
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`Skill copy failed: ${String(error)}`),
      ]);
    }
  }

  async prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<Record<string, never>>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: 'Copying bundled skills to workspace…',
    };
  }
}
