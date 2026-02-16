/**
 * Test setup file
 * Runs before all test suites
 */

import { vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock console methods to avoid cluttering test output
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
