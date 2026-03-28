/**
 * ProfileLoader unit tests
 * Covers: YAML parsing errors, missing required fields, valid profiles
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { setSchemaBasePath } from '@agent-teams/core';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ProfileLoader } from './profileLoader';

// Point schema resolution at the source schemas directory for tests
beforeAll(() => {
  const schemasDir = path.join(__dirname, '../../core/schemas');
  setSchemaBasePath(schemasDir);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agent-teams-test-'));
}

function writeProfile(dir: string, content: string): void {
  const profileDir = path.join(dir, '.agent-teams');
  fs.mkdirSync(profileDir, { recursive: true });
  fs.writeFileSync(path.join(profileDir, 'project.profile.yml'), content, 'utf-8');
}

const VALID_PROFILE = `
project:
  id: test-project
  name: Test Project
  version: "1.0.0"
paths:
  src: ./src
commands:
  build: pnpm build
`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProfileLoader — valid profile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads a valid profile successfully', async () => {
    writeProfile(tmpDir, VALID_PROFILE);
    const loader = new ProfileLoader();
    const profile = await loader.load(tmpDir);

    expect(profile.project.id).toBe('test-project');
    expect(profile.project.name).toBe('Test Project');
    expect(profile.paths.src).toBe('./src');
    expect(profile.commands.build).toBe('pnpm build');
  });

  it('caches the profile on second load', async () => {
    writeProfile(tmpDir, VALID_PROFILE);
    const loader = new ProfileLoader();

    const first = await loader.load(tmpDir);
    const second = await loader.load(tmpDir);

    expect(first).toBe(second); // same object reference (from cache)
  });
});

describe('ProfileLoader — missing profile file', () => {
  it('throws when no profile file exists', async () => {
    const tmpDir = makeTmpDir();
    const loader = new ProfileLoader();

    await expect(loader.load(tmpDir)).rejects.toThrow(/not found/i);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('ProfileLoader — malformed YAML', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws on YAML syntax error', async () => {
    writeProfile(tmpDir, 'project: {invalid yaml [[ }');
    const loader = new ProfileLoader();

    await expect(loader.load(tmpDir)).rejects.toThrow(/parse/i);
  });
});

describe('ProfileLoader — schema validation', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws when project.id is missing', async () => {
    writeProfile(
      tmpDir,
      `
project:
  name: No ID Project
  version: "1.0.0"
paths:
  src: ./src
commands:
  build: pnpm build
`,
    );
    const loader = new ProfileLoader();
    await expect(loader.load(tmpDir)).rejects.toThrow(/validation failed/i);
  });

  it('throws when required top-level fields are absent', async () => {
    writeProfile(
      tmpDir,
      `
project:
  id: minimal
  name: Minimal
  version: "1.0.0"
`,
    );
    const loader = new ProfileLoader();
    // 'paths' and 'commands' are required by the schema
    await expect(loader.load(tmpDir)).rejects.toThrow(/validation failed/i);
  });
});
