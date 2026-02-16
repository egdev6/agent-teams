import * as vscode from 'vscode';
import { LogLevel } from './types';

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = 'info') {
    this.outputChannel = vscode.window.createOutputChannel('Agent Team');
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0 ? ' ' + args.map(a => 
      typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
    ).join(' ') : '';
    return `[${timestamp}] [${level}] ${message}${argsStr}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      this.outputChannel.appendLine(this.formatMessage('DEBUG', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      this.outputChannel.appendLine(this.formatMessage('INFO', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      this.outputChannel.appendLine(this.formatMessage('WARN', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      this.outputChannel.appendLine(this.formatMessage('ERROR', message, ...args));
    }
  }

  show(): void {
    this.outputChannel.show();
  }

  clear(): void {
    this.outputChannel.clear();
  }

  appendLine(message: string): void {
    this.outputChannel.appendLine(message);
  }

  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}
