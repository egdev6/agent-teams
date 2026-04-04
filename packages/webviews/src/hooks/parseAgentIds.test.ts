import { describe, expect, it } from 'vitest';
import { parseAgentIds } from './parseAgentIds';

describe('parseAgentIds', () => {
  it('extracts agent IDs from standard platform/agent-id format', () => {
    const items = [
      { id: 'github_copilot/agent-a', action: 'create' as const },
      { id: 'claude_code/agent-b', action: 'update' as const },
      { id: 'opencode/agent-c', action: 'create' as const },
    ];

    const result = parseAgentIds(items);

    expect(result).toEqual(new Set(['agent-a', 'agent-b', 'agent-c']));
  });

  it('returns empty Set for empty array', () => {
    const result = parseAgentIds([]);

    expect(result).toEqual(new Set());
  });

  it('handles malformed items without slash by returning empty string', () => {
    const items = [
      { id: 'malformed-item', action: 'create' as const },
      { id: 'github_copilot/agent-a', action: 'update' as const },
    ];

    const result = parseAgentIds(items);

    expect(result).toEqual(new Set(['', 'agent-a']));
  });
});
