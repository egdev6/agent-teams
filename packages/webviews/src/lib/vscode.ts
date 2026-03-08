/**
 * VSCode API Wrapper
 * Provides type-safe interface to VSCode webview API
 */

import type { MessageType } from '../models';

// Get VS Code API
declare const acquireVsCodeApi: () => {
  postMessage: (message: MessageType) => void;
  setState: (state: any) => void;
  getState: () => any;
};

class VSCodeAPI {
  private api: ReturnType<typeof acquireVsCodeApi>;

  constructor() {
    this.api = acquireVsCodeApi();
  }

  /**
   * Send a message to the extension
   */
  postMessage(message: MessageType): void {
    this.api.postMessage(message);
  }

  /**
   * Save state that persists across webview reloads
   */
  setState<T>(state: T): void {
    this.api.setState(state);
  }

  /**
   * Get previously saved state
   */
  getState<T>(): T | undefined {
    return this.api.getState();
  }
}

// Singleton instance
export const vscode = new VSCodeAPI();
