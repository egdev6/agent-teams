import * as path from 'node:path';
import * as vscode from 'vscode';

interface ReadWorkspaceFileInput {
  /**
   * Path relative to the workspace root (e.g. ".agent-teams/project.profile.yml"
   * or ".agent-teams/agents/"). May be a file or a directory.
   */
  path: string;
}

/**
 * LanguageModelTool that reads a file or lists a directory directly from the VS Code
 * workspace file system, bypassing `.gitignore` and semantic-search indexing.
 *
 * This is necessary for reading `.agent-teams/` content, which is typically gitignored
 * and therefore invisible to the `search` (codebase) tool.
 *
 * - If `path` resolves to a file: returns its UTF-8 text content.
 * - If `path` resolves to a directory: returns a newline-separated list of
 *   `<name>  [file|directory]` entries.
 *
 * Paths outside the workspace root are rejected for security.
 */
export class ReadWorkspaceFileTool implements vscode.LanguageModelTool<ReadWorkspaceFileInput> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ReadWorkspaceFileInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const { path: relativePath } = options.input;

    if (!relativePath || typeof relativePath !== 'string') {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          'Error: "path" parameter is required. Provide a path relative to the workspace root, e.g. ".agent-teams/project.profile.yml" or ".agent-teams/agents/".',
        ),
      ]);
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('No workspace folder is open.'),
      ]);
    }

    const workspaceRoot = workspaceFolders[0].uri;
    const targetUri = vscode.Uri.joinPath(workspaceRoot, relativePath);

    // Security: reject paths that escape the workspace root
    const rootWithSep = workspaceRoot.fsPath + path.sep;
    if (!targetUri.fsPath.startsWith(rootWithSep) && targetUri.fsPath !== workspaceRoot.fsPath) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Access denied: "${relativePath}" resolves outside the workspace root.`,
        ),
      ]);
    }

    // Determine whether the path is a file or directory
    let stat: vscode.FileStat;
    try {
      stat = await vscode.workspace.fs.stat(targetUri);
    } catch {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`Not found: ${relativePath}`),
      ]);
    }

    if (stat.type === vscode.FileType.Directory) {
      return this.listDirectory(targetUri, relativePath);
    }

    return this.readFile(targetUri, relativePath);
  }

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<ReadWorkspaceFileInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation> {
    const p = options.input?.path;
    return {
      invocationMessage: p ? `Reading ${p}…` : 'Reading workspace file…',
    };
  }

  private async readFile(
    uri: vscode.Uri,
    displayPath: string,
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(bytes).toString('utf8');
      return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(content)]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`Error reading file "${displayPath}": ${String(error)}`),
      ]);
    }
  }

  private async listDirectory(
    uri: vscode.Uri,
    displayPath: string,
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const entries = await vscode.workspace.fs.readDirectory(uri);
      if (entries.length === 0) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(`Directory is empty: ${displayPath}`),
        ]);
      }
      const lines = entries.map(([name, type]) => {
        const kind = type === vscode.FileType.Directory ? 'directory' : 'file';
        return `${name}  [${kind}]`;
      });
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(lines.join('\n')),
      ]);
    } catch (error) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Error listing directory "${displayPath}": ${String(error)}`,
        ),
      ]);
    }
  }
}
