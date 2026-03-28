/**
 * contextPackMeta unit tests
 * Covers: parseContextPackFrontmatter, stripFrontmatter, setContextPackPriority
 */

import { describe, expect, it } from 'vitest';
import {
  parseContextPackFrontmatter,
  setContextPackPriority,
  stripFrontmatter,
} from './contextPackMeta';

// ─── parseContextPackFrontmatter ─────────────────────────────────────────────

describe('parseContextPackFrontmatter', () => {
  describe('no frontmatter', () => {
    it('returns {} for plain content', () => {
      expect(parseContextPackFrontmatter('# Hello\nSome content.')).toEqual({});
    });

    it('returns {} for an empty string', () => {
      expect(parseContextPackFrontmatter('')).toEqual({});
    });

    it('returns {} when --- only appears mid-content', () => {
      expect(parseContextPackFrontmatter('# Title\n---\nnot a frontmatter block')).toEqual({});
    });
  });

  describe('valid priority values', () => {
    it('parses priority: essential', () => {
      const raw = '---\npriority: essential\n---\n# Content';
      expect(parseContextPackFrontmatter(raw)).toMatchObject({ priority: 'essential' });
    });

    it('parses priority: standard', () => {
      const raw = '---\npriority: standard\n---\n';
      expect(parseContextPackFrontmatter(raw)).toMatchObject({ priority: 'standard' });
    });

    it('parses priority: reference', () => {
      const raw = '---\npriority: reference\n---\n';
      expect(parseContextPackFrontmatter(raw)).toMatchObject({ priority: 'reference' });
    });
  });

  describe('description field', () => {
    it('parses description when present', () => {
      const raw = '---\npriority: standard\ndescription: My pack\n---\n';
      expect(parseContextPackFrontmatter(raw)).toMatchObject({
        priority: 'standard',
        description: 'My pack',
      });
    });

    it('trims whitespace from description', () => {
      const raw = '---\npriority: essential\ndescription:   trimmed   \n---\n';
      expect(parseContextPackFrontmatter(raw).description).toBe('trimmed');
    });

    it('returns undefined description when key is absent', () => {
      const raw = '---\npriority: standard\n---\n';
      expect(parseContextPackFrontmatter(raw).description).toBeUndefined();
    });

    it('returns undefined description when value is an empty string', () => {
      const raw = '---\npriority: standard\ndescription: ""\n---\n';
      expect(parseContextPackFrontmatter(raw).description).toBeUndefined();
    });
  });

  describe('invalid or missing priority', () => {
    it('defaults to standard for an unknown priority value', () => {
      const raw = '---\npriority: ultra\n---\n';
      expect(parseContextPackFrontmatter(raw)).toMatchObject({ priority: 'standard' });
    });

    it('defaults to standard when the priority key is absent', () => {
      const raw = '---\ndescription: no priority here\n---\n';
      expect(parseContextPackFrontmatter(raw)).toMatchObject({ priority: 'standard' });
    });

    it('defaults to standard when priority is a number', () => {
      const raw = '---\npriority: 42\n---\n';
      expect(parseContextPackFrontmatter(raw)).toMatchObject({ priority: 'standard' });
    });
  });

  describe('malformed YAML', () => {
    it('returns {} for a flow sequence that is not closed', () => {
      const raw = '---\npriority: [unclosed bracket\n---\n';
      expect(parseContextPackFrontmatter(raw)).toEqual({});
    });
  });

  describe('CRLF line endings', () => {
    it('parses frontmatter with Windows line-endings', () => {
      const raw = '---\r\npriority: reference\r\n---\r\n# Content';
      expect(parseContextPackFrontmatter(raw)).toMatchObject({ priority: 'reference' });
    });
  });
});

// ─── stripFrontmatter ────────────────────────────────────────────────────────

describe('stripFrontmatter', () => {
  it('removes a standard frontmatter block', () => {
    const raw = '---\npriority: standard\n---\n# Heading\nBody.';
    expect(stripFrontmatter(raw)).toBe('# Heading\nBody.');
  });

  it('returns the string unchanged when there is no frontmatter', () => {
    const raw = '# Just a heading\nSome content.';
    expect(stripFrontmatter(raw)).toBe(raw);
  });

  it('handles CRLF frontmatter separator', () => {
    const raw = '---\r\npriority: essential\r\n---\r\nBody';
    expect(stripFrontmatter(raw)).toBe('Body');
  });

  it('returns empty string when content is only a frontmatter block', () => {
    const raw = '---\npriority: standard\n---\n';
    expect(stripFrontmatter(raw)).toBe('');
  });

  it('preserves content after the frontmatter block', () => {
    const raw = '---\npriority: essential\ndescription: A pack\n---\n## Section\ntext here.';
    expect(stripFrontmatter(raw)).toBe('## Section\ntext here.');
  });
});

// ─── setContextPackPriority ──────────────────────────────────────────────────

describe('setContextPackPriority', () => {
  describe('no existing frontmatter', () => {
    it('prepends a new frontmatter block with the given priority', () => {
      const raw = '# Content';
      expect(setContextPackPriority(raw, 'essential')).toBe(
        '---\npriority: essential\n---\n# Content',
      );
    });

    it('handles empty content', () => {
      expect(setContextPackPriority('', 'reference')).toBe('---\npriority: reference\n---\n');
    });
  });

  describe('existing frontmatter — priority key present', () => {
    it('replaces the priority value in-place', () => {
      const raw = '---\npriority: standard\n---\n# Body';
      expect(setContextPackPriority(raw, 'essential')).toBe(
        '---\npriority: essential\n---\n# Body',
      );
    });

    it('replaces regardless of original priority value', () => {
      const raw = '---\npriority: reference\ndescription: Something\n---\n';
      const result = setContextPackPriority(raw, 'standard');
      expect(result).toContain('priority: standard');
      expect(result).not.toContain('priority: reference');
      expect(result).toContain('description: Something');
    });

    it('does not duplicate the priority key', () => {
      const raw = '---\npriority: standard\n---\n';
      const result = setContextPackPriority(raw, 'essential');
      const matches = result.match(/priority:/g) ?? [];
      expect(matches.length).toBe(1);
    });
  });

  describe('existing frontmatter — priority key absent', () => {
    it('inserts priority as the first key after the opening ---', () => {
      const raw = '---\ndescription: No priority yet\n---\n# Body';
      expect(setContextPackPriority(raw, 'essential')).toBe(
        '---\npriority: essential\ndescription: No priority yet\n---\n# Body',
      );
    });

    it('preserves all other frontmatter keys', () => {
      const raw = '---\ndescription: Keep this\nauthor: dev\n---\n';
      const result = setContextPackPriority(raw, 'reference');
      expect(result).toContain('description: Keep this');
      expect(result).toContain('author: dev');
      expect(result).toContain('priority: reference');
    });
  });
});
