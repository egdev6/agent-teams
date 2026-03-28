/**
 * MergeEngine unit tests
 * Covers: team-priority, profile-priority, explicit-only strategies + conflict tracking
 */

import { describe, expect, it } from 'vitest';
import { MergeEngine } from './mergeEngine';

// Minimal no-op logger — avoids vscode dependency in tests
const noopLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  setLogLevel: () => {},
};

function engine() {
  return new MergeEngine(noopLogger as any);
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const base = {
  id: 'base-agent',
  role: 'worker',
  description: 'Base description',
  max_tokens: 1000,
  tags: ['base'],
};

const profileOverrides = {
  description: 'Profile description',
  max_tokens: 2000,
  tags: ['profile'],
};

const teamOverrides = {
  description: 'Team description',
  max_tokens: 3000,
  tags: ['team'],
};

// ─── team-priority ────────────────────────────────────────────────────────────

describe('MergeEngine — team-priority (default)', () => {
  it('team value wins over profile and base', () => {
    const result = engine().mergeAgentMetadata(base, profileOverrides, teamOverrides, {
      strategy: 'team-priority',
    });
    expect(result.value.description).toBe('Team description');
    expect(result.value.max_tokens).toBe(3000);
  });

  it('profile value wins over base when no team override', () => {
    const result = engine().mergeAgentMetadata(base, profileOverrides, undefined, {
      strategy: 'team-priority',
    });
    expect(result.value.description).toBe('Profile description');
    expect(result.value.max_tokens).toBe(2000);
  });

  it('base value is kept when no overrides conflict', () => {
    const result = engine().mergeAgentMetadata(
      base,
      {},
      {},
      {
        strategy: 'team-priority',
      },
    );
    expect(result.value.id).toBe('base-agent');
    expect(result.value.role).toBe('worker');
  });

  it('records conflicts when values differ', () => {
    const result = engine().mergeAgentMetadata(base, profileOverrides, teamOverrides, {
      strategy: 'team-priority',
    });
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  it('applied list tracks modified paths', () => {
    const result = engine().mergeAgentMetadata(base, profileOverrides, teamOverrides, {
      strategy: 'team-priority',
    });
    expect(result.applied).toContain('description');
    expect(result.applied).toContain('max_tokens');
  });
});

// ─── profile-priority ─────────────────────────────────────────────────────────

describe('MergeEngine — profile-priority', () => {
  it('profile value wins over team and base', () => {
    const result = engine().mergeAgentMetadata(base, profileOverrides, teamOverrides, {
      strategy: 'profile-priority',
    });
    expect(result.value.description).toBe('Profile description');
    expect(result.value.max_tokens).toBe(2000);
  });

  it('team value fills in when no profile override', () => {
    const result = engine().mergeAgentMetadata(
      base,
      { description: 'Profile description' }, // no max_tokens
      teamOverrides,
      { strategy: 'profile-priority' },
    );
    expect(result.value.description).toBe('Profile description');
    // max_tokens comes from team since profile didn't set it
    expect(result.value.max_tokens).toBe(3000);
  });
});

// ─── explicit-only ────────────────────────────────────────────────────────────

describe('MergeEngine — explicit-only', () => {
  it('only explicitly provided values override base', () => {
    const result = engine().mergeAgentMetadata(
      base,
      { description: 'Explicit description' },
      undefined,
      { strategy: 'explicit-only' },
    );
    expect(result.value.description).toBe('Explicit description');
    expect(result.value.max_tokens).toBe(1000); // base unchanged
  });

  it('empty overrides do not change base', () => {
    const result = engine().mergeAgentMetadata(
      base,
      {},
      {},
      {
        strategy: 'explicit-only',
      },
    );
    expect(result.value.description).toBe('Base description');
    expect(result.value.max_tokens).toBe(1000);
  });

  it('null/undefined overrides are filtered out', () => {
    const result = engine().mergeAgentMetadata(base, undefined, undefined, {
      strategy: 'explicit-only',
    });
    expect(result.value.id).toBe('base-agent');
    expect(result.conflicts).toHaveLength(0);
  });
});

// ─── Array merge strategies ───────────────────────────────────────────────────

describe('MergeEngine — array merge strategies', () => {
  it('replace (default): override array replaces base array', () => {
    const result = engine().mergeAgentMetadata(base, teamOverrides, undefined, {
      strategy: 'team-priority',
      arrayMergeStrategy: 'replace',
    });
    expect(result.value.tags).toEqual(['team']);
  });

  it('concat: arrays are concatenated', () => {
    const result = engine().mergeAgentMetadata(base, teamOverrides, undefined, {
      strategy: 'team-priority',
      arrayMergeStrategy: 'concat',
    });
    expect(result.value.tags).toEqual(['base', 'team']);
  });

  it('union: arrays are deduplicated', () => {
    const result = engine().mergeAgentMetadata(
      { ...base, tags: ['shared', 'base'] },
      { tags: ['shared', 'new'] },
      undefined,
      { strategy: 'team-priority', arrayMergeStrategy: 'union' },
    );
    expect(result.value.tags).toEqual(['shared', 'base', 'new']);
  });
});

// ─── createDiff ───────────────────────────────────────────────────────────────

describe('MergeEngine — createDiff', () => {
  it('detects added keys', () => {
    const diffs = engine().createDiff({ a: 1 }, { a: 1, b: 2 });
    const added = diffs.find((d) => d.action === 'added' && d.path === 'b');
    expect(added).toBeDefined();
    expect(added?.after).toBe(2);
  });

  it('detects removed keys', () => {
    const diffs = engine().createDiff({ a: 1, b: 2 }, { a: 1 });
    const removed = diffs.find((d) => d.action === 'removed' && d.path === 'b');
    expect(removed).toBeDefined();
  });

  it('detects changed primitives', () => {
    const diffs = engine().createDiff({ a: 1 }, { a: 42 });
    const changed = diffs.find((d) => d.action === 'changed' && d.path === 'a');
    expect(changed).toBeDefined();
    expect(changed?.before).toBe(1);
    expect(changed?.after).toBe(42);
  });

  it('returns empty for identical objects', () => {
    const diffs = engine().createDiff({ a: 1, b: 'x' }, { a: 1, b: 'x' });
    expect(diffs).toHaveLength(0);
  });
});
