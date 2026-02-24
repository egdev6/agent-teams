/**
 * Base Command Abstract Class
 * All commands extend from this class for consistent structure
 */

import * as vscode from 'vscode';
import type { Logger } from '../../logger';

export interface CommandContext {
  extensionUri: vscode.Uri;
  extensionContext: vscode.ExtensionContext;
  logger: Logger;
}

export interface CommandMetadata {
  id: string;
  title: string;
  category: 'agent' | 'team' | 'project' | 'view';
  description?: string;
  keybinding?: string;
}

export abstract class Command {
  protected context: CommandContext;
  public readonly metadata: CommandMetadata;

  constructor(context: CommandContext, metadata: CommandMetadata) {
    this.context = context;
    this.metadata = metadata;
  }

  /**
   * Execute the command
   */
  abstract execute(...args: any[]): Promise<void> | void;

  /**
   * Validate if command can be executed
   * Override for custom validation logic
   */
  async canExecute(): Promise<boolean> {
    return true;
  }

  /**
   * Get workspace folder (helper)
   */
  protected getWorkspaceFolder(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder open');
      return undefined;
    }
    return workspaceFolders[0].uri.fsPath;
  }

  /**
   * Show error message and log
   */
  protected showError(message: string, error?: any): void {
    this.context.logger.error(`${this.metadata.id}: ${message}`, error);
    vscode.window.showErrorMessage(message);
  }

  /**
   * Show info message and log
   */
  protected showInfo(message: string): void {
    this.context.logger.info(`${this.metadata.id}: ${message}`);
    vscode.window.showInformationMessage(message);
  }

  /**
   * Show warning message and log
   */
  protected showWarning(message: string): void {
    this.context.logger.warn(`${this.metadata.id}: ${message}`);
    vscode.window.showWarningMessage(message);
  }

  /**
   * Get full command ID (e.g., "agent-teams.initProfile")
   */
  getFullCommandId(): string {
    return `agent-teams.${this.metadata.id}`;
  }
}
