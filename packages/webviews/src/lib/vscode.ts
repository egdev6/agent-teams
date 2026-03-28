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

type VSCodeApiHandle = ReturnType<typeof acquireVsCodeApi>;

interface AgentTeamsGlobalScope {
  __agentTeamsVsCodeApi__?: VSCodeApiHandle;
  __agentTeamsVsCodeWrapper__?: VSCodeAPI;
}

function getGlobalScope(): AgentTeamsGlobalScope {
  return globalThis as AgentTeamsGlobalScope;
}

function getOrCreateApi(): VSCodeApiHandle {
  const scope = getGlobalScope();
  if (!scope.__agentTeamsVsCodeApi__) {
    scope.__agentTeamsVsCodeApi__ = acquireVsCodeApi();
  }
  return scope.__agentTeamsVsCodeApi__;
}

class VSCodeAPI {
  private api: VSCodeApiHandle;

  constructor() {
    this.api = getOrCreateApi();
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

function getOrCreateWrapper(): VSCodeAPI {
  const scope = getGlobalScope();
  if (!scope.__agentTeamsVsCodeWrapper__) {
    scope.__agentTeamsVsCodeWrapper__ = new VSCodeAPI();
  }
  return scope.__agentTeamsVsCodeWrapper__;
}

// Singleton instance
export const vscode = getOrCreateWrapper();
