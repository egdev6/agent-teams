/**
 * Minimal vscode mock for unit tests.
 * Only stubs out the APIs referenced by production code under test.
 */

export const window = {
  showInformationMessage: () => Promise.resolve(undefined),
  showErrorMessage: () => Promise.resolve(undefined),
  showWarningMessage: () => Promise.resolve(undefined),
  createOutputChannel: () => ({
    appendLine: () => {},
    append: () => {},
    show: () => {},
    dispose: () => {},
  }),
};

export const workspace = {
  getConfiguration: () => ({
    get: () => undefined,
    has: () => false,
    inspect: () => undefined,
    update: () => Promise.resolve(),
  }),
  workspaceFolders: [],
  onDidChangeConfiguration: () => ({ dispose: () => {} }),
};

export const Uri = {
  file: (p: string) => ({ fsPath: p, toString: () => p }),
  parse: (s: string) => ({ fsPath: s, toString: () => s }),
  joinPath: (base: { fsPath: string }, ...parts: string[]) => {
    const joined = [base.fsPath, ...parts].join('/');
    return { fsPath: joined, toString: () => joined };
  },
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
  executeCommand: () => Promise.resolve(),
};

export const ExtensionContext = class {};

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export const extensions = {
  getExtension: () => undefined,
};

export default {
  window,
  workspace,
  Uri,
  commands,
  ExtensionContext,
  ConfigurationTarget,
  extensions,
};
