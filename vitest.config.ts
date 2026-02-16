import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['extension/src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['extension/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/dist/**',
        '**/node_modules/**',
        'extension/src/extension.ts', // VS Code activation, hard to test
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    setupFiles: ['./tests/setup.ts'],
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@extension': path.resolve(__dirname, './extension/src'),
      vscode: path.resolve(__dirname, './tests/mocks/vscode.ts'),
    },
  },
});
