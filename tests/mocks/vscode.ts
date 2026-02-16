/**
 * Mock for VS Code API
 * 
 * Since VS Code APIs are only available in the extension host,
 * we need to mock them for unit testing.
 */

import { vi } from 'vitest';

// Mock VS Code window API
export const window = {
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showQuickPick: vi.fn(),
  showInputBox: vi.fn(),
  createOutputChannel: vi.fn(() => ({
    appendLine: vi.fn(),
    append: vi.fn(),
    clear: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  })),
  createWebviewPanel: vi.fn(() => ({
    webview: {
      html: '',
      onDidReceiveMessage: vi.fn(),
      postMessage: vi.fn(),
    },
    reveal: vi.fn(),
    dispose: vi.fn(),
    onDidDispose: vi.fn(),
  })),
};

// Mock VS Code workspace API
export const workspace = {
  workspaceFolders: undefined as any,
  getConfiguration: vi.fn(() => ({
    get: vi.fn((key: string, defaultValue?: any) => defaultValue),
    has: vi.fn(() => true),
    inspect: vi.fn(),
    update: vi.fn(),
  })),
  onDidChangeConfiguration: vi.fn(),
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    delete: vi.fn(),
    createDirectory: vi.fn(),
    stat: vi.fn(),
  },
};

// Mock VS Code commands API
export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

// Mock VS Code Uri
export class Uri {
  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static parse(value: string): Uri {
    const match = value.match(/^(\w+):\/\/([^/]*)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
    if (!match) {
      throw new Error(`Invalid URI: ${value}`);
    }
    return new Uri(
      match[1],
      match[2] || '',
      match[3] || '',
      match[4] || '',
      match[5] || ''
    );
  }

  constructor(
    public scheme: string,
    public authority: string,
    public path: string,
    public query: string,
    public fragment: string
  ) {}

  get fsPath(): string {
    return this.path;
  }

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}${this.query}${this.fragment}`;
  }
}

// Mock VS Code ViewColumn enum
export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
}

// Mock VS Code Disposable
export class Disposable {
  constructor(private callOnDispose: () => void) {}

  dispose(): void {
    this.callOnDispose();
  }

  static from(...disposables: { dispose(): any }[]): Disposable {
    return new Disposable(() => {
      disposables.forEach((d) => d.dispose());
    });
  }
}

// Mock VS Code EventEmitter
export class EventEmitter<T> {
  private listeners: ((e: T) => any)[] = [];

  get event() {
    return (listener: (e: T) => any) => {
      this.listeners.push(listener);
      return new Disposable(() => {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      });
    };
  }

  fire(event: T): void {
    this.listeners.forEach((listener) => listener(event));
  }

  dispose(): void {
    this.listeners = [];
  }
}

// Mock VS Code ExtensionContext
export class ExtensionContext {
  subscriptions: { dispose(): any }[] = [];
  extensionUri = Uri.file('/mock/extension/path');
  extensionPath = '/mock/extension/path';
  globalState = {
    get: vi.fn(),
    update: vi.fn(),
    keys: vi.fn(() => []),
  };
  workspaceState = {
    get: vi.fn(),
    update: vi.fn(),
    keys: vi.fn(() => []),
  };
  secrets = {
    get: vi.fn(),
    store: vi.fn(),
    delete: vi.fn(),
  };
  storageUri = Uri.file('/mock/storage');
  globalStorageUri = Uri.file('/mock/global-storage');
  logUri = Uri.file('/mock/logs');
}

// Export all mocks
export default {
  window,
  workspace,
  commands,
  Uri,
  ViewColumn,
  Disposable,
  EventEmitter,
  ExtensionContext,
};
