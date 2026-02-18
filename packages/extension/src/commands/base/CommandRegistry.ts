/**
 * Command Registry
 * Central registry for all extension commands
 */

import * as vscode from 'vscode';
import type { Logger } from '../../logger';
import type { Command, CommandContext } from './Command';

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private disposables: vscode.Disposable[] = [];
  private context: CommandContext;
  private logger: Logger;

  constructor(extensionUri: vscode.Uri, extensionContext: vscode.ExtensionContext, logger: Logger) {
    this.logger = logger;
    this.context = {
      extensionUri,
      extensionContext,
      logger,
    };
  }

  /**
   * Register a command
   */
  register(command: Command): void {
    const commandId = command.getFullCommandId();

    if (this.commands.has(commandId)) {
      this.logger.warn(`Command ${commandId} already registered, skipping`);
      return;
    }

    this.commands.set(commandId, command);
    this.logger.info(`Registered command: ${commandId} (${command.metadata.title})`);
  }

  /**
   * Register multiple commands at once
   */
  registerAll(commands: Command[]): void {
    for (const cmd of commands) {
      this.register(cmd);
    }
  }

  /**
   * Activate all registered commands with VSCode
   */
  activateAll(context: vscode.ExtensionContext): void {
    this.commands.forEach((command, commandId) => {
      const disposable = vscode.commands.registerCommand(commandId, async (...args: any[]) => {
        try {
          // Check if command can execute
          const canExecute = await command.canExecute();
          if (!canExecute) {
            this.logger.warn(`Command ${commandId} cannot execute (validation failed)`);
            return;
          }

          // Execute command
          this.logger.info(`Executing command: ${commandId}`);
          await command.execute(...args);
          this.logger.info(`Command completed: ${commandId}`);
        } catch (error) {
          this.logger.error(`Command ${commandId} failed`, error);
          vscode.window.showErrorMessage(`Command failed: ${command.metadata.title}\n${error}`);
        }
      });

      this.disposables.push(disposable);
      context.subscriptions.push(disposable);
    });

    this.logger.info(`Activated ${this.commands.size} commands`);
  }

  /**
   * Get a command by ID
   */
  get(commandId: string): Command | undefined {
    return this.commands.get(`agent-teams.${commandId}`);
  }

  /**
   * Get all commands
   */
  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getByCategory(category: string): Command[] {
    return this.getAll().filter((cmd) => cmd.metadata.category === category);
  }

  /**
   * Get command context (for creating new commands)
   */
  getContext(): CommandContext {
    return this.context;
  }

  /**
   * Dispose all commands
   */
  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this.commands.clear();
    this.logger.info('Command registry disposed');
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const stats = {
      total: this.commands.size,
      byCategory: {} as Record<string, number>,
    };

    this.commands.forEach((cmd) => {
      const category = cmd.metadata.category;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    return stats;
  }
}
